import type { Medication } from '../components/Common/SmartPrescriptionEngine';

export const generatePrescriptionHTML = (
  patientName: string,
  age: string,
  gender: string,
  vitals: { bp?: string; weight?: string; temp?: string },
  prescriptions: Medication[],
  doctorName: string = "Dr. Prashant Tiwari",
  clinicName: string = "Tiwari Multi-Speciality Clinic"
) => {
  const date = new Date().toLocaleDateString();

  const rxRows = prescriptions.map((med, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${index + 1}. ${med.name}</strong><br/>
        <span style="color: #555; font-size: 14px;">${med.dosage || ''}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${med.frequency || med.timing || ''}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${med.duration || ''}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; background: white; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
          .clinic-name { font-size: 28px; font-weight: bold; color: #1e3a8a; }
          .doctor-name { font-size: 18px; color: #555; margin-top: 5px; }
          .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; }
          .vitals { font-size: 14px; color: #666; margin-top: 10px; }
          .rx-symbol { font-size: 40px; font-weight: bold; margin-bottom: 20px; }
          table { border-collapse: collapse; margin-bottom: 40px; width: 100%; }
          th { text-align: left; padding: 12px; background: #f1f5f9; color: #475569; }
          .footer { margin-top: 50px; text-align: right; }
          .signature-line { border-top: 1px solid #333; width: 200px; display: inline-block; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div id="pdf-content" style="width: 800px; padding: 40px; background: white;">
          <div class="header">
            <div>
              <div class="clinic-name">${clinicName}</div>
              <div class="doctor-name">${doctorName}</div>
            </div>
            <div style="text-align: right;">
              <div>Date: <strong>${date}</strong></div>
            </div>
          </div>

          <div class="patient-info">
            <div>
              <strong>Patient:</strong> ${patientName}<br/>
              <span style="color: #555;">Age: ${age} | Gender: ${gender}</span>
            </div>
            <div class="vitals">
              ${vitals.bp ? `BP: ${vitals.bp} <br/>` : ''}
              ${vitals.weight ? `Weight: ${vitals.weight} <br/>` : ''}
              ${vitals.temp ? `Temp: ${vitals.temp}` : ''}
            </div>
          </div>

          <div class="rx-symbol">℞</div>

          <table>
            <thead>
              <tr>
                <th>Medicine & Dosage</th>
                <th style="text-align: center;">Frequency</th>
                <th style="text-align: right;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${rxRows || '<tr><td colspan="3" style="text-align: center; padding: 20px;">No medications prescribed.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div class="signature-line">
              Authorized Signature
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
