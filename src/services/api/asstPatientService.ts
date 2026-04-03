import { apiClient } from './apiClient';
import type { Patient } from '../../models';

// Helper to parse the AWS Lambda response format
const parseResponse = (data: any) => {
  const body = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
  return body;
};

export const asstPatientService = {
  /**
   * Fetches the unique clinical history for a patient.
   * This is used by the Assistant's HistoryDrawer to show longitudinal records.
   */
  getPatientFullHistory: async (patientId: string): Promise<any> => {
    const response = await apiClient.post('/patient-data', {
      action: 'getPatient',
      patientId,
    });
    const parsedData = parseResponse(response.data);
    // Lambda returns a "patient" object with nested clinical history arrays
    return parsedData.patient || parsedData;
  },

  /**
   * Searches for patients across the entire clinic.
   */
  searchPatients: async (query: string): Promise<Patient[]> => {
    const response = await apiClient.post('/patient-data', {
      action: 'searchPatients',
      searchTerm: query
    });
    const parsed = parseResponse(response.data);
    return parsed.patients || [];
  },

  /**
   * Fetches all patients (paged or limited by backend).
   */
  getAllPatients: async (): Promise<Patient[]> => {
    const response = await apiClient.post('/patient-data', {
      action: 'getAllPatients'
    });
    const parsed = parseResponse(response.data);
    return parsed.patients || [];
  },

  /**
   * Initiates a new visit record in the cloud.
   * Returns a visitId from the Visits table.
   */
  initiateVisit: async (payload: {
    patientId: string;
    name: string;
    age: string;
    sex: string;
    mobile: string;
    address: string;
  }): Promise<any> => {
    const response = await apiClient.post('/patient-data', {
      action: 'initiateVisit',
      ...payload
    });
    return parseResponse(response.data);
  },

  /**
   * Finalizes the assistant's portion of the visit and sends it to the Waiting Room.
   */
  sendToDoctor: async (patientId: string, visitId: string, visitData: any): Promise<any> => {
    const response = await apiClient.post('/patient-data', {
      action: 'processPatientData',
      patientId,
      visitId,
      ...visitData,
      updateMode: 'full',
      isPartialSave: false, // Assistant final save is treated as full
      status: 'WAITING' // Explicitly set status to WAITING
    });
    return parseResponse(response.data);
  }
};
