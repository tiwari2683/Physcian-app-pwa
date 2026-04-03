import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../views/Layouts/MainLayout';
import { DashboardScreen } from '../views/Doctor/Dashboard/DashboardScreen';
import { PatientDirectory } from '../views/Doctor/Patients/PatientDirectory';
import { NewPatientRegistration } from '../views/Doctor/Patients/NewPatientRegistration';
import { NewVisitWizard } from '../views/Doctor/Patients/NewVisitWizard';
import AppointmentsList from '../views/Doctor/Appointments/AppointmentsList';
import { FitnessCertificateForm } from '../views/Doctor/FitnessCertificate/FitnessCertificateForm';
import { FitnessCertificateHistory } from '../views/Doctor/FitnessCertificate/FitnessCertificateHistory';
import { SettingsScreen } from '../views/Doctor/Settings/SettingsScreen';
import { PrescriptionsList } from '../views/Doctor/Prescriptions/PrescriptionsList';
import { PatientPrescriptionHistory } from '../views/Doctor/Prescriptions/PatientPrescriptionHistory';
import { useRef } from 'react';

/** Generates a UUID-stamped draft URL for new patients, placing the draft
 *  identity in the URL so it survives a page refresh (F5).
 *  useRef ensures the UUID is generated ONCE per mount, never on re-renders. */
const NewPatientRedirect = () => {
  const draftId = useRef(`draft_${crypto.randomUUID()}`).current;
  return <Navigate to={`/doctor/visit/new/${draftId}`} replace />;
};

export default function DoctorRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="dashboard" element={<DashboardScreen />} />
        <Route path="patients" element={<PatientDirectory />} />
        <Route path="patients/new" element={<NewPatientRegistration />} />
        
        {/* Fitness Certificate Routes */}
        <Route path="fitness-certificate" element={<PatientDirectory />} />
        <Route path="fitness-certificate/:patientId" element={<FitnessCertificateForm />} />
        <Route path="fitness-certificate/:patientId/history" element={<FitnessCertificateHistory />} />

        {/* Prescriptions Routes */}
        <Route path="prescriptions" element={<PrescriptionsList />} />
        <Route path="prescriptions/:patientId" element={<PatientPrescriptionHistory />} />

        {/* New patient flow */}
        <Route path="visit/new" element={<NewPatientRedirect />} />
        <Route path="visit/new/:patientId" element={<NewVisitWizard />} />
        
        <Route path="appointments" element={<AppointmentsList />} />
        <Route path="settings" element={<SettingsScreen />} />
        
        {/* Fallback route for doctor sub-app */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
