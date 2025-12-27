/* =========================================================
   TYPES
========================================================= */

export type WorkLocationType = "Onsite" | "Hybrid" | "Remote" | null
export type JDFormat = "email" | "ats" | "vendor" | "unknown"

export interface JdExtractionResult {
  jobTitle: string | null
  hiringCompany: string | null
  endClient: string | null
  keySkills: string[]
  rate: string | null
  workLocationType: WorkLocationType
  location: string | null
  duration: string | null
  vendor: string | null
  vendorContact: string | null
  vendorPhone: string | null
  vendorEmail: string | null
}

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
}

/* =========================================================
   FORMAT DETECTION
========================================================= */

function detectJDFormat(lines: string[]): JDFormat {
  if (lines.some(l => /role\s*name\s*:/i.test(l))) return "vendor"
  if (lines.some(l => /job\s*title\s*:/i.test(l))) return "ats"
  if (lines.some(l => /^--$/.test(l) || /thanks|regards/i.test(l)))
    return "email"
  return "unknown"
}

/* =========================================================
   SAFE SKILL DICTIONARY (CLOSED WORLD)
========================================================= */

const SKILL_MAP: Record<string, string[]> = {
  // ───────────── Languages ─────────────
  "JavaScript": ["javascript"],
  "TypeScript": ["typescript"],
  "Python": ["python"],
  "Java": ["java"],
  "C#": ["c#"],
  "Go": ["golang", "go language"],
  "Scala": ["scala"],

  // ───────────── Backend / Runtime ─────────────
  "Node.js": ["node.js", "nodejs"],
  ".NET": [".net", "dotnet"],
  "Spring Boot": ["spring boot"],
  "Express.js": ["express.js", "expressjs"],

  // ───────────── Frontend ─────────────
  "React": ["react"],
  "Angular": ["angular"],
  "Vue.js": ["vue.js", "vuejs"],

  // ───────────── Big Data / Processing ─────────────
  "PySpark": ["pyspark"],
  "Apache Spark": ["apache spark"],
  "Kafka": ["kafka"],
  "Hadoop": ["hadoop"],

  // ───────────── Databases ─────────────
  "SQL": [" sql ", "sql,"],
  "NoSQL": ["nosql"],
  "PostgreSQL": ["postgresql", "postgres"],
  "MySQL": ["mysql"],
  "SQL Server": ["sql server"],
  "Oracle": ["oracle"],
  "MongoDB": ["mongodb"],
  "Snowflake": ["snowflake"],
  "DB2": ["db2"],

  // ───────────── Cloud ─────────────
  "AWS": ["aws", "amazon web services"],
  "Azure": ["azure", "microsoft azure"],
  "GCP": ["gcp", "google cloud"],

  // ───────────── DevOps / Infra ─────────────
  "Docker": ["docker"],
  "Kubernetes": ["kubernetes", "k8s"],
  "Terraform": ["terraform"],
  "Jenkins": ["jenkins"],
  "CI/CD": ["ci/cd", "cicd"],

  // ───────────── Data / Analytics ─────────────
  "Airflow": ["airflow"],
  "Databricks": ["databricks"],
  "Tableau": ["tableau"],
  "Power BI": ["power bi"],

  // ───────────── Testing ─────────────
  "JUnit": ["junit"],
  "PyTest": ["pytest"],
  "Jest": ["jest"]
}

/* =========================================================
   JOB TITLE
========================================================= */

function extractJobTitle(lines: string[], format: JDFormat): string | null {
  for (const line of lines.slice(0, 12)) {
    if (/:\s*$/.test(line)) continue

    if (format === "vendor") {
      const m = line.match(/role\s*name\s*:\s*(.+)/i)
      if (m) return m[1].replace(/-\s*\d+$/, "").trim()
    }

    const ats = line.match(/job\s*title\s*:\s*(.+)/i)
    if (ats) return ats[1].trim()
  }

  for (const line of lines.slice(0, 6)) {
    if (
      line.split(" ").length <= 8 &&
      /\b(engineer|developer|architect|analyst|manager|lead|consultant)\b/i.test(
        line
      ) &&
      !/(inc|llc|corp|ltd)/i.test(line)
    ) {
      return line
    }
  }

  return null
}

/* =========================================================
   LOCATION + WORK TYPE
========================================================= */

function extractLocationAndWorkType(lines: string[]): {
  location: string | null
  workLocationType: WorkLocationType
} {
  for (const line of lines.slice(0, 15)) {
    const m = line.match(
      /location\s*:\s*([^()]+)\s*\((onsite|remote|hybrid)\)/i
    )
    if (m)
      return {
        location: m[1].trim(),
        workLocationType: capitalize(m[2]) as WorkLocationType
      }

    const m2 = line.match(/location\s*:\s*([A-Za-z\s]+,\s*[A-Z]{2})/i)
    if (m2) return { location: m2[1].trim(), workLocationType: null }
  }

  for (const line of lines) {
    const m = line.match(/(Hybrid|Remote|Onsite)\s*\(([^)]+)\)/i)
    if (m)
      return {
        workLocationType: capitalize(m[1]) as WorkLocationType,
        location: m[2].trim()
      }
  }

  return { location: null, workLocationType: null }
}

