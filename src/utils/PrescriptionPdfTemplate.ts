import type { Medication } from '../components/Common/SmartPrescriptionEngine';

export interface DoctorInfo {
    name: string;
    credentials: string;
    clinicName: string;
    clinicAddress: string;
    contactNumber: string;
    registrationNumber: string;
    email?: string;
}

export const DEFAULT_DOCTOR_INFO: DoctorInfo = {
    name: "Dr. Dipak Gawli",
    credentials: "M.B.B.S., M.D., M.S.",
    clinicName: "Care Clinic",
    clinicAddress: "Kothrud, Pune - 411038",
    contactNumber: "094233 80390",
    registrationNumber: "270988",
    email: "dronkarbhave@clinic.com",
};

export interface PrescriptionTemplateParams {
    patientName: string;
    age: string;
    gender: string;
    patientId?: string;
    address?: string;
    referredBy?: string;
    vitals: {
        bp?: string;
        weight?: string;
        height?: string;
        temp?: string;
    };
    diagnosis?: string;
    advisedInvestigations?: string;
    medications: Medication[];
    doctorInfo?: DoctorInfo;
    additionalNotes?: string;
    prescriptionDate?: string;
}

// ==========================================
// 1. HELPERS (Ported from React Native)
// ==========================================

const calculateTotalMedications = (medication: Medication) => {
    if (!medication.timing || !medication.duration) return "N/A";
    const durationRegex = /(\d+)\s*(day|days|week|weeks|month|months)/i;
    const durationMatch = medication.duration.match(durationRegex);
    if (!durationMatch) return "N/A";
    
    let durationDays = parseInt(durationMatch[1]);
    const durationUnit = durationMatch[2].toLowerCase();
    
    if (durationUnit.includes("week")) {
        durationDays *= 7;
    } else if (durationUnit.includes("month")) {
        durationDays *= 30;
    }
    
    const timingsPerDay = medication.timing.split(",").length;
    let totalDosesPerDay = 0;
    
    if (medication.timingValues && medication.timingValues !== "{}") {
        try {
            const timingValues = JSON.parse(medication.timingValues);
            const timingIds = medication.timing.split(",");
            for (const id of timingIds) {
                totalDosesPerDay += parseFloat(timingValues[id]) || 1;
            }
        } catch (e) {
            totalDosesPerDay = timingsPerDay;
        }
    } else {
        totalDosesPerDay = timingsPerDay;
    }
    return Math.round(totalDosesPerDay * durationDays);
};

const formatTimingDisplay = (medication: Medication) => {
    if (!medication.timing) return "Not specified";
    const timingIds = medication.timing.split(",");
    const timingLabels: { [key: string]: string } = {
        morning: "Morning",
        afternoon: "Aft",
        evening: "Eve",
        night: "Night",
    };
    
    if (medication.timingValues && medication.timingValues !== "{}") {
        try {
            const timingValues = JSON.parse(medication.timingValues);
            return timingIds.map((id) => {
                const label = timingLabels[id] || id.charAt(0).toUpperCase() + id.slice(1);
                const value = timingValues[id] || "1";
                return `${value} ${label}`;
            }).join(", ");
        } catch (e) {
            return timingIds.map((id) => timingLabels[id] || id.charAt(0).toUpperCase() + id.slice(1)).join(", ");
        }
    }
    
    return timingIds.map((id) => timingLabels[id] || id.charAt(0).toUpperCase() + id.slice(1)).join(", ");
};

const getMedicationFoodInstructions = (medication: Medication) => {
    if (medication.specialInstructions) {
        const instructions = medication.specialInstructions.toLowerCase();
        if (instructions.includes("before food") || instructions.includes("before meal")) {
            return "(Before Food)";
        } else if (instructions.includes("after food") || instructions.includes("after meal")) {
            return "(After Food)";
        }
    }
    if (medication.name && medication.name.toLowerCase().includes("antacid")) {
        return "(Before Food)";
    }
    return "(After Food)";
};


export const formatAsList = (text: string) => {
  if (!text) return '';
  return '<ul style="margin:0; padding-left:18px;">' +
    text.split('\n')
      .map(line => line.replace(/^[*\-•]\s*/, '').trim())
      .filter(Boolean)
      .map(line => `<li>${line.toUpperCase()}</li>`)
      .join('') +
    '</ul>';
};


// ==========================================
// 2. CSS STYLES (Ported from React Native)
// ==========================================

