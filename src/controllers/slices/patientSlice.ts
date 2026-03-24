import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Patient } from '../../models';
import { patientService } from '../../services/api/patientService';

interface PatientState {
  patients: Patient[];
  waitingRoom: any[];
  loading: boolean;
  loadingWaitingRoom: boolean;
  error: string | null;
}

const initialState: PatientState = {
  patients: [],
  waitingRoom: [],
  loading: false,
  loadingWaitingRoom: false,
  error: null,
};

export const fetchPatients = createAsyncThunk(
  'patients/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await patientService.getAllPatients();
      return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch patients. Please try again.');
    }
  }
);

export const fetchWaitingRoom = createAsyncThunk(
  'patients/fetchWaitingRoom',
  async (_, { rejectWithValue }) => {
    try {
      const data = await patientService.getWaitingRoom();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch waiting room.');
    }
  }
);

export const updateVisitStatusThunk = createAsyncThunk(
  'patients/updateVisitStatus',
  async ({ visitId, status }: { visitId: string; status: string }, { dispatch, rejectWithValue }) => {
    try {
      await patientService.updateVisitStatus(visitId, status);
      // Refresh the waiting room after successfully changing status
      dispatch(fetchWaitingRoom());
      return { visitId, status };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update visit status.');
    }
  }
);

export const createNewPatient = createAsyncThunk(
  'patients/create',
  async (patientData: Partial<Patient>, { rejectWithValue }) => {
    try {
      return await patientService.createPatient(patientData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create patient. Please try again.');
    }
  }
);

const patientSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchPatients
      .addCase(fetchPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action: PayloadAction<Patient[]>) => {
        state.loading = false;
        state.patients = action.payload;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchWaitingRoom
      .addCase(fetchWaitingRoom.pending, (state) => {
        state.loadingWaitingRoom = true;
        state.error = null;
      })
      .addCase(fetchWaitingRoom.fulfilled, (state, action) => {
        state.loadingWaitingRoom = false;
        state.waitingRoom = action.payload;
      })
      .addCase(fetchWaitingRoom.rejected, (state, action) => {
        state.loadingWaitingRoom = false;
        state.error = action.payload as string;
      })
      // createNewPatient
      .addCase(createNewPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewPatient.fulfilled, (state, action: PayloadAction<Patient>) => {
        state.loading = false;
        state.patients = [action.payload, ...state.patients];
      })
      .addCase(createNewPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default patientSlice.reducer;
