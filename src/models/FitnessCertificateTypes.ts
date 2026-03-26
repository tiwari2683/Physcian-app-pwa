/**
 * Type definitions for Fitness Certificate feature
 * Replicated from React Native implementation for PWA parity
 */

/**
 * Enhanced Patient interface for Fitness Certificate
 * Note: PWA's base Patient model is simpler, so we use this comprehensive version
 * for the Fitness Certificate logic which depends on these fields.
 */
export interface FitnessCertificatePatient {
    name: string;
    age: number;
    sex: string;
    patientId: string;
    diagnosis: string;
    treatment: string;
    prescription: string;
    advisedInvestigations: string;
    medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        datePrescribed?: string;
        timing?: string;
        unit?: string;
        timingValues?: string;
    }>;
    reportFiles: Array<{
        name: string;
        url: string;
        type: string;
    }>;
    createdAt: string;
    updatedAt: string;
    reports: string;
    medicalHistory?: string;
    generatedPrescription?: string;
}

/**
 * Diagnosis history entry
 */
export interface DiagnosisHistoryEntry {
    patientId: string;
    entryId: string;
    timestamp: number;
    date: string;
    diagnosis: string;
    advisedInvestigations: string;
    formattedDate?: string;
    formattedTime?: string;
}

/**
 * Investigations history entry
 */
export interface InvestigationsHistoryEntry {
    patientId: string;
    entryId: string;
    timestamp: number;
    date: string;
    advisedInvestigations: string;
    formattedDate?: string;
    formattedTime?: string;
}

/**
 * Opinion type for medical opinion section
 */
export type OpinionType = "surgery_fitness" | "medication_modification" | "fitness_reserved" | null;

/**
 * Form data interface - represents all certificate form fields
 */
export interface FitnessCertificateFormData {
    // Patient basic info
    patientName: string;
    patientAge: string;
    patientSex: string;
    patientId: string;

    // Medical Opinion
    opinion: string;
    selectedOpinionType: OpinionType;
    surgeryFitnessOption: string;
    medicationModificationText: string;
    fitnessReservedText: string;

    // Clinical Assessment
    pastHistory: string;
    cardioRespiratorySymptoms: string;

    // Vitals
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    respiratoryRate: string;
    oxygenSaturation: string;

    // Investigations
    ecgFindings: string;
    echoFindings: string;
    cxrFindings: string;
    labValues: string;

    // Additional Notes
    recommendations: string;
    followUpRequired: boolean;
    validityPeriod: string;

    // New fields
    preOpEvaluationForm: string;
    referredForPreOp: string;
    cardioRespiratoryFunction: string;
    syE: string;
    ecgField: string;
    echoField: string;
    cxrField: string;

    // Latest prescription and investigations
    latestPrescription: string;
    latestInvestigations: string;

    // Certificate metadata
    certificateId?: string;
    createdAt?: string;

    // History card extras
    doctorName?: string;
}
