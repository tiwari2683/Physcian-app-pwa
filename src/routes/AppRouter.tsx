import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginScreen } from '../views/Auth/LoginScreen';
import { MainLayout } from '../views/Layouts/MainLayout';
import { DashboardScreen } from '../views/Dashboard/DashboardScreen';
import { PatientDirectory } from '../views/Patients/PatientDirectory';
import { NewPatientRegistration } from '../views/Patients/NewPatientRegistration';
import { NewVisitWizard } from '../views/Patients/NewVisitWizard';
import AppointmentsList from '../views/Appointments/AppointmentsList';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected Routes (Requires Authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/patients" element={<PatientDirectory />} />
            <Route path="/patients/new" element={<NewPatientRegistration />} />
            <Route path="/visit/new/:patientId" element={<NewVisitWizard />} />
            <Route path="/appointments" element={<AppointmentsList />} />
            {/* Fallback route for authenticated users */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
