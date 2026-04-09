// src/models/index.ts
import type { Clinic, ClinicStatus } from './ClinicTypes';

export type { Clinic, ClinicStatus };
export interface User {
  email: string;
  sub: string;
  name?: string;
  role: 'SuperAdmin' | 'Doctor' | 'Assistant';
  tenantId?: string;
  jwtToken?: string;
}

export interface Patient {
  patientId: string;
  tenantId: string; // REQUIRED now for multi-clinic
  name: string;
  age: number | string;
  sex: string;
  mobile: string;
  address?: string;
  medicalHistory?: string[];
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  advisedInvestigations?: string;
  reports?: string;
  medications?: any[];
  reportFiles?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  patientId?: string;
  tenantId: string; // REQUIRED now for multi-clinic
  patientName: string;
  age?: number | string;
  mobile?: string;
  sex?: string;
  address?: string;
  date: string;
  time: string;
  type: string;
  status: 'Upcoming' | 'Completed' | 'Canceled';
}

// ── Assistant Panel Specific Extensions ──────────────────────────────────────

export interface PatientBasic {
  fullName: string;
  age: string;
  mobileNumber: string;
  sex: 'Male' | 'Female' | 'Other';
  address: string;
}

export interface ClinicalVitals {
  inr?: string;
  hb?: string;
  wbc?: string;
  platelet?: string;
  bilirubin?: string;
  sgot?: string;
  sgpt?: string;
  alt?: string;
  tprAlb?: string;
  ureaCreat?: string;
  sodium?: string;
  fastingHbA1c?: string;
  pp?: string;
  tsh?: string;
  ft4?: string;
  others?: string;
  [key: string]: string | undefined;
}

export interface ClinicalData {
  historyText: string;
  reportNotes: string;
  vitals: ClinicalVitals;
  reports: any[];
}

export interface DiagnosisData {
  diagnosisText: string;
  selectedInvestigations: string[];
  customInvestigations: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

export interface VisitHistoryItem {
  timestamp: string;
  doctorName?: string;
  data: any;
}

// ── Shared Models ────────────────────────────────────────────────────────────

export interface Prescription {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  date: string;
  medicines: Medicine[];
  advice?: string;
  nextVisit?: string;
  pdfUrl?: string; // S3 Presigned URL
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
}

export interface Visit {
  visitId: string;
  patientId: string;
  tenantId: string; // REQUIRED now for multi-clinic
}

