import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Appointment } from '../../../models';
import { fetchAsstAppointmentsThunk, createAsstAppointmentThunk } from '../../assistant/asstThunks';

interface AsstAppointmentsState {
    appointments: Appointment[];
    isLoading: boolean;
    error: string | null;
}

const initialState: AsstAppointmentsState = {
    appointments: [],
    isLoading: false,
    error: null,
};

export const asstAppointmentsSlice = createSlice({
    name: 'asstAppointments',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAsstAppointmentsThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAsstAppointmentsThunk.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
                state.isLoading = false;
                state.appointments = action.payload;
            })
            .addCase(fetchAsstAppointmentsThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(createAsstAppointmentThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createAsstAppointmentThunk.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(createAsstAppointmentThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export default asstAppointmentsSlice.reducer;
