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

// Vendor data pool for mapping
const vendorDataPool = [
  {
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

async function updateAllRequirementsWithVendor() {
  try {
    console.log('Fetching all requirements...');
    
    // Sign in
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: '12shivamtiwari219@gmail.com',
      password: 'admin123',
    });
    
    if (signInError) {
      console.error('Sign in error:', signInError);
      process.exit(1);
    }
    
    const userId = user?.id;
    console.log(`Using user ID: ${userId}`);
    
    // Fetch all requirements for this user
    const { data: requirements, error: fetchError } = await supabase
      .from('requirements')
      .select('id, title')
      .eq('user_id', userId);
    
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      process.exit(1);
    }
    
    console.log(`Found ${requirements.length} requirements to update`);
    
    // Update requirements with vendor details
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 10;
    
    for (let i = 0; i < requirements.length; i += batchSize) {
      const batch = requirements.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map((req, idx) => {
          const vendorData = vendorDataPool[(i + idx) % vendorDataPool.length];
          
          return supabase
            .from('requirements')
            .update({
              vendor_company: vendorData.vendor_company,
              vendor_website: vendorData.vendor_website,
              vendor_person_name: vendorData.vendor_person_name,
              vendor_phone: vendorData.vendor_phone,
              vendor_email: vendorData.vendor_email,
              imp_name: vendorData.imp_name,
              client_website: vendorData.client_website,
              imp_website: vendorData.imp_website,
            })
            .eq('id', req.id)
            .select();
        })
      );
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.error) {
            console.error('Error updating requirement:', result.value.error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          console.error('Batch error:', result.reason);
          errorCount++;
        }
      });
      
      console.log(`Updated ${Math.min(i + batchSize, requirements.length)} of ${requirements.length}`);
    }
    
    console.log(`\nCompleted! Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Failed to update requirements:', error);
    process.exit(1);
  }
}

// Run the function
updateAllRequirementsWithVendor().then(() => {
  console.log('All done!');
  process.exit(0);
});
