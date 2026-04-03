import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Patient } from '../../../models';
import { fetchAsstPatientsThunk, fetchAsstWaitingRoomThunk } from '../../assistant/asstThunks';

interface AsstPatientsState {
    patients: Patient[];
    waitingRoom: Patient[];
    isLoading: boolean;
    error: string | null;
}

const initialState: AsstPatientsState = {
    patients: [],
    waitingRoom: [],
    isLoading: false,
    error: null,
};

const asstPatientsSlice = createSlice({
    name: 'asstPatients',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAsstPatientsThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAsstPatientsThunk.fulfilled, (state, action: PayloadAction<Patient[]>) => {
                state.isLoading = false;
                state.patients = action.payload;
            })
            .addCase(fetchAsstPatientsThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchAsstWaitingRoomThunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAsstWaitingRoomThunk.fulfilled, (state, action: PayloadAction<Patient[]>) => {
                state.isLoading = false;
                state.waitingRoom = action.payload;
            })
            .addCase(fetchAsstWaitingRoomThunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export default asstPatientsSlice.reducer;
