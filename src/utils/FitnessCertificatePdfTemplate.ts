/**
 * Fitness Certificate PDF Template
 * Replicated from React Native implementation — 100% parity
 * Redesigned with professional clinic letterhead, borders, and watermark
 */

import type { FitnessCertificateFormData } from "../models/FitnessCertificateTypes";

// ===========================================
// PDF STYLES (A4-optimized, print-safe)
// ===========================================

export const certificatePdfStyles = `
  @page {
    size: A4;
    margin: 15mm;
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    color: #2D3748;
    line-height: 1.6;
    background: white;
    font-size: 11pt;
  }
  
  .certificate-container {
    max-width: 100%;
    margin: 0 auto;
    border: 2px solid #0070D6;
    border-radius: 8px;
    padding: 30px;
    position: relative;
    background: white;
  }

  .certificate-container::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
    border: 1px solid #E8F4FD;
    border-radius: 4px;
    pointer-events: none;
  }

  .certificate-container::after {
    content: 'MEDICAL CERTIFICATE';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 48pt;
    font-weight: 900;
    color: rgba(0, 112, 214, 0.04);
    white-space: nowrap;
    pointer-events: none;
    letter-spacing: 8px;
    z-index: 0;
  }
  
  /* Header Section */
  .certificate-header {
    text-align: center;
    background: linear-gradient(135deg, #0070D6 0%, #15A1B1 100%);
    margin: -30px -30px 24px -30px;
    padding: 28px 30px 22px 30px;
    border-radius: 6px 6px 0 0;
    position: relative;
    z-index: 1;
  }
  
  .certificate-title {
    font-size: 22pt;
    font-weight: bold;
    color: #FFFFFF;
    margin-bottom: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  
  .doctor-name {
    font-size: 16pt;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 4px;
  }
  
  .doctor-credentials {
    font-size: 11pt;
    color: rgba(255, 255, 255, 0.85);
    font-style: italic;
  }
  
  /* Section Styling */
  .section {
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }
  
  .section-title {
    font-size: 9pt;
    font-weight: bold;
    color: #0070D6;
    background-color: #EBF8FF;
    border-left: 4px solid #0070D6;
    padding: 5px 10px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: 0 4px 4px 0;
  }
  
  /* Data Container (reusable gray background wrapper) */
  .data-container {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 4px;
  }

  /* Info Grid */
  .info-grid {
    display: table;
    width: 100%;
  }
  
  .info-row {
    display: table-row;
  }
  
  .info-label {
    display: table-cell;
    font-weight: 700;
    color: #4A5568;
    width: 140px;
    padding: 4px 0;
    vertical-align: top;
    font-size: 10pt;
  }
  
  .info-value {
    display: table-cell;
    color: #1A202C;
    padding: 4px 0;
    vertical-align: top;
    font-size: 10pt;
    font-weight: 500;
  }
  
  /* Pre-Op Section */
  .preop-text {
    font-size: 10.5pt;
    color: #2D3748;
    line-height: 1.8;
    margin-bottom: 6px;
  }
  
  .preop-highlight {
    font-weight: 700;
    color: #0070D6;
    text-decoration: underline;
    text-decoration-color: #0070D6;
    text-underline-offset: 3px;
    font-style: italic;
  }
  
  /* Opinion Section */
  .opinion-container {
    background-color: #EBF8FF;
    border: 1px solid #BEE3F8;
    border-left: 5px solid #0070D6;
    padding: 14px 16px;
    border-radius: 0 8px 8px 0;
    margin-top: 8px;
  }
  
  .opinion-type {
    font-weight: 800;
    color: #0070D6;
    font-size: 11pt;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .opinion-content {
    font-size: 11pt;
    color: #1A202C;
    line-height: 1.7;
    white-space: pre-wrap;
    font-weight: 500;
  }
  
  /* Vitals Table */
  .vitals-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    background-color: white;
  }

  .vitals-table td {
    padding: 6px 10px;
    font-size: 10pt;
    border: 1px solid #E2E8F0;
  }

  .vitals-label {
    font-weight: 700;
    color: #4A5568;
    background-color: #F8FAFC;
    width: 80px;
  }

  .vitals-value {
    color: #1A202C;
    font-weight: 600;
    width: 120px;
  }

  /* Investigations Table */
  .investigations-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    background-color: white;
    border: 1px solid #E2E8F0;
  }

  .investigations-table tr:nth-child(even) {
    background-color: #F8FAFC;
  }

  .investigations-table td {
    padding: 7px 12px;
    font-size: 10pt;
    border-bottom: 1px solid #EDF2F7;
  }

  .inv-label {
    font-weight: 700;
    color: #4A5568;
    width: 60px;
  }

  .inv-value {
    color: #1A202C;
    font-weight: 500;
  }
  
  /* Recommendations */
  .recommendations-content {
    font-size: 11pt;
    color: #2D3748;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  
  /* Footer / Signature Section */
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #E2E8F0;
    display: table;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  
  .signature-cell {
    display: table-cell;
    width: 50%;
    vertical-align: bottom;
  }
  
  .signature-line {
    width: 180px;
    height: 2px;
    background: linear-gradient(to right, #0070D6, #15A1B1);
    margin-bottom: 8px;
    border-radius: 2px;
  }
  
  .signature-name {
    font-weight: 800;
    font-size: 13pt;
    color: #1A202C;
    margin-bottom: 2px;
  }
  
  .signature-title {
    font-size: 9pt;
    color: #718096;
    font-style: italic;
  }

  .signature-date {
    font-size: 9pt;
    color: #718096;
    margin-top: 4px;
  }
  
  .validity-cell {
    display: table-cell;
    width: 50%;
    text-align: right;
    vertical-align: bottom;
  }
  
  .validity-box {
    display: inline-block;
    background-color: #EBF8FF;
    border: 1px solid #BEE3F8;
    border-radius: 8px;
    padding: 10px 16px;
    text-align: right;
  }

  .validity-text {
    font-size: 11pt;
    color: #0070D6;
    font-weight: 700;
  }

  .certificate-id {
    font-size: 8pt;
    color: #718096;
    margin-top: 4px;
    font-family: monospace;
  }
  
  /* Print Optimization */
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    .certificate-container {
      border: 2px solid #0070D6 !important;
      box-shadow: none !important;
      page-break-inside: avoid;
    }
    
    .certificate-header {
      background: linear-gradient(135deg, #0070D6 0%, #15A1B1 100%) !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .section-title {
      background-color: #EBF8FF !important;
      border-left: 4px solid #0070D6 !important;
    }
    
    .opinion-container {
      background-color: #EBF8FF !important;
      border-left: 5px solid #0070D6 !important;
    }
  }

  /* PAGE BREAK RULES */
  .section, .opinion-container, .patient-info-box {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .footer {
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-before: auto;
  }

  .section + .section {
    page-break-before: auto;
    break-before: auto;
  }
`;

