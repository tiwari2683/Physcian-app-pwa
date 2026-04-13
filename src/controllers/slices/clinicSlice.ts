import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ClinicState {
  clinicName: string | null;
  subscriptionExpiry: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | null;
  address: string | null;
  loading: boolean;
  /** Computed helpers are derived by selectors, not stored. */
}

const initialState: ClinicState = {
  clinicName: null,
  subscriptionExpiry: null,
  status: null,
  address: null,
  loading: false,
};

// ─── Async Thunk ─────────────────────────────────────────────────────────────
export const fetchClinicDetails = createAsyncThunk(
  'clinic/fetchDetails',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/patient-data', { action: 'getClinicDetails' });
      
      // Handle the nested structure of API Gateway + Lambda Proxy
      let data = res.data;
      if (data?.body) {
        data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }

      if (data?.success === false) {
        return rejectWithValue(data?.error || 'Failed to load clinic details');
      }

      // If the backend returns the fields directly in the response
      return data;
    } catch (err: any) {
      console.error('fetchClinicDetails error:', err);
      return rejectWithValue(err.message);
    }
  }
);


// ─── Slice ────────────────────────────────────────────────────────────────────
const clinicSlice = createSlice({
  name: 'clinic',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClinicDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClinicDetails.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.clinicName = action.payload.clinic_name ?? null;
        state.subscriptionExpiry = action.payload.subscription_expiry ?? null;
        state.status = action.payload.status ?? null;
        state.address = action.payload.address ?? null;
      })
      .addCase(fetchClinicDetails.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default clinicSlice.reducer;
