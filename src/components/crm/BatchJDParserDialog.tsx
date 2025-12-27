import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider
} from "@mui/material"
import { parseJD } from "../../lib/jdParser"
import type { JdExtractionResult } from "../../lib/jdParser"

type BatchJD = {
  id: string
  title: string
  text: string
  parsed?: JdExtractionResult
  status: "idle" | "parsed" | "error"
}

export function BatchJDParserDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const [jobs, setJobs] = useState<BatchJD[]>([
    {
      id: crypto.randomUUID(),
      title: "Job Desc 1",
      text: "",
      status: "idle"
    }
  ])
  const [activeId, setActiveId] = useState(jobs[0].id)
  const activeJob = jobs.find(j => j.id === activeId)!

  /* ================================
     HELPERS
  ================================= */

  function updateJob(id: string, updates: Partial<BatchJD>) {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, ...updates } : j))
    )
  }

  function addJob() {
    setJobs(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `Job Desc ${prev.length + 1}`,
        text: "",
        status: "idle"
      }
    ])
  }

  /* ================================
     PARSE ACTIONS
  ================================= */

  async function parseCurrent() {
    if (!activeJob.text.trim()) return

    try {
      const parsed = await parseJD(activeJob.text)
      updateJob(activeJob.id, { parsed, status: "parsed" })
    } catch {
      updateJob(activeJob.id, { status: "error" })
    }
  }

  async function parseAll() {
    for (const job of jobs) {
      if (!job.text.trim()) continue

      try {
        const parsed = await parseJD(job.text)
        updateJob(job.id, { parsed, status: "parsed" })
      } catch {
        updateJob(job.id, { status: "error" })
      }
    }
  }

  /* ================================
     RENDER
  ================================= */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>Batch Job Description Parser</DialogTitle>

      <DialogContent>
        <Box display="flex" height="70vh">
          {/* LEFT SIDEBAR */}
          <Box width={240} borderRight="1px solid #ddd">
            <List>
              {jobs.map(job => (
                <ListItemButton
                  key={job.id}
                  selected={job.id === activeId}
                  onClick={() => setActiveId(job.id)}
                >
                  <ListItemText
                    primary={job.title}
                    secondary={
                      job.status === "parsed"
                        ? "Parsed"
                        : job.status === "error"
                        ? "Error"
                        : "Not parsed"
                    }
                  />
                </ListItemButton>
              ))}
            </List>

            <Divider />

            <Button fullWidth onClick={addJob}>
              + Add JD
            </Button>
          </Box>

          {/* RIGHT PANEL */}
          <Box flex={1} padding={2}>
            <Stack spacing={2} height="100%">
              <Typography fontWeight={700}>
                {activeJob.title}
              </Typography>

              <TextField
                multiline
                minRows={10}
                fullWidth
                placeholder="Paste job description here..."
                value={activeJob.text}
                onChange={e =>
                  updateJob(activeJob.id, {
                    text: e.target.value,
                    status: "idle"
                  })
                }
              />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={parseCurrent}
                  disabled={!activeJob.text.trim()}
                >
                  Parse Current
                </Button>

                <Button variant="outlined" onClick={parseAll}>
                  Parse All
                </Button>
              </Stack>

              {activeJob.parsed && (
                <Box
                  component="pre"
                  sx={{
                    background: "#f6f6f6",
                    padding: 2,
                    overflow: "auto",
                    fontSize: 13,
                    flex: 1
                  }}
                >
                  {JSON.stringify(activeJob.parsed, null, 2)}
                </Box>
              )}
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
