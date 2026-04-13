import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { appointmentService } from '../../services/api/appointmentService';
import type { Appointment } from '../../models';

interface AppointmentsState {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AppointmentsState = {
  appointments: [],
  isLoading: false,
  error: null,
};

export const fetchAppointments = createAsyncThunk<Appointment[], void>(
  'appointments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await appointmentService.getAppointments();
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to fetch appointments');
    }
  }
);

export const createAppointment = createAsyncThunk<Appointment, Partial<Appointment>>(
  'appointments/create',
  async (appointmentData, { dispatch, rejectWithValue }) => {
    try {
      const newApt = await appointmentService.createAppointment(appointmentData);
      dispatch(fetchAppointments());
      return newApt;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to create appointment');
    }
  }
);

// Adds robust handling for new patients mimicking the Assistant flow securely
export const createPatientAndAppointment = createAsyncThunk<
    Appointment,
    {
        patientData: { name: string; age: string; sex: string; mobile: string; address: string };
        appointmentData: Partial<Appointment>;
    }
>(
    'appointments/createWithPatient',
    async ({ patientData, appointmentData }, { dispatch, rejectWithValue }) => {
        try {
            // First: Register the Master Patient Profile
            const { apiClient } = await import('../../services/api/apiClient');
            const createRes = await apiClient.post('/patient-data', {
                action: 'processPatientData',
                name: patientData.name,
                age: patientData.age || '0',
                sex: patientData.sex,
                mobile: patientData.mobile,
                address: patientData.address,
            });

            // Parse fallback for lambda proxy vs standard format
            const data = createRes?.data;
            const responseData = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;

            if (!responseData?.patientId) {
                throw new Error(responseData?.error || 'Failed to create patient — no patientId returned');
            }

            // Second: Link that Profile to the returned appointment id
            const newApt = await appointmentService.createAppointment({
                ...appointmentData,
                patientId: responseData.patientId
            });
            
            dispatch(fetchAppointments());
            return newApt;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error.message || 'Failed to create appointment and patient');
        }
    }
);


const appointmentSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default appointmentSlice.reducer;
