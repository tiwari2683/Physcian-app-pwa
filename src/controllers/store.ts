import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import patientReducer from './slices/patientSlice';
import appointmentReducer from './slices/appointmentSlice';
import clinicReducer from './slices/clinicSlice';

// Assistant Migrated Slices
import asstPatientsReducer from './slices/assistant/asstPatientsSlice';
import asstPatientVisitReducer from './slices/assistant/asstPatientVisitSlice';
import asstAppointmentsReducer from './slices/assistant/asstAppointmentsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clinic: clinicReducer,
    // Doctor State
    patients: patientReducer,
    appointments: appointmentReducer,
    // Assistant State
    asstPatients: asstPatientsReducer,
    asstPatientVisit: asstPatientVisitReducer,
    asstAppointments: asstAppointmentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

