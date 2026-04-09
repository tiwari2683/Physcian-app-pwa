import React, { useState } from 'react';
import { useAppSelector } from '../../../controllers/hooks/hooks';
import { apiClient } from '../../../services/api/apiClient';
import type { RootState } from '../../../controllers/store';

export default function SuperAdminDashboard() {
  const user = useAppSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form State
  const [clinicName, setClinicName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleOnboardClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/patient-data', {
        action: 'onboardClinic',
        clinicName,
        adminEmail,
        adminName
      });

      if (response.data.success) {
        setMessage(`✅ Success! ${clinicName} created. Temp password emailed to ${adminEmail}.`);
        setClinicName('');
        setAdminEmail('');
        setAdminName('');
      } else {
        setMessage(`❌ Error: ${response.data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Network Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Portal</h1>
        <p className="text-gray-600 mb-8">Welcome, {user?.name}. Manage your SaaS clinics below.</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4">Onboard New Clinic</h2>
          <p className="text-sm text-gray-500 mb-6">
            This will generate a secure Tenant ID, allocate a database partition, and email a temporary password to the new Doctor.
          </p>

          <form onSubmit={handleOnboardClinic} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Clinic Name</label>
              <input
                required
                type="text"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., City General Hospital"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Doctor's Name</label>
                <input
                  required
                  type="text"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Dr. Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Doctor's Email (Login ID)</label>
                <input
                  required
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-4"
            >
              {loading ? 'Provisioning Infrastructure...' : 'Provision Clinic & Send Invite'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-4 rounded-md ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
