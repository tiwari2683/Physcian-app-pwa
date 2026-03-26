import { apiClient } from './apiClient';
import type { 
    FitnessCertificatePatient, 
    DiagnosisHistoryEntry, 
    InvestigationsHistoryEntry,
    FitnessCertificateFormData
} from '../../models/FitnessCertificateTypes';

// FEATURE FLAG: Enable/Disable cloud sync (mirrored from native app)
export const ENABLE_CLOUD_SYNC = true;

// Helper to parse the AWS Lambda response format
const parseResponse = (data: any) => {
    const body = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
    return body;
};

/**
 * Service for managing Fitness Certificates
 * 100% parity with React Native implementation
 */
export const fitnessCertificateService = {
    /**
     * Fetch complete patient record from backend
     */
    fetchPatientData: async (patientId: string): Promise<FitnessCertificatePatient | null> => {
        try {
            console.log(`📡 Fetching fitness-enhanced patient data for ID: ${patientId}`);
            const response = await apiClient.post('/patient-data', {
                action: "getPatient",
                patientId: patientId,
            });
            const parsedData = parseResponse(response.data);
            
            if (parsedData.success && parsedData.patient) {
                return parsedData.patient;
            }
            return null;
        } catch (error) {
            console.error("❌ Error fetching patient data:", error);
            return null;
        }
    },

    /**
     * Fetch patient's diagnosis history
     */
    fetchDiagnosisHistory: async (patientId: string): Promise<DiagnosisHistoryEntry[]> => {
        try {
            const response = await apiClient.post('/patient-data', {
                action: "getDiagnosisHistory",
                patientId: patientId,
                includeAll: true,
            });
            const parsedData = parseResponse(response.data);
            
            if (parsedData.success && parsedData.diagnosisHistory) {
                return parsedData.diagnosisHistory;
            }
            return [];
        } catch (error) {
            console.error("❌ Error fetching diagnosis history:", error);
            return [];
        }
    },

    /**
     * Fetch patient's investigations history
     */
    fetchInvestigationsHistory: async (patientId: string): Promise<InvestigationsHistoryEntry[]> => {
        try {
            const response = await apiClient.post('/patient-data', {
                action: "getInvestigationsHistory",
                patientId: patientId,
                includeAll: true,
            });
            const parsedData = parseResponse(response.data);
            
            if (parsedData.success && parsedData.investigationsHistory) {
                return parsedData.investigationsHistory;
            }
            return [];
        } catch (error) {
            console.error("❌ Error fetching investigations history:", error);
            return [];
        }
    },

    /**
     * Fetch patient's prescription history
     */
    fetchPrescriptionHistory: async (patientId: string): Promise<any[]> => {
        try {
            const response = await apiClient.post('/patient-data', {
                action: "getPrescriptionHistory",
                patientId: patientId,
            });
            const parsedData = parseResponse(response.data);
            
            // Note: The Lambda returns prescriptions inside the `clinicalHistory` key
            if (parsedData.success && parsedData.clinicalHistory) {
                return parsedData.clinicalHistory;
            }
            return [];
        } catch (error) {
            console.error("❌ Error fetching prescription history:", error);
            return [];
        }
    },

    /**
     * Saves a generated fitness certificate to the backend for persistence.
     * This is a "fire-and-forget" operation mirroring the native app.
     */
    saveFitnessCertificate: async (patientId: string, certificateData: Partial<FitnessCertificateFormData>): Promise<boolean> => {
        if (!ENABLE_CLOUD_SYNC) {
            console.log("☁️ Cloud sync disabled via feature flag");
            return false;
        }

        try {
            const payload = {
                action: "saveFitnessCertificate",
                patientId: patientId,
                data: {
                    certificateId: certificateData.certificateId || `CERT_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    type: "fitness_certificate",
                    ...certificateData
                }
            };

            const response = await apiClient.post('/patient-data', payload);
            const parsed = parseResponse(response.data);
            return !!parsed.success;
        } catch (error) {
            console.error("❌ Error syncing certificate to cloud:", error);
            return false;
        }
    },

    /**
     * Retrieves the history of fitness certificates for a patient.
     */
    getFitnessCertificateHistory: async (patientId: string): Promise<FitnessCertificateFormData[]> => {
        if (!ENABLE_CLOUD_SYNC) return [];

        try {
            const response = await apiClient.post('/patient-data', {
                action: "getFitnessCertificates",
                patientId: patientId
            });
            const parsed = parseResponse(response.data);
            
            if (parsed.success && Array.isArray(parsed.certificates)) {
                return parsed.certificates;
            }
            return [];
        } catch (error) {
            console.error("❌ Error fetching certificate history:", error);
            return [];
        }
    }
};
