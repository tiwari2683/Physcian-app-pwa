import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../views/Layouts/MainLayout';

import AssistantDashboard from '../views/Assistant/Dashboard/AssistantDashboard';
import AssistantVisitWizard from '../views/Assistant/Visit/AssistantVisitWizard';
import AssistantPatientsDirectory from '../views/Assistant/Patients/AssistantPatientsDirectory';
import PatientFullProfile from '../views/Assistant/Patients/PatientFullProfile';
import AppointmentsList from '../views/Assistant/Appointments/AppointmentsList';

import { SettingsScreen } from '../views/Assistant/Settings/SettingsScreen';
import { PendingFilesProvider } from '../contexts/PendingFilesContext';

export default function AssistantRoutes() {
  return (
    <PendingFilesProvider>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Actual Dashboard */}
          <Route path="dashboard" element={<AssistantDashboard />} />
          
          {/* Patients Profile & Directory */}
          <Route path="patients" element={<AssistantPatientsDirectory />} />
          <Route path="patients/:patientId" element={<PatientFullProfile />} />
          
          {/* The 4-Stage Visit Wizard */}
          <Route path="visit/:patientId" element={<AssistantVisitWizard />} />
          
          {/* Helper for new patients - redirects to specialized draft ID */}
          <Route path="visit/new" element={<AssistantVisitWizard />} />
          
          {/* Helper for appointments list */}
          <Route path="appointments" element={<AppointmentsList />} />
          
          {/* Profile & Account Settings */}
          <Route path="settings" element={<SettingsScreen />} />
          
          {/* Fallback route for assistant sub-app */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </PendingFilesProvider>
  );
}
