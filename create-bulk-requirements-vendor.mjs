import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const requirements = [
  // Requirements with Vendor Details
  {
    title: 'Enterprise Staffing Solutions - Senior React Developer',
    company: 'Fortune 500 Tech Corp',
    status: 'NEW',
    description: 'Senior React developer with 5+ years experience for large-scale SaaS platform',
    primary_tech_stack: 'React, TypeScript, Redux, Node.js',
    location: 'San Francisco, CA',
    rate: '$160-190/hr',
    remote: 'Hybrid',
    duration: '8 months',
    applied_for: '2025-01-05',
    vendor_company: 'TechStaff Solutions',
    vendor_website: 'www.techstaffsolutions.com',
    vendor_person_name: 'Sarah Johnson',
    vendor_phone: '+1-415-555-0123',
    vendor_email: 'sarah.johnson@techstaffsolutions.com',
    imp_name: 'Global Tech Recruitment',
    client_website: 'www.fortunetech.com',
    imp_website: 'www.globaltechrecruit.com',
  },
  {
    title: 'Backend Infrastructure Specialist - Kubernetes',
    company: 'Cloud Infrastructure Leaders',
    status: 'IN_PROGRESS',
    description: 'Kubernetes expert for cloud-native microservices architecture',
    primary_tech_stack: 'Kubernetes, Docker, Go, AWS',
    location: 'New York, NY',
    rate: '$170-200/hr',
    remote: 'Remote',
    duration: '6 months',
    applied_for: '2025-01-04',
    vendor_company: 'CloudTech Staffing',
    vendor_website: 'www.cloudtechstaffing.com',
    vendor_person_name: 'Michael Chen',
    vendor_phone: '+1-212-555-0456',
    vendor_email: 'michael.chen@cloudtechstaffing.com',
    imp_name: 'DevOps Recruitment Partners',
    client_website: 'www.cloudinfra.io',
    imp_website: 'www.devopsrecruit.com',
  },
  {
    title: 'Full Stack Developer - FinTech Solutions',
    company: 'Leading FinTech Startup',
    status: 'INTERVIEW',
    description: 'Full-stack developer for payment processing platform',
    primary_tech_stack: 'Python, FastAPI, React, PostgreSQL',
    location: 'Austin, TX',
    rate: '$140-170/hr',
    remote: 'Full Remote',
    duration: '5 months',
    applied_for: '2025-01-03',
    vendor_company: 'FinTech Talent Agency',
    vendor_website: 'www.fintechtalent.com',
    vendor_person_name: 'Jessica Martinez',
    vendor_phone: '+1-512-555-0789',
    vendor_email: 'jessica.martinez@fintechtalent.com',
    imp_name: 'Financial Services Staffing',
    client_website: 'www.fintechstartup.io',
    imp_website: 'www.finservstaffing.com',
  },
  {
    title: 'Data Science Engineer - ML Pipeline',
    company: 'AI & Machine Learning Corp',
    status: 'NEW',
    description: 'Data science engineer for machine learning pipeline development',
    primary_tech_stack: 'Python, TensorFlow, Spark, AWS',
    location: 'Boston, MA',
    rate: '$150-180/hr',
    remote: 'On-site',
    duration: '7 months',
    applied_for: '2025-01-02',
    vendor_company: 'AI Talent Solutions',
    vendor_website: 'www.aitalentsolutions.com',
    vendor_person_name: 'Dr. Rajesh Patel',
    vendor_phone: '+1-617-555-0321',
    vendor_email: 'rajesh.patel@aitalentsolutions.com',
    imp_name: 'Machine Learning Recruitment',
    client_website: 'www.aimlcorp.com',
    imp_website: 'www.mlrecruit.com',
  },
  {
    title: 'Mobile Development Lead - iOS',
    company: 'Premium Mobile Apps',
    status: 'OFFER',
    description: 'iOS development lead for consumer mobile applications',
    primary_tech_stack: 'Swift, SwiftUI, ARKit, Firebase',
    location: 'Seattle, WA',
    rate: '$155-185/hr',
    remote: 'Hybrid',
    duration: '8 months',
    applied_for: '2025-01-01',
    vendor_company: 'Mobile Talent Inc',
    vendor_website: 'www.mobiletalent.com',
    vendor_person_name: 'Emily Rodriguez',
    vendor_phone: '+1-206-555-0654',
    vendor_email: 'emily.rodriguez@mobiletalent.com',
    imp_name: 'App Development Staffing',
    client_website: 'www.premiummobileapps.com',
    imp_website: 'www.appdevstaff.com',
  },
  {
    title: 'DevOps Engineer - Cloud Migration',
    company: 'Enterprise Cloud Services',
    status: 'NEW',
    description: 'DevOps specialist for enterprise cloud migration projects',
    primary_tech_stack: 'Terraform, Kubernetes, Jenkins, AWS/Azure',
    location: 'Los Angeles, CA',
    rate: '$145-175/hr',
    remote: 'Remote',
    duration: '6 months',
    applied_for: '2024-12-31',
    vendor_company: 'CloudOps Staffing Solutions',
    vendor_website: 'www.cloudopsstaff.com',
    vendor_person_name: 'David Kim',
    vendor_phone: '+1-310-555-0987',
    vendor_email: 'david.kim@cloudopsstaff.com',
    imp_name: 'Enterprise Cloud Recruitment',
    client_website: 'www.enterprisecloud.io',
    imp_website: 'www.cloudrecruit.com',
  },
  {
    title: 'Frontend Architect - Design Systems',
    company: 'Design System Specialists',
    status: 'IN_PROGRESS',
    description: 'Frontend architect for enterprise design system',
    primary_tech_stack: 'React, TypeScript, Storybook, GraphQL',
    location: 'Chicago, IL',
    rate: '$175-210/hr',
    remote: 'Hybrid',
    duration: '9 months',
    applied_for: '2024-12-30',
    vendor_company: 'Frontend Experts Staffing',
    vendor_website: 'www.frontendexperts.com',
    vendor_person_name: 'Lisa Thompson',
    vendor_phone: '+1-773-555-0111',
    vendor_email: 'lisa.thompson@frontendexperts.com',
    imp_name: 'UI/Frontend Recruitment',
    client_website: 'www.designsystemcorp.com',
    imp_website: 'www.uirecruit.com',
  },
  {
    title: 'QA Automation Lead - Test Framework',
    company: 'Quality Assurance Leaders',
    status: 'NEW',
    description: 'QA automation lead for building test frameworks and infrastructure',
    primary_tech_stack: 'Cypress, Playwright, JavaScript, CI/CD',
    location: 'Denver, CO',
    rate: '$130-160/hr',
    remote: 'Full Remote',
    duration: '5 months',
    applied_for: '2024-12-29',
    vendor_company: 'QA Excellence Staffing',
    vendor_website: 'www.qaexcellence.com',
    vendor_person_name: 'Robert Anderson',
    vendor_phone: '+1-303-555-0222',
    vendor_email: 'robert.anderson@qaexcellence.com',
    imp_name: 'Quality Assurance Recruitment',
    client_website: 'www.qaleaders.io',
    imp_website: 'www.qarecruit.com',
  },
  {
    title: 'Security Engineer - Application Security',
    company: 'Cybersecurity Solutions',
    status: 'INTERVIEW',
    description: 'Application security engineer for secure code development',
    primary_tech_stack: 'OWASP, Burp Suite, Python, Java',
    location: 'Portland, OR',
    rate: '$155-185/hr',
    remote: 'Hybrid',
    duration: '6 months',
    applied_for: '2024-12-28',
    vendor_company: 'CyberTalent Solutions',
    vendor_website: 'www.cybertalent.com',
    vendor_person_name: 'Alex Goldman',
    vendor_phone: '+1-503-555-0333',
    vendor_email: 'alex.goldman@cybertalent.com',
    imp_name: 'Security Staffing Partners',
    client_website: 'www.cybersecuritysol.com',
    imp_website: 'www.securityrecruit.com',
  },
  {
    title: 'Database Administrator - PostgreSQL',
    company: 'Data Infrastructure Experts',
    status: 'NEW',
    description: 'Senior DBA for PostgreSQL database management and optimization',
    primary_tech_stack: 'PostgreSQL, SQL, Replication, Backup',
    location: 'Philadelphia, PA',
    rate: '$140-170/hr',
    remote: 'Remote',
    duration: '4 months',
    applied_for: '2024-12-27',
    vendor_company: 'Data Talent Agency',
    vendor_website: 'www.datatalent.com',
    vendor_person_name: 'Patricia Lee',
    vendor_phone: '+1-215-555-0444',
    vendor_email: 'patricia.lee@datatalent.com',
    imp_name: 'Database Recruitment Services',
    client_website: 'www.datainfra.io',
    imp_website: 'www.dbarecruit.com',
  },
  {
    title: 'Solutions Architect - Enterprise Systems',
    company: 'Enterprise Solutions Inc',
    status: 'IN_PROGRESS',
    description: 'Enterprise architect for large-scale system design',
    primary_tech_stack: 'AWS, Azure, Microservices, Design Patterns',
    location: 'Miami, FL',
    rate: '$160-190/hr',
    remote: 'Hybrid',
    duration: '7 months',
    applied_for: '2024-12-26',
    vendor_company: 'Architecture Staffing Pro',
    vendor_website: 'www.archstaff.com',
    vendor_person_name: 'Christopher Wells',
    vendor_phone: '+1-305-555-0555',
    vendor_email: 'christopher.wells@archstaff.com',
    imp_name: 'Enterprise Architecture Recruitment',
    client_website: 'www.enterprisesol.com',
    imp_website: 'www.archrecruit.com',
  },
  {
    title: 'Product Manager - SaaS Platform',
    company: 'SaaS Innovation Corp',
    status: 'OFFER',
    description: 'Product manager for B2B SaaS platform development',
    primary_tech_stack: 'Product Strategy, Analytics, Agile, SQL',
    location: 'Atlanta, GA',
    rate: '$130-160/hr',
    remote: 'Remote',
    duration: '6 months',
    applied_for: '2024-12-25',
    vendor_company: 'Product Talent Group',
    vendor_website: 'www.producttalent.com',
    vendor_person_name: 'Victoria Brown',
    vendor_phone: '+1-404-555-0666',
    vendor_email: 'victoria.brown@producttalent.com',
    imp_name: 'Product Management Recruitment',
    client_website: 'www.saasinnovation.io',
    imp_website: 'www.pmrecruit.com',
  },
  {
    title: 'GraphQL API Developer - Real-time Apps',
    company: 'Real-time Systems Co',
    status: 'NEW',
    description: 'GraphQL specialist for real-time application development',
    primary_tech_stack: 'GraphQL, Apollo, WebSockets, Node.js',
    location: 'Phoenix, AZ',
    rate: '$135-165/hr',
    remote: 'Hybrid',
    duration: '5 months',
    applied_for: '2024-12-24',
    vendor_company: 'API Talent Solutions',
    vendor_website: 'www.apitalent.com',
    vendor_person_name: 'Nathan Scott',
    vendor_phone: '+1-602-555-0777',
    vendor_email: 'nathan.scott@apitalent.com',
    imp_name: 'API Development Recruitment',
    client_website: 'www.realtimesystems.io',
    imp_website: 'www.apirecruit.com',
  },
  {
    title: 'Technical Writer - Developer Documentation',
    company: 'Developer Experience Leaders',
    status: 'NEW',
    description: 'Technical writer for API and SDK documentation',
    primary_tech_stack: 'Markdown, API Documentation, Sphinx, Git',
    location: 'San Diego, CA',
    rate: '$95-125/hr',
    remote: 'Full Remote',
    duration: '4 months',
    applied_for: '2024-12-23',
    vendor_company: 'Tech Writing Staffing',
    vendor_website: 'www.techwritestaff.com',
    vendor_person_name: 'Jennifer Hall',
    vendor_phone: '+1-619-555-0888',
    vendor_email: 'jennifer.hall@techwritestaff.com',
    imp_name: 'Documentation Recruitment',
    client_website: 'www.devexperience.io',
    imp_website: 'www.docrecruit.com',
  },
  {
    title: 'Systems Administrator - Infrastructure',
    company: 'IT Infrastructure Solutions',
    status: 'IN_PROGRESS',
    description: 'Systems admin for Linux/Windows server management',
    primary_tech_stack: 'Linux, Windows Server, Networking, Security',
    location: 'Washington, DC',
    rate: '$105-135/hr',
    remote: 'Hybrid',
    duration: '4 months',
    applied_for: '2024-12-22',
    vendor_company: 'SysAdmin Talent Agency',
    vendor_website: 'www.sysadmintalent.com',
    vendor_person_name: 'Kevin Walsh',
    vendor_phone: '+1-202-555-0999',
    vendor_email: 'kevin.walsh@sysadmintalent.com',
    imp_name: 'Infrastructure Recruitment Services',
    client_website: 'www.itinfra.com',
    imp_website: 'www.infrarecruit.com',
  },
  {
    title: 'Machine Learning Operations Engineer',
    company: 'MLOps Platform',
    status: 'INTERVIEW',
    description: 'MLOps engineer for ML model deployment and monitoring',
    primary_tech_stack: 'MLflow, Kubeflow, Docker, Python',
    location: 'Raleigh, NC',
    rate: '$140-170/hr',
    remote: 'Remote',
    duration: '5 months',
    applied_for: '2024-12-21',
    vendor_company: 'ML Talent Solutions',
    vendor_website: 'www.mltalent.com',
    vendor_person_name: 'Sophia Zhang',
    vendor_phone: '+1-919-555-1010',
    vendor_email: 'sophia.zhang@mltalent.com',
    imp_name: 'Machine Learning Recruitment',
    client_website: 'www.mlopsplatform.io',
    imp_website: 'www.mlopsrecruit.com',
  },
  {
    title: 'Compliance Officer - Data Privacy',
    company: 'Compliance & Governance',
    status: 'NEW',
    description: 'Data privacy and compliance officer for GDPR/CCPA',
    primary_tech_stack: 'GDPR, CCPA, Data Privacy, Compliance',
    location: 'Orlando, FL',
    rate: '$110-140/hr',
    remote: 'Hybrid',
    duration: '4 months',
    applied_for: '2024-12-20',
    vendor_company: 'Compliance Staffing Solutions',
    vendor_website: 'www.compliancestaff.com',
    vendor_person_name: 'Margaret Stone',
    vendor_phone: '+1-407-555-1111',
    vendor_email: 'margaret.stone@compliancestaff.com',
    imp_name: 'Legal & Compliance Recruitment',
    client_website: 'www.compliancegov.io',
    imp_website: 'www.compliancerecruit.com',
  },
  {
    title: 'Blockchain Developer - Smart Contracts',
    company: 'Web3 Innovation Labs',
    status: 'NEW',
    description: 'Blockchain developer for smart contract development',
    primary_tech_stack: 'Solidity, Ethereum, Web3.js, Hardhat',
    location: 'Minneapolis, MN',
    rate: '$160-190/hr',
    remote: 'Remote',
    duration: '6 months',
    applied_for: '2024-12-19',
    vendor_company: 'Blockchain Talent Network',
    vendor_website: 'www.blockchaintalent.com',
    vendor_person_name: 'Lucas Thompson',
    vendor_phone: '+1-612-555-1212',
    vendor_email: 'lucas.thompson@blockchaintalent.com',
    imp_name: 'Web3 Recruitment Services',
    client_website: 'www.web3labs.io',
    imp_website: 'www.web3recruit.com',
  },
  {
    title: 'Site Reliability Engineer - Infrastructure',
    company: 'Reliability Engineering Corp',
    status: 'OFFER',
    description: 'SRE for infrastructure reliability and incident response',
    primary_tech_stack: 'Kubernetes, Prometheus, Linux, Python',
    location: 'Nashville, TN',
    rate: '$150-180/hr',
    remote: 'Full Remote',
    duration: '5 months',
    applied_for: '2024-12-18',
    vendor_company: 'SRE Talent Solutions',
    vendor_website: 'www.sretalent.com',
    vendor_person_name: 'Marcus Green',
    vendor_phone: '+1-615-555-1313',
    vendor_email: 'marcus.green@sretalent.com',
    imp_name: 'Site Reliability Recruitment',
    client_website: 'www.releng.io',
    imp_website: 'www.srerecruit.com',
  },
];

async function bulkCreateRequirements() {
  try {
    console.log(`Creating ${requirements.length} requirements with vendor details...`);
    
    // Sign in with credentials
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: '12shivamtiwari219@gmail.com',
      password: 'admin123',
    });
    
    if (signInError) {
      console.error('Sign in error:', signInError);
      process.exit(1);
    }
    
    const userId = user?.id;
    
    if (!userId) {
      console.error('Failed to authenticate user.');
      process.exit(1);
    }
    
    console.log(`Using user ID: ${userId}`);
    
    // Create requirements in batches
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < requirements.length; i += batchSize) {
      const batch = requirements.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(req => 
          supabase
            .from('requirements')
            .insert({
              ...req,
              user_id: userId,
            })
            .select()
        )
      );
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.error) {
            console.error('Error creating requirement:', result.value.error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          console.error('Batch error:', result.reason);
          errorCount++;
        }
      });
      
      console.log(`Processed ${Math.min(i + batchSize, requirements.length)} of ${requirements.length}`);
    }
    
    console.log(`\nCompleted! Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Failed to create bulk requirements:', error);
    process.exit(1);
  }
}

// Run the function
bulkCreateRequirements().then(() => {
  console.log('All done!');
  process.exit(0);
});