/* =========================================================
   DURATION
========================================================= */

function extractDuration(text: string): string | null {
  const m = text.match(/\b\d+\+?\s*(months?|years?|weeks?)\b/i)
  return m ? m[0] : null
}

/* =========================================================
   SKILLS (BULLETS + SENTENCES + COMPETENCIES)
========================================================= */

function extractSkills(lines: string[]): string[] {
  const found = new Set<string>()
  let inSkillZone = false

  for (const line of lines) {
    if (/:\s*$/.test(line)) continue

    if (
      /skills|experience|requirements|responsibilities|competencies|role description/i.test(
        line
      )
    ) {
      inSkillZone = true
      continue
    }

    if (inSkillZone) {
      const lower = line.toLowerCase()
      for (const [skill, variants] of Object.entries(SKILL_MAP)) {
        if (variants.some(v => lower.includes(v))) found.add(skill)
      }
    }

    if (isSignatureLine(line)) break
  }

  return Array.from(found)
}

/* =========================================================
   SIGNATURE / VENDOR INFO
========================================================= */

function isSignatureLine(line: string): boolean {
  return /^--$/.test(line) || /thanks|regards|look forward/i.test(line)
}

function extractVendorInfo(lines: string[]) {
  const idx = lines.findIndex(isSignatureLine)
  if (idx === -1) return {}

  const footer = lines.slice(idx + 1)

  // EMAIL (robust)
  const email =
    footer.join(" ").match(
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
    )?.[0] ?? null

  // PHONE (handles (415), Direct, Office, *104, x104)
  const phone =
    footer.join(" ").match(
      /(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(\s*(x|\*)\s*\d+)?/
    )?.[0] ?? null

  // CONTACT NAME (first human-looking line, strip titles)
  const vendorContactRaw =
    footer.find(l =>
      /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/.test(l)
    ) ?? null

  const vendorContact = vendorContactRaw
    ? vendorContactRaw.split("|")[0].trim()
    : null

  // VENDOR COMPANY
  const vendor =
    footer.find(l =>
      /(inc|llc|corp|ltd|technologies|consulting)/i.test(l)
    ) ?? null

  return {
    vendor,
    vendorContact,
    vendorPhone: phone,
    vendorEmail: email
  }
}

/* =========================================================
   DETERMINISTIC PARSER (FORMAT AWARE)
========================================================= */

function parseDeterministic(text: string): JdExtractionResult {
  const lines = normalizeLines(text)
  const format = detectJDFormat(lines)

  const { location, workLocationType } =
    extractLocationAndWorkType(lines)

  const vendorInfo = extractVendorInfo(lines)

  return {
    jobTitle: extractJobTitle(lines, format),
    hiringCompany: null,
    endClient: null,
    keySkills: extractSkills(lines),
    rate: null,
    workLocationType,
    location,
    duration: extractDuration(text),
    vendor: vendorInfo.vendor ?? null,
    vendorContact: vendorInfo.vendorContact ?? null,
    vendorPhone: vendorInfo.vendorPhone ?? null,
    vendorEmail: vendorInfo.vendorEmail ?? null
  }
}

/* =========================================================
   GROQ FALLBACK (LAST RESORT)
========================================================= */

async function callGroq(prompt: string) {
  try {
    const res = await fetch(
      "https://mnjioouttnhbehvbuerq.supabase.co/functions/v1/groq-parser",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ prompt })
      }
    )

    const json = await res.json()
    const content =
      json?.content ??
      json?.choices?.[0]?.message?.content

    return typeof content === "string" ? JSON.parse(content) : {}
  } catch {
    return {}
  }
}

/* =========================================================
   PUBLIC ENTRY POINT
========================================================= */

export async function parseJD(
  text: string
): Promise<JdExtractionResult> {
  const det = parseDeterministic(text)

  const missing: string[] = []
  if (!det.jobTitle) missing.push("jobTitle")
  if (!det.location) missing.push("location")

  if (missing.length === 0) return det

  const llm = await callGroq(`
Extract ONLY: ${missing.join(", ")}
Rules:
- JSON only
- Do not guess
- Use null if missing

Input:
${text}
`)

  return {
    ...det,
    jobTitle: det.jobTitle ?? llm.jobTitle ?? null,
    location: det.location ?? llm.location ?? null
  }
}

/* =========================================================
   HELPERS
========================================================= */

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