// ===========================================
// DOCTOR INFO (Default)
// ===========================================

export interface FitnessDoctorInfo {
    name: string;
    credentials: string;
}

export const DEFAULT_FITNESS_DOCTOR_INFO: FitnessDoctorInfo = {
    name: "Dr. Dipak Gawli",
    credentials: "MBBS, DNB General Medicine"
};

// ===========================================
// HTML GENERATION
// ===========================================

/**
 * Generate HTML content for Fitness Certificate PDF
 */
export function generateFitnessCertificateHtml(
    formData: Partial<FitnessCertificateFormData>,
    doctorInfo: FitnessDoctorInfo = DEFAULT_FITNESS_DOCTOR_INFO
): string {
    const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const { opinionTypeLabel, opinionContent } = getFitnessOpinionDetails(formData);

    // Vitals section — only if at least one value present
    const hasVitals = !!(formData.bloodPressure || formData.heartRate || formData.temperature
        || formData.oxygenSaturation || formData.respiratoryRate || formData.labValues);

    const vitalsSection = hasVitals ? `
    <div class="section">
      <div class="section-title">VITALS &amp; LAB VALUES</div>
      <table class="vitals-table">
        <tr>
          ${formData.bloodPressure ? `<td class="vitals-label">BP</td><td class="vitals-value">${formData.bloodPressure}</td>` : '<td></td><td></td>'}
          ${formData.oxygenSaturation ? `<td class="vitals-label">SpO2</td><td class="vitals-value">${formData.oxygenSaturation}</td>` : '<td></td><td></td>'}
        </tr>
        <tr>
          ${formData.heartRate ? `<td class="vitals-label">HR</td><td class="vitals-value">${formData.heartRate}</td>` : '<td></td><td></td>'}
          ${formData.respiratoryRate ? `<td class="vitals-label">RR</td><td class="vitals-value">${formData.respiratoryRate}</td>` : '<td></td><td></td>'}
        </tr>
        <tr>
          ${formData.temperature ? `<td class="vitals-label">Temp</td><td class="vitals-value">${formData.temperature}</td>` : '<td></td><td></td>'}
          ${formData.labValues ? `<td class="vitals-label">Labs</td><td class="vitals-value">${formData.labValues}</td>` : '<td></td><td></td>'}
        </tr>
      </table>
    </div>
  ` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medical Fitness Certificate</title>
  <style>
    ${certificatePdfStyles}
  </style>
</head>
<body>
  <div class="certificate-container" id="certificate-preview">
    
    <!-- Header -->
    <div class="certificate-header">
      <div class="certificate-title">MEDICAL FITNESS CERTIFICATE</div>
      <div class="doctor-name">${doctorInfo.name}</div>
      <div class="doctor-credentials">${doctorInfo.credentials}</div>
    </div>
    
    <!-- Patient Information -->
    <div class="section">
      <div class="section-title">PATIENT INFORMATION</div>
      <div class="data-container">
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${formData.patientName || "N/A"}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Age / Sex:</div>
            <div class="info-value">${formData.patientAge || "N/A"} years / ${formData.patientSex || "N/A"}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Date:</div>
            <div class="info-value">${currentDate}</div>
          </div>
        </div>
      </div>
    </div>
    
    ${generateFitnessPreOpSection(formData)}
    
    <!-- Clinical Assessment -->
    <div class="section">
      <div class="section-title">CLINICAL ASSESSMENT</div>
      <div class="data-container">
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">Past History:</div>
            <div class="info-value">${formData.pastHistory || "No significant history"}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Cardio Respiratory:</div>
            <div class="info-value">${formData.cardioRespiratoryFunction || "Normal"}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Sy/E:</div>
            <div class="info-value">${formData.syE || "Normal"}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Investigations -->
    <div class="section">
      <div class="section-title">INVESTIGATIONS</div>
      <table class="investigations-table">
        <tr><td class="inv-label">ECG:</td><td class="inv-value">${formData.ecgField || "Normal"}</td></tr>
        <tr><td class="inv-label">Echo:</td><td class="inv-value">${formData.echoField || "Normal"}</td></tr>
        <tr><td class="inv-label">CXR:</td><td class="inv-value">${formData.cxrField || "Normal"}</td></tr>
      </table>
    </div>
    
    <!-- Medical Opinion -->
    <div class="section">
      <div class="section-title">MEDICAL OPINION</div>
      <div class="opinion-container">
        <div class="opinion-type">${opinionTypeLabel}</div>
        <div class="opinion-content">${opinionContent}</div>
      </div>
    </div>
    
    ${vitalsSection}
    
    ${generateFitnessRecommendationsSection(formData)}
    
    <!-- Footer -->
    <div class="footer">
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div class="signature-name">${doctorInfo.name}</div>
        <div class="signature-title">${doctorInfo.credentials}</div>
        <div class="signature-date">Date: ${currentDate}</div>
      </div>
      <div class="validity-cell">
        <div class="validity-box">
          <div class="validity-text">Valid for: ${formData.validityPeriod || "30 days"}</div>
          <div class="certificate-id">Cert ID: ${formData.certificateId || generateFitnessCertificateId()}</div>
        </div>
      </div>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function getFitnessOpinionDetails(formData: Partial<FitnessCertificateFormData>): {
    opinionTypeLabel: string;
    opinionContent: string;
} {
    switch (formData.selectedOpinionType) {
        case "surgery_fitness":
            return {
                opinionTypeLabel: "Fitness for Surgery",
                opinionContent: formData.surgeryFitnessOption || "Not specified"
            };
        case "medication_modification":
            return {
                opinionTypeLabel: "Medication Modification",
                opinionContent: formData.medicationModificationText || "Not specified"
            };
        case "fitness_reserved":
            return {
                opinionTypeLabel: "Fitness Reserved For",
                opinionContent: formData.fitnessReservedText || "Not specified"
            };
        default:
            return {
                opinionTypeLabel: "Medical Opinion",
                opinionContent: formData.opinion || "Not specified"
            };
    }
}

function generateFitnessPreOpSection(formData: Partial<FitnessCertificateFormData>): string {
    if (!formData.preOpEvaluationForm && !formData.referredForPreOp) {
        return "";
    }

    let preOpText = "";
    if (formData.preOpEvaluationForm) {
        preOpText = `
      <div class="preop-text">
        PreOp evaluation / Fitness: 
        <span class="preop-highlight">${formData.preOpEvaluationForm}</span> form
      </div>
    `;
    }

    let referralText = "";
    if (formData.referredForPreOp) {
        referralText = `
      <div class="preop-text">
        Thanks for your reference. Referred for PreOp evaluation posted for 
        <span class="preop-highlight">Dr. ${formData.referredForPreOp}</span>
      </div>
    `;
    }

    return `
    <div class="section">
      <div class="section-title">PRE-OPERATIVE EVALUATION</div>
      ${preOpText}
      ${referralText}
    </div>
  `;
}

function generateFitnessRecommendationsSection(formData: Partial<FitnessCertificateFormData>): string {
    if (!formData.recommendations) {
        return "";
    }

    return `
    <div class="section">
      <div class="section-title">RECOMMENDATIONS</div>
      <div class="data-container">
        <div class="recommendations-content">${formData.recommendations}</div>
      </div>
    </div>
  `;
}

/**
 * Generate a unique certificate ID
 */
export function generateFitnessCertificateId(): string {
    return `CERT_${Date.now()}`;
}
