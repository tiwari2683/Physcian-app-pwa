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