const pdfStyles = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #333;
    font-size: 14px;
    background-color: transparent !important;
  }
  .prescription-container {
    padding: 30px;
    padding-right: 54px; /* Fix for Bug 1 overflow clip */
    background: transparent !important;
    max-width: 820px;
    box-sizing: border-box;
  }
  .prescription-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #ccc;
    padding-bottom: 15px;
    margin-bottom: 20px;
  }
  
  .header-logo-section {
    display: flex;
    align-items: center;
  }
  
  .clinic-logo {
    width: 75px;
    height: 75px;
    margin-right: 15px;
  }
  
  .doctor-info {
    display: flex;
    flex-direction: column;
  }
  
  .doctor-name {
    font-weight: bold;
    font-size: 20px;
    color: #2D8C9E;
    margin-bottom: 4px;
  }
  
  .doctor-credentials {
    font-size: 14px;
    color: #2D8C9E;
  }
  
  .clinic-info {
    text-align: right;
    max-width: 45%;
    word-break: break-word;
    padding-right: 8px; /* Fix for Bug 6 overflow */
  }
  
  .clinic-name {
    font-weight: bold;
    font-size: 20px;
    color: #2D8C9E;
    margin-bottom: 4px;
  }
  
  .clinic-details {
    font-size: 14px;
    line-height: 1.3;
  }
  
  /* Patient info styling */
  .patient-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .patient-id {
    font-size: 15px;
    font-weight: bold;
  }
  
  .patient-date {
    text-align: right;
    font-weight: bold;
    font-size: 15px;
  }
  
  .patient-details {
    margin-bottom: 12px;
    font-size: 14px;
  }
  
  .patient-details p {
    margin-bottom: 3px;
  }
  
  .referred-by {
    margin-bottom: 12px;
    font-size: 14px;
  }
  
  /* Diagnosis section */
  .section-title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .diagnosis, .advised-investigations {
    margin-bottom: 15px;
    word-break: break-word;
  }
  
  /* Rx symbol */
  .rx-symbol {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  
  /* Medications table */
  .medications-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px; /* Bug 8 Padding Fix */
    border-top: 1px solid #333;
    border-bottom: 1px solid #333;
  }
  
  .medications-table th {
    border-bottom: 1px solid #333;
    padding: 8px;
    text-align: left;
    font-weight: bold;
    font-size: 14px;
  }
  
  .medications-table td {
    padding: 10px 8px;
    border-bottom: 1px solid #eee;
    font-size: 14px;
    vertical-align: top;
  }
  
  .medications-table tr:nth-child(even) {
    background-color: #f8f8f8;
  }
  
  /* Advice section */
  .advice {
    margin-top: 20px;
    margin-bottom: 15px;
  }
  
  /* Follow-up section */
  .follow-up {
    font-size: 14px;
    color: #333;
    margin-bottom: 30px; /* Bug 8 spacing */
  }
  
  /* Signature section */
  .signature-section {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-top: 60px; /* Bug 8 spacing */
    page-break-inside: avoid;
  }
  
  .signature-line {
    width: 150px;
    height: 1px;
    background-color: #333;
    margin-left: auto;
    margin-bottom: 5px;
  }
  
  .doctor-signature-name {
    font-weight: bold;
    font-size: 14px;
  }
