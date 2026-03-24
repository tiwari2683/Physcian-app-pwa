import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../controllers/hooks/hooks';
import { createNewPatient } from '../../controllers/slices/patientSlice';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const NewPatientRegistration = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.patients);

  // Exact same field names as native app's basic.tsx state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'Male',
    mobile: '',
    address: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    age: '',
    mobile: ''
  });

  const validate = (): boolean => {
    const newErrors = { name: '', age: '', mobile: '' };
    let valid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter the patient\'s full name.';
      valid = false;
    }

    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
      newErrors.age = 'Please enter a valid age.';
      valid = false;
    }

    if (!formData.mobile) {
      newErrors.mobile = 'Mobile number is required.';
      valid = false;
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit Indian mobile number (starts with 6–9).';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      age: parseInt(formData.age, 10),
      sex: formData.sex as 'Male' | 'Female' | 'Other',
      mobile: formData.mobile,
      address: formData.address
    };

    const resultAction = await dispatch(createNewPatient(payload));
    if (createNewPatient.fulfilled.match(resultAction)) {
      navigate('/patients');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patients')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">New Patient Registration</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 font-medium"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Registering…
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Register Patient
            </>
          )}
        </button>
      </div>

      {/* Backend error */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <p className="text-blue-800 text-sm font-medium leading-relaxed">
            This creates the patient's core profile. Clinical data, diagnoses, and prescriptions
            are added during a visit — select this patient from the directory and click
            <strong> "Start Consultation / Visit"</strong>.
          </p>
        </div>

        <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Basic Details</h2>

        <div className="space-y-5">

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => {
                setFormData({ ...formData, name: e.target.value });
                if (e.target.value.trim()) setErrors({ ...errors, name: '' });
              }}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
              }`}
              placeholder="Enter patient's full name"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Age */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Age</label>
            <input
              type="number"
              min={0}
              max={130}
              value={formData.age}
              onChange={e => {
                setFormData({ ...formData, age: e.target.value });
                if (e.target.value) setErrors({ ...errors, age: '' });
              }}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                errors.age ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
              }`}
              placeholder="Enter patient's age"
            />
            {errors.age && <p className="text-xs text-red-600 mt-1">{errors.age}</p>}
          </div>

          {/* Mobile Number * */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Mobile Number *</label>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                value={formData.mobile}
                onChange={e => {
                  const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile: clean });

                  if (!clean) {
                    setErrors({ ...errors, mobile: '' });
                  } else if (!/^[6-9]/.test(clean)) {
                    setErrors({ ...errors, mobile: 'Indian numbers must start with 6, 7, 8, or 9.' });
                  } else if (clean.length < 10) {
                    setErrors({ ...errors, mobile: `${clean.length}/10 digits — must be exactly 10.` });
                  } else {
                    setErrors({ ...errors, mobile: '' });
                  }
                }}
                maxLength={10}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition pr-16 ${
                  errors.mobile ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
                }`}
                placeholder="Enter patient's 10-digit mobile number"
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold ${
                formData.mobile.length === 10 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {formData.mobile.length}/10
              </span>
            </div>
            {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Enter patient's address"
              rows={3}
            />
          </div>

          {/* Sex — radio buttons matching native app layout */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Sex</label>
            <div className="flex items-center gap-6">
              {(['Male', 'Female', 'Other'] as const).map(option => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setFormData({ ...formData, sex: option })}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      formData.sex === option ? 'border-blue-600' : 'border-gray-400'
                    }`}
                  >
                    {formData.sex === option && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <span
                    className="text-sm text-gray-700"
                    onClick={() => setFormData({ ...formData, sex: option })}
                  >
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
