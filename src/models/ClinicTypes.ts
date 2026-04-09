export type ClinicStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

export interface Clinic {
  tenant_id: string;             // The unique AWS UUID for the clinic
  clinic_name: string;           // e.g., "City Care Clinic"
  subscription_expiry: string;   // ISO Date string (e.g., "2026-12-31T00:00:00.000Z")
  status: ClinicStatus;          // Billing status
  createdAt: string;
  updatedAt: string;
}