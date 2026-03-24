// src/models/index.ts

export interface User {
  email: string;
  sub: string;
  name?: string;
  jwtToken?: string;
}

export interface Patient {
  patientId: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';   // matches DynamoDB & native app
  mobile: string;                       // matches DynamoDB & native app
  address?: string;
  medicalHistory?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  age?: number | string;
  mobile?: string;
  sex?: 'Male' | 'Female' | 'Other';
  address?: string;
  date: string;
  time: string;
  type: string;
  status: 'Upcoming' | 'Completed' | 'Canceled';
}

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