`;

// ==========================================
// 3. GENERATOR ENGINE
// ==========================================

export const generatePrescriptionHTML = (params: PrescriptionTemplateParams) => {
    const doctor = params.doctorInfo || DEFAULT_DOCTOR_INFO;
    
    // Explicit format as requested: en-GB explicitly
    const baseDate = new Date(params.prescriptionDate || new Date());
    const formattedDate = baseDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');
    
    const followUpDate = new Date(baseDate);
    followUpDate.setDate(followUpDate.getDate() + 11);
    const formattedFollowUpDate = followUpDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');

    // Section Conditionals
    let diagnosisSection = "";
    if (params.diagnosis && params.diagnosis.trim().length > 0) {
        const formattedDiag = formatAsList(params.diagnosis);
        diagnosisSection = `
            <div class="diagnosis">
                <div class="section-title">Diagnosis:</div>
                <div style="font-size: 14px;">${formattedDiag}</div>
            </div>
        `;
    }

    let advisedInvestigationsSection = "";
    if (params.advisedInvestigations && params.advisedInvestigations.trim().length > 0) {
        const formattedInv = formatAsList(params.advisedInvestigations);
        advisedInvestigationsSection = `
            <div class="advised-investigations">
                <div class="section-title">Advised Investigations:</div>
                <div style="font-size: 14px;">${formattedInv}</div>
            </div>
        `;
    }

    const vitalsLineArray = [
        params.vitals.weight ? `Weight(kg): ${params.vitals.weight}` : '',
        params.vitals.height ? `Height (cms): ${params.vitals.height}` : '',
        params.vitals.bp ? `BP: ${params.vitals.bp} mmHg` : '',
        params.vitals.temp ? `Temp: ${params.vitals.temp}` : ''
    ].filter(Boolean);
    
    const vitalsLine = vitalsLineArray.join(', ');

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Medical Prescription</title>
        <style>
          ${pdfStyles}
        </style>
      </head>
      <body>
        <div id="pdf-content" class="prescription-container">
          
          <!-- 1. Header -->
          <div class="prescription-header">
            <div class="header-logo-section">
              <div class="clinic-logo">
                <svg viewBox="0 0 100 100" width="75" height="75">
                  <rect x="10" y="40" width="30" height="30" fill="#1D56A0" />
                  <circle cx="70" cy="50" r="20" fill="#7AB800" />
                  <path d="M60,65 Q70,80 80,65" stroke="#7AB800" stroke-width="6" fill="none" />
                </svg>
              </div>
              <div class="doctor-info">
                <div class="doctor-name">${doctor.name}</div>
                <div class="doctor-credentials">${doctor.credentials} | Reg. No: ${doctor.registrationNumber}</div>
              </div>
            </div>
            <div class="clinic-info">
              <div class="clinic-name">${doctor.clinicName}</div>
              <div class="clinic-details">${doctor.clinicAddress}</div>
              <div class="clinic-details">Ph: ${doctor.contactNumber}, Timing: 09:00 AM - 02:00 PM |</div>
              <div class="clinic-details">Closed: Thursday</div>
            </div>
          </div>
          
          <!-- 2. Patient Info -->
          <div class="patient-info">
            <div class="patient-id">ID: ${params.patientId || "14"} - ${params.patientName.toUpperCase()} (${params.gender}) / ${params.age} Y</div>
            <div class="patient-date">Date: ${formattedDate}</div>
          </div>
          <div class="patient-details">
            <p>Address: ${params.address || "KOTHRUD, PUNE"}</p>
            ${vitalsLine ? `<p>${vitalsLine}</p>` : ''}
          </div>
          <div class="referred-by">
             <p>Referred By: ${params.referredBy || "Dr. Demo"}</p>
          </div>
          
          <!-- 3. Diagnosis -->
          ${diagnosisSection}
          
          <!-- 4. Investigations -->
          ${advisedInvestigationsSection}
          
          <!-- 5. Rx Symbol -->
          <div class="rx-symbol">&#82;</div>
          
          <!-- 6. Medications Table -->
          <table class="medications-table">
            <thead>
              <tr>
                <th width="40%">Medicine Name</th>
                <th width="30%">Dosage</th>
                <th width="30%">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${params.medications.length === 0 ? '<tr><td colspan="3" style="text-align: center">No medications prescribed.</td></tr>' : ''}
              ${params.medications.map((med, index) => {
                const medName = med.name ? med.name.toUpperCase() : `MEDICATION ${index + 1}`;
                const timingDisplay = formatTimingDisplay(med);
                const foodInstructions = getMedicationFoodInstructions(med);
                let unit = "Tab";
                if (med.unit) {
                    if (med.unit.toLowerCase() === "capsule") unit = "Cap";
                    else if (med.unit.toLowerCase() === "tablet") unit = "Tab";
                    else unit = med.unit.charAt(0).toUpperCase() + med.unit.slice(1);
                }
                const duration = med.duration || "As directed";
                const totalCount = calculateTotalMedications(med);
                const nameDisplay = `${index + 1}) ${unit.toUpperCase()}. ${medName}`;
                return `
                    <tr>
                      <td>${nameDisplay}</td>
                      <td>${timingDisplay}<br>${foodInstructions}</td>
                      <td>${duration}<br>(Tot:${totalCount} ${unit})</td>
                    </tr>
                `;
              }).join("")}
            </tbody>
          </table>
          
          <!-- 7. Advice -->
          ${(params.additionalNotes && params.additionalNotes.trim().length > 0) ? `
          <div class="advice">
            <div class="section-title">Advice Given:</div>
            <p>* ${params.additionalNotes}</p>
          </div>` : ''}
          
          <!-- 8. Follow-up -->
          <div class="follow-up">
            <p>Follow Up: ${formattedFollowUpDate}</p>
          </div>
          
          <!-- 9. Signature -->
          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="doctor-signature-name">${doctor.name}</div>
          </div>
          
        </div>
      </body>
    </html>
    `;
};
