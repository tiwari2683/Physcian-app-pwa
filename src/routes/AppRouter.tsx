import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginScreen } from '../views/Auth/LoginScreen';
import { ForgotPasswordScreen } from '../views/Auth/ForgotPasswordScreen';
import { ForceChangePasswordScreen } from '../views/Auth/ForceChangePasswordScreen';
import { MainLayout } from '../views/Layouts/MainLayout';
import { DashboardScreen } from '../views/Dashboard/DashboardScreen';
import { PatientDirectory } from '../views/Patients/PatientDirectory';
import { NewPatientRegistration } from '../views/Patients/NewPatientRegistration';
import { NewVisitWizard } from '../views/Patients/NewVisitWizard';
import AppointmentsList from '../views/Appointments/AppointmentsList';

import { FitnessCertificateForm } from '../views/FitnessCertificate/FitnessCertificateForm';
import { FitnessCertificateHistory } from '../views/FitnessCertificate/FitnessCertificateHistory';
import { SettingsScreen } from '../views/Settings/SettingsScreen';

import { PrescriptionsList } from '../views/Prescriptions/PrescriptionsList';
import { PatientPrescriptionHistory } from '../views/Prescriptions/PatientPrescriptionHistory';

import { useRef } from 'react';

/** Generates a UUID-stamped draft URL for new patients, placing the draft
 *  identity in the URL so it survives a page refresh (F5).
 *  useRef ensures the UUID is generated ONCE per mount, never on re-renders. */
const NewPatientRedirect = () => {
  const draftId = useRef(`draft_${crypto.randomUUID()}`).current;
  return <Navigate to={`/visit/new/${draftId}`} replace />;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        {/* First-time login: Cognito requires the user to set a permanent password */}
        <Route path="/change-password" element={<ForceChangePasswordScreen />} />

        {/* Protected Routes (Requires Authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/patients" element={<PatientDirectory />} />
            <Route path="/patients/new" element={<NewPatientRegistration />} />
            
            {/* Fitness Certificate Routes */}
            <Route path="/fitness-certificate" element={<PatientDirectory />} />
            <Route path="/fitness-certificate/:patientId" element={<FitnessCertificateForm />} />
            <Route path="/fitness-certificate/:patientId/history" element={<FitnessCertificateHistory />} />

            {/* Prescriptions Routes */}
            <Route path="/prescriptions" element={<PrescriptionsList />} />
            <Route path="/prescriptions/:patientId" element={<PatientPrescriptionHistory />} />

            {/* New patient → generate a stable draft UUID in the URL */}
            <Route path="/visit/new" element={<NewPatientRedirect />} />
            {/* Handles both draft_<uuid> and real patientIds */}
            <Route path="/visit/new/:patientId" element={<NewVisitWizard />} />
            <Route path="/appointments" element={<AppointmentsList />} />
            <Route path="/settings" element={<SettingsScreen />} />
            
            {/* Fallback route for authenticated users */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
