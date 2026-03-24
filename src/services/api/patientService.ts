import { apiClient } from './apiClient';
import type { Patient } from '../../models';

// Helper to parse the AWS Lambda response format
const parseResponse = (data: any) => {
  const body = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
  return body;
};

export const patientService = {
  getAllPatients: async (): Promise<Patient[]> => {
    const response = await apiClient.post('/patient-data', {
      action: 'getAllPatients'
    });
    const parsedData = parseResponse(response.data);
    return parsedData.patients || [];
  },

  getPatientById: async (id: string): Promise<Patient> => {
    const response = await apiClient.post('/patient-data', {
      action: 'getPatient',
      patientId: id
    });
    const parsedData = parseResponse(response.data);
    return parsedData.patient || parsedData;
  },

  // Creates a bare-bones patient record — exact same payload as native basic.tsx
  createPatient: async (patientData: Partial<Patient>): Promise<Patient> => {
    const createPayload = {
      action: 'createPatient',  // explicit — routes to processPatientData in Lambda
      name: patientData.name,
      age: patientData.age,
      sex: patientData.sex,         // native key — no mapping needed
      mobile: patientData.mobile,   // native key — no mapping needed
      address: patientData.address || ''
    };

    const response = await apiClient.post('/patient-data', createPayload);
    const parsed = parseResponse(response.data);

    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to create patient.');
    }

    return { patientId: parsed.patientId, ...patientData } as Patient;
  },

  // Updates a patient with full visit data — native keys, no mapping
  updatePatient: async (patientId: string, payload: any): Promise<any> => {
    const updatePayload = {
      ...payload,
      patientId,
      updateMode: 'full',
      isPartialSave: false
    };

    const response = await apiClient.post('/patient-data', updatePayload);
    return parseResponse(response.data);
  },

  // Fetches the active (WAITING / IN_PROGRESS) visit for a patient — for assistant prefill
  getActiveVisit: async (patientId: string): Promise<any> => {
    const response = await apiClient.post('/patient-data', {
      action: 'getActiveVisit',
      patientId
    });
    const parsed = parseResponse(response.data);
    return parsed.activeVisit || null;
  },

  getWaitingRoom: async (): Promise<any[]> => {
    const response = await apiClient.post('/patient-data', {
      action: 'getWaitingRoom'
    });
    const parsed = parseResponse(response.data);
    return parsed.patients || [];
  },

  updateVisitStatus: async (visitId: string, status: string): Promise<any> => {
    const response = await apiClient.post('/patient-data', {
      action: 'updateVisitStatus',
      visitId,
      status
    });
    return parseResponse(response.data);
  },

  completeVisit: async (payload: { visitId: string; patientId: string; acuteData: any }): Promise<any> => {
    const response = await apiClient.post('/patient-data', {
      action: 'completeVisit',
      ...payload
    });
    return parseResponse(response.data);
  },

  searchPatients: async (query: string): Promise<any[]> => {
    const response = await apiClient.post('/patient-data', {
      action: 'searchPatients',
      searchTerm: query
    });
    const parsed = parseResponse(response.data);
    return parsed.patients || [];
  }
};
