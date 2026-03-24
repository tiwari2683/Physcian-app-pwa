import { apiClient } from './apiClient';
import type { Appointment } from '../../models';

const parseResponse = (data: any) => {
  return data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
};

export const appointmentService = {
  getAppointments: async (): Promise<Appointment[]> => {
    const response = await apiClient.get('/appointments');
    const parsed = parseResponse(response.data);
    return parsed || [];
  },

  createAppointment: async (appointmentData: Partial<Appointment>): Promise<Appointment> => {
    const response = await apiClient.post('/appointments', appointmentData);
    const parsed = parseResponse(response.data);
    return parsed;
  }
};
