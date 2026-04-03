import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/apiClient';
import type { Patient, Appointment } from '../../models';
import type { RootState } from '../store';
import { 
  setAsstVisitId, 
  setAsstCloudPatientId, 
  setAsstFullPatientHistory 
} from '../slices/assistant/asstPatientVisitSlice';

/**
 * Robustly parse data from an AWS Lambda response.
 * Handles both "Proxy Integration" format (statusCode, body) and raw objects.
 */
const parseLambdaResponse = (axiosResponse: any) => {
    const data = axiosResponse?.data;
    if (!data) return null;
    if (data.body !== undefined) {
        return typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    }
    return data;
};

// ============================================================================
// VISIT THUNKS
// ============================================================================

export const initiateAsstVisitThunk = createAsyncThunk<
    { visitId: string },
    { patientId: string; name: string; age: string; sex: string; mobile: string; address: string },
    { state: RootState }
>(
    'asstPatientVisit/initiate',
    async (basicInfo, { dispatch, rejectWithValue }) => {
        try {
            const payload = {
                action: 'initiateVisit',
                ...basicInfo
            };

            const response = await apiClient.post('/patient-data', payload);
            const responseData = parseLambdaResponse(response);

            if (responseData?.success && responseData.visitId) {
                dispatch(setAsstVisitId(responseData.visitId));
                return { visitId: responseData.visitId };
            } else {
                throw new Error(responseData?.message || 'Failed to initiate visit');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to initiate visit');
        }
    }
);

export const fetchAsstPatientDataThunk = createAsyncThunk<
    any,
    string,
    { state: RootState }
>(
    'asstPatientVisit/fetchPatient',
    async (patientId, { dispatch, rejectWithValue }) => {
        try {
            const [patientResponse, reportsResponse] = await Promise.all([
                apiClient.post('/patient-data', { action: 'getPatient', patientId }),
                apiClient.post('/patient-data', { action: 'getReportsHistory', patientId }).catch(e => {
                    console.warn('Failed to fetch reports history silently', e);
                    return { data: { success: true, reportsHistory: [] } };
                })
            ]);

            const responseData = parseLambdaResponse(patientResponse);
            const reportsData = parseLambdaResponse(reportsResponse);

            if (responseData?.success && responseData.patient) {
                const p = responseData.patient;
                const activeVisit = responseData.activeVisit ?? null;

                const unmarshal = (item: any): any => {
                    if (item === null || item === undefined) return item;
                    if (typeof item !== 'object') return item;
                    if (Object.keys(item).length === 1) {
                        const key = Object.keys(item)[0];
                        if (['S', 'N', 'BOOL'].includes(key)) return item[key];
                        if (key === 'M') return unmarshal(item[key]);
                        if (key === 'L') return (item[key] as any[]).map(unmarshal);
                    }
                    const result: any = {};
                    for (const key in item) { result[key] = unmarshal(item[key]); }
                    return result;
                };

                const mapHistoryItem = (arr: any[], mapper: (item: any) => any) => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map(rawItem => {
                        const item = unmarshal(rawItem);
                        return {
                            timestamp: item.completedAt || item.createdAt || item.updatedAt || new Date().toISOString(),
                            doctorName: item.doctorName || 'Dr. Tiwari',
                            data: {
                                ...item,
                                vitals: item.clinicalParameters || item.vitals || {},
                                historyText: item.medicalHistory || item.historyDetails || item.newHistoryEntry || item.visitDetails || '',
                                meds: item.medications || [],
                                files: item.reportFiles || [],
                                diag: item.diagnosis || item.diagnosisText || '',
                                ...mapper(item)
                            }
                        };
                    });
                };

                const mappedMedicalHistory = mapHistoryItem(responseData.medicalHistory || [], item => ({
                    historyText: item.historyDetails || item.medicalHistory || item.newHistoryEntry || item.visitDetails
                }));

                const vitalsArray = responseData.clinicalHistory || [];
                const mappedVitalsHistory = mapHistoryItem(vitalsArray, item => {
                    const metadataKeys = ['visitId', 'patientId', 'createdAt', 'updatedAt', 'doctorName'];
                    const vitals: any = {};
                    Object.keys(item).forEach(key => {
                        if (!metadataKeys.includes(key)) {
                            const mappedKey = key === 'fastingHBA1C' ? 'fastingHbA1c' : key;
                            vitals[mappedKey] = item[key];
                        }
                    });
                    return { vitals };
                });

                const rawReportsArray = reportsData.reportsHistory || reportsData.history || (Array.isArray(reportsData) ? reportsData : []);
                const mappedReportsHistory = mapHistoryItem(rawReportsArray, item => ({
                    reportNotes: item.reportNotes || item.reports,
                    reportsAttached: (item.reportFiles && item.reportFiles.length) || (item.filesAttached) || 0
                }));

                const mappedDiagnosisHistory = mapHistoryItem(responseData.diagnosisHistory || [], item => ({
                    diagnosisText: item.diagnosis || item.diagnosisText
                }));

                const mappedInvestigationsHistory = mapHistoryItem(responseData.investigationsHistory || [], item => {
                    const rawInv = item.investigations || item.advisedInvestigations || [];
                    let advisedArray: string[] = [];
                    if (typeof rawInv === 'string') {
                        try {
                            const parsed = JSON.parse(rawInv);
                            advisedArray = Array.isArray(parsed) ? parsed : [rawInv];
                        } catch (e) {
                            advisedArray = rawInv.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                        }
                    } else if (Array.isArray(rawInv)) {
                        advisedArray = rawInv;
                    }

                    return {
                        selectedInvestigations: advisedArray,
                        customInvestigations: item.customInvestigations
                    };
                });

                dispatch(setAsstFullPatientHistory({
                    clinicalHistory: mappedMedicalHistory,
                    vitalsHistory: mappedVitalsHistory,
                    reportsHistory: mappedReportsHistory,
                    medicalHistory: mappedMedicalHistory,
                    diagnosisHistory: mappedDiagnosisHistory,
                    investigationsHistory: mappedInvestigationsHistory,
                    patientData: {
                        fullName: p.name || '',
                        age: p.age ? String(p.age) : '',
                        sex: (p.sex as any) || 'Male',
                        mobileNumber: p.mobile || '',
                        address: p.address || '',
                    },
                    activeVisit: activeVisit
                }));

                if (activeVisit) {
                    dispatch(setAsstVisitId(activeVisit.visitId));
                }

                return responseData;
            } else {
                throw new Error(responseData?.message || 'Failed to fetch patient data');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch patient data');
        }
    }
);

export const sendToWaitingRoomThunk = createAsyncThunk<any, any, { state: RootState }>(
    'asstPatients/sendToWaitingRoom',
    async (patientData, { getState, rejectWithValue }) => {
        try {
            const state = (getState() as any).asstPatientVisit;

            const payload: any = {
                action: 'updateVisit',
                visitId: patientData.visitId || state.visitId,
                patientId: patientData.patientId || state.patientId || state.cloudPatientId,

                medicalHistory: patientData.medicalHistory || patientData.clinical?.historyText || '',
                clinicalParameters: patientData.clinicalParameters || patientData.clinical?.vitals || {},
                reportFiles: patientData.reportFiles || patientData.clinical?.reports || [],
                reportNotes: patientData.reportNotes || patientData.clinical?.reportNotes || '',

                diagnosis: patientData.diagnosis?.diagnosisText || (typeof patientData.diagnosis === 'string' ? patientData.diagnosis : ''),
                advisedInvestigations: patientData.advisedInvestigations || JSON.stringify([
                    ...(patientData.diagnosis?.selectedInvestigations || []),
                    ...(patientData.diagnosis?.customInvestigations ? [patientData.diagnosis.customInvestigations] : [])
                ]),

                status: 'WAITING',
                treatment: patientData.treatment || 'WAITING',
                medications: patientData.medications || [],
                sentByAssistant: true,
            };

            const response = await apiClient.post('/patient-data', payload);
            const responseData = parseLambdaResponse(response);
            return responseData;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to send to waiting room');
        }
    }
);

export const autoSaveAsstDraftThunk = createAsyncThunk<
    { cloudPatientId: string; visitId?: string },
    void,
    { state: RootState }
>(
    'asstPatientVisit/cloudSave',
    async (_, { getState, dispatch, rejectWithValue }) => {
        try {
            const state = (getState() as any).asstPatientVisit;

            if (state.isVisitLocked || state.visitStatus === 'COMPLETED') {
                return rejectWithValue('Visit is locked — cloud save skipped');
            }

            if (!state.basic?.fullName) {
                return rejectWithValue('No patient name — cloud save skipped');
            }

            if (state.visitId && state.cloudPatientId) {
                const payload = {
                    action: 'updateVisit',
                    visitId: state.visitId,
                    clinicalParameters: state.clinical?.vitals || {},
                    diagnosis: state.diagnosis?.diagnosisText || '',
                    reportFiles: state.clinical?.reports || [],
                    advisedInvestigations: JSON.stringify([
                        ...(state.diagnosis?.selectedInvestigations || []),
                        ...(state.diagnosis?.customInvestigations ? [state.diagnosis.customInvestigations] : [])
                    ])
                };
                await apiClient.post('/patient-data', payload);
                return { cloudPatientId: state.cloudPatientId, visitId: state.visitId };
            }

            let resolvedPatientId = state.cloudPatientId;
            if (!resolvedPatientId) {
                const createPayload = {
                    action: 'processPatientData', 
                    name: state.basic.fullName,
                    age: state.basic.age || '0', 
                    sex: state.basic.sex,
                    mobile: state.basic.mobileNumber,
                    address: state.basic.address
                };
                const res = await apiClient.post('/patient-data', createPayload);
                const responseData = parseLambdaResponse(res);
                resolvedPatientId = responseData.patientId;
                if (!resolvedPatientId) throw new Error('Failed to create patient — no patientId returned');
                dispatch(setAsstCloudPatientId(resolvedPatientId));
            }

            const initRes = await dispatch(initiateAsstVisitThunk({
                patientId: resolvedPatientId,
                name: state.basic.fullName,
                age: state.basic.age,
                sex: state.basic.sex,
                mobile: state.basic.mobileNumber,
                address: state.basic.address
            })).unwrap();

            return { cloudPatientId: resolvedPatientId, visitId: initRes.visitId };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Cloud save failed');
        }
    }
);

export const fetchAsstPatientsThunk = createAsyncThunk<Patient[], void>(
    'asstPatients/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/patient-data', { action: 'getAllPatients' });
            const responseData = parseLambdaResponse(response);
            const allPatients: Patient[] = responseData.patients || (Array.isArray(responseData) ? responseData : []);

            return allPatients.filter((p: any) =>
                p.status !== 'DRAFT' && p.treatment !== 'DRAFT'
            );
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch patients');
        }
    }
);

export const fetchAsstWaitingRoomThunk = createAsyncThunk<Patient[], void>(
    'asstPatients/fetchWaitingRoom',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/patient-data', { action: 'getWaitingRoom' });
            const responseData = parseLambdaResponse(response);
            return responseData.patients || (Array.isArray(responseData) ? responseData : []);
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch waiting room');
        }
    }
);

export const fetchAsstAppointmentsThunk = createAsyncThunk<Appointment[], void>(
    'asstAppointments/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/appointments');
            // Assuming appointments API might not use the same proxy wrapper or uses it differently
            const responseData = parseLambdaResponse(response);
            return responseData || [];
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch appointments');
        }
    }
);

export const createAsstAppointmentThunk = createAsyncThunk<Appointment, Partial<Appointment>>(
    'asstAppointments/create',
    async (appointmentData, { dispatch, rejectWithValue }) => {
        try {
            const response = await apiClient.post('/appointments', appointmentData);
            dispatch(fetchAsstAppointmentsThunk());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create appointment');
        }
    }
);

export const createAsstPatientAndAppointmentThunk = createAsyncThunk<
    Appointment,
    {
        patientData: { name: string; age: string; sex: string; mobile: string; address: string };
        appointmentData: Partial<Appointment>;
    }
>(
    'asstAppointments/createWithPatient',
    async ({ patientData, appointmentData }, { dispatch, rejectWithValue }) => {
        try {
            const createRes = await apiClient.post('/patient-data', {
                action: 'processPatientData',
                name: patientData.name,
                age: patientData.age || '0',
                sex: patientData.sex,
                mobile: patientData.mobile,
                address: patientData.address,
            });

            const responseData = parseLambdaResponse(createRes);
            if (!responseData.patientId) {
                throw new Error(responseData.error || 'Failed to create patient — no patientId returned');
            }

            const resolvedPatientId: string = responseData.patientId;
            const appointmentPayload = {
                ...appointmentData,
                patientId: resolvedPatientId,
            };

            const apptRes = await apiClient.post('/appointments', appointmentPayload);
            dispatch(fetchAsstAppointmentsThunk());
            return apptRes.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create appointment');
        }
    }
);
