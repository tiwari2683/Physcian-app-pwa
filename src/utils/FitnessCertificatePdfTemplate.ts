/**
 * Fitness Certificate PDF Template
 * Redesigned with professional clinic letterhead, clean typography, and chunked sections
 * for intelligent multi-page pagination.
 */

import type { FitnessCertificateFormData } from "../models/FitnessCertificateTypes";

// ===========================================
// PDF STYLES (Clean, Formal, Typography-focused)
// ===========================================

export const certificatePdfStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
    color: #1A202C;
    line-height: 1.5;
    background: white;
    font-size: 11pt;
  }
  
  /* Repeating Page Header */
  .pdf-header {
    margin-bottom: 15px;
    border-bottom: 2px solid #2B6CB0;
    padding-bottom: 12px;
  }
  
  .header-top {
    text-align: center;
    margin-bottom: 10px;
  }

  .certificate-title {
    font-size: 18pt;
    font-weight: 800;
    color: #2B6CB0;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  
  .doctor-name {
    font-size: 12pt;
    font-weight: 700;
    color: #2D3748;
  }
  
  .doctor-credentials {
    font-size: 9pt;
    color: #718096;
  }
  
  .patient-details-grid {
    display: table;
    width: 100%;
    margin-top: 8px;
    background: #F7FAFC;
    border-radius: 6px;
    padding: 8px 12px;
  }

  .patient-row {
    display: table-row;
  }

  .patient-col {
    display: table-cell;
    padding: 4px 8px;
    width: 33%;
  }

  .patient-label {
    font-size: 9pt;
    text-transform: uppercase;
    color: #718096;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .patient-val {
    font-size: 11pt;
    color: #1A202C;
    font-weight: 600;
  }
  
  /* Sections */
  .section {
    padding: 0 5px 24px 5px; /* Replaced margin-bottom with padding-bottom to prevent html2canvas cropping */
  }
  
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #2B6CB0;
    border-bottom: 1px solid #E2E8F0;
    padding-bottom: 6px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  /* Clean Data Rows (no heavy boxes) */
  .data-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
  }
  
  .data-row {
    display: table-row;
  }
  
  .data-label {
    display: table-cell;
    font-weight: 700;
    color: #4A5568;
    width: 140px;
    padding: 6px 0;
    font-size: 10.5pt;
    vertical-align: top;
  }
  
  .data-value {
    display: table-cell;
    color: #1A202C;
    padding: 6px 0;
    font-size: 10.5pt;
    vertical-align: top;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  
  /* Tables (Investigations / Vitals) */
  .clean-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 5px;
    table-layout: fixed;
  }

  .clean-table th {
    text-align: left;
    padding: 8px 12px;
    background: #F7FAFC;
    color: #4A5568;
    font-size: 9pt;
    text-transform: uppercase;
    border-bottom: 1px solid #CBD5E0;
    font-weight: 700;
  }

  .clean-table td {
    padding: 8px 12px;
    font-size: 10.5pt;
    border-bottom: 1px solid #EDF2F7;
    color: #2D3748;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    vertical-align: top;
  }
  
  /* Medical Opinion (Prominent Centerpiece) */
  .opinion-box {
    background-color: #F0F9FF;
    border-left: 4px solid #3182CE;
    padding: 16px 20px;
    margin-top: 8px;
  }
  
  .opinion-type {
    font-weight: 700;
    color: #2C5282;
    font-size: 10pt;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .opinion-content {
    font-size: 12pt;
    color: #1A202C;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    font-weight: 600;
  }
  
  /* Text Blocks */
  .text-block {
    font-size: 11pt;
    color: #2D3748;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  /* Footer Section */
  .pdf-footer {
    margin-top: 40px;
    padding-top: 20px;
    padding-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  
  .signature-block {
    text-align: left;
  }
  
  .signature-img {
    height: 50px;
    width: auto;
    display: block;
    margin-bottom: 5px;
  }

  .signature-line {
    width: 200px;
    height: 1px;
    background: #4A5568;
    margin-bottom: 6px;
  }

  .signature-title-text {
    font-size: 9pt;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  
  .signature-name {
    font-weight: 700;
    font-size: 12pt;
    color: #1A202C;
  }
  
  .signature-creds {
    font-size: 9pt;
    color: #718096;
  }
  
  .validity-block {
    text-align: right;
  }
  
  .validity-text {
    font-size: 11pt;
    color: #2B6CB0;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .cert-id {
    font-size: 9pt;
    color: #A0AEC0;
    font-family: monospace;
  }
`;

// ===========================================
// DOCTOR INFO
// ===========================================

export interface FitnessDoctorInfo {
    name: string;
    credentials: string;
    signatureUrl?: string;
}

export const DEFAULT_FITNESS_DOCTOR_INFO: FitnessDoctorInfo = {
    name: "Dr. Dipak Gawli",
    credentials: "MBBS, DNB General Medicine",
    signatureUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fb/John_Hancock_signature.png"
};

// ===========================================
// DATA EXPORT FOR CHUNKED RENDERER
// ===========================================

export interface PdfSectionData {
    id: string;
    title: string;
    html: string;
}

export interface ChunkedPdfData {
    styles: string;
    headerHtml: string;
    footerHtml: string;
    sections: PdfSectionData[];
}

/**
 * Generates the clean, structurally separated HTML blocks for the PDF.
 * This allows the generation logic to measure each section and apply smart page breaks.
 */
export function generateChunkedFitnessCertificate(
    formData: Partial<FitnessCertificateFormData>,
    doctorInfo: FitnessDoctorInfo = DEFAULT_FITNESS_DOCTOR_INFO
): ChunkedPdfData {

    const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric"
    });

    const certId = formData.certificateId || "FC" + Date.now().toString().slice(-6);

    const headerHtml = [
      '<div class="pdf-header">',
        '<div class="header-top">',
            '<div class="certificate-title">Medical Fitness Certificate</div>',
            '<div class="doctor-name">', doctorInfo.name, '</div>',
            '<div class="doctor-credentials">', doctorInfo.credentials, '</div>',
        '</div>',
        '<div class="patient-details-grid">',
            '<div class="patient-row">',
                '<div class="patient-col">',
                    '<div class="patient-label">Patient Name</div>',
                    '<div class="patient-val">', formData.patientName || "N/A", '</div>',
                '</div>',
                '<div class="patient-col">',
                    '<div class="patient-label">Age / Sex</div>',
                    '<div class="patient-val">', formData.patientAge || "N/A", ' Yrs / ', formData.patientSex || "N/A", '</div>',
                '</div>',
                '<div class="patient-col" style="text-align: right;">',
                    '<div class="patient-label">Date</div>',
                    '<div class="patient-val">', currentDate, '</div>',
                '</div>',
            '</div>',
            '<div class="patient-row">',
                '<div class="patient-col">',
                    '<div class="patient-label">Certificate ID</div>',
                    '<div class="patient-val">', certId, '</div>',
                '</div>',
            '</div>',
        '</div>',
      '</div>'
    ].join("");

    const sections: PdfSectionData[] = [];

    // 2. PRE-OP EVALUATION
    if (formData.preOpEvaluationForm || formData.referredForPreOp) {
        sections.push({
            id: 'pre-op',
            title: 'Pre-Operative Evaluation',
            html: [
                '<div class="section">',
                    '<div class="section-title">Pre-Operative Evaluation</div>',
                    '<div class="text-block">',
                        formData.preOpEvaluationForm ? 'PreOp evaluation / Fitness: <strong>' + formData.preOpEvaluationForm + '</strong> form<br/>' : '',
                        formData.referredForPreOp ? 'Thanks for your reference. Referred for PreOp evaluation posted for <strong>Dr. ' + formData.referredForPreOp + '</strong>' : '',
                    '</div>',
                '</div>'
            ].join("")
        });
    }

    // 3. CLINICAL ASSESSMENT
    sections.push({
        id: 'clinical',
        title: 'Clinical Assessment',
        html: [
            '<div class="section">',
                '<div class="section-title">Clinical Assessment</div>',
                '<div class="data-grid">',
                    '<div class="data-row">',
                        '<div class="data-label">Past History:</div>',
                        '<div class="data-value">', formData.pastHistory || "No significant history", '</div>',
                    '</div>',
                    '<div class="data-row">',
                        '<div class="data-label">Cardio Respiratory:</div>',
                        '<div class="data-value">', formData.cardioRespiratoryFunction || "Normal", '</div>',
                    '</div>',
                    '<div class="data-row">',
                        '<div class="data-label">Sy/E (Symptoms/Exam):</div>',
                        '<div class="data-value">', formData.syE || "Normal", '</div>',
                    '</div>',
                '</div>',
            '</div>'
        ].join("")
    });

    // 4. VITALS
    const hasVitals = !!(formData.bloodPressure || formData.heartRate || formData.temperature || formData.oxygenSaturation || formData.respiratoryRate);
    if (hasVitals || formData.labValues) {
        sections.push({
            id: 'vitals',
            title: 'Vitals & Lab Parameters',
            html: [
                '<div class="section">',
                    '<div class="section-title">Vitals & Lab Parameters</div>',
                    '<table class="clean-table">',
                        '<thead>',
                            '<tr>',
                                '<th>Parameter</th>',
                                '<th>Recorded Value</th>',
                            '</tr>',
                        '</thead>',
                        '<tbody>',
                            formData.bloodPressure ? '<tr><td>Blood Pressure</td><td><strong>' + formData.bloodPressure + '</strong> mmHg</td></tr>' : '',
                            formData.heartRate ? '<tr><td>Heart Rate</td><td><strong>' + formData.heartRate + '</strong> bpm</td></tr>' : '',
                            formData.respiratoryRate ? '<tr><td>Respiratory Rate</td><td><strong>' + formData.respiratoryRate + '</strong> /min</td></tr>' : '',
                            formData.temperature ? '<tr><td>Temperature</td><td><strong>' + formData.temperature + '</strong> °F</td></tr>' : '',
                            formData.oxygenSaturation ? '<tr><td>SpO2</td><td><strong>' + formData.oxygenSaturation + '</strong> %</td></tr>' : '',
                            formData.labValues ? '<tr><td>Other Labs</td><td><strong>' + formData.labValues + '</strong></td></tr>' : '',
                        '</tbody>',
                    '</table>',
                '</div>'
            ].join("")
        });
    }

    // 5. INVESTIGATIONS
    sections.push({
        id: 'investigations',
        title: 'Investigations',
        html: [
            '<div class="section">',
                '<div class="section-title">Investigations</div>',
                '<table class="clean-table">',
                    '<thead>',
                        '<tr>',
                            '<th style="width: 30%;">Test</th>',
                            '<th>Findings</th>',
                        '</tr>',
                    '</thead>',
                    '<tbody>',
                        '<tr><td><strong>ECG</strong></td><td>', formData.ecgField || "Normal", '</td></tr>',
                        '<tr><td><strong>Echocardiogram</strong></td><td>', formData.echoField || "Normal", '</td></tr>',
                        '<tr><td><strong>Chest X-Ray</strong></td><td>', formData.cxrField || "Normal", '</td></tr>',
                    '</tbody>',
                '</table>',
            '</div>'
        ].join("")
    });

    // 6. MEDICAL OPINION
    const opinionDetails = getFitnessOpinionDetails(formData);
    sections.push({
        id: 'opinion',
        title: 'Medical Opinion',
        html: [
            '<div class="section">',
                '<div class="section-title">Medical Opinion</div>',
                '<div class="opinion-box">',
                    '<div class="opinion-type">', opinionDetails.opinionTypeLabel, '</div>',
                    '<div class="opinion-content">', opinionDetails.opinionContent, '</div>',
                '</div>',
            '</div>'
        ].join("")
    });

    // 7. RECOMMENDATIONS
    if (formData.recommendations) {
        sections.push({
            id: 'recommendations',
            title: 'Recommendations',
            html: [
                '<div class="section">',
                    '<div class="section-title">Recommendations</div>',
                    '<div class="text-block">', formData.recommendations, '</div>',
                '</div>'
            ].join("")
        });
    }

    // 8. FOOTER
    const footerHtml = [
      '<div class="pdf-footer">',
        '<div class="signature-block">',
            '<div class="signature-title-text">Authorized Signature</div>',
            doctorInfo.signatureUrl ? '<img src="' + doctorInfo.signatureUrl + '" class="signature-img" crossOrigin="anonymous" alt="Signature" />' : '<div style="height: 40px;"></div>',
            '<div class="signature-line"></div>',
            '<div class="signature-name">', doctorInfo.name, '</div>',
            '<div class="signature-creds">', doctorInfo.credentials, '</div>',
        '</div>',
        '<div class="validity-block">',
            '<div class="validity-text">Valid for: ', formData.validityPeriod || "30 days", '</div>',
        '</div>',
      '</div>'
    ].join("");

    return {
        styles: certificatePdfStyles,
        headerHtml,
        footerHtml,
        sections
    };
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
                opinionTypeLabel: "Primary Opinion",
                opinionContent: formData.opinion || "Not specified"
            };
    }
}
