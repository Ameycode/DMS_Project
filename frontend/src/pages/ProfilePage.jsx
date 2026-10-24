import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  User, 
  Mail, 
  Phone, 
  Car, 
  ShieldCheck, 
  CheckCircle2, 
  Save, 
  AlertCircle 
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [evModel, setEvModel] = useState(user?.ev_model || '');
  const [connector, setConnector] = useState(user?.compatible_connector || 'CCS2');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await api.updateProfile({
        full_name: fullName,
        phone,
        ev_model: evModel,
        compatible_connector: connector
      });

      if (res.success) {
        setSavedSuccess(true);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
    } catch (err) {
      setError(err.message || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-md text-xl font-bold">
            {fullName ? fullName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {fullName}
            </h1>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="inline-block mt-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              ROLE: {user?.role}
            </span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile changes updated successfully in the MySQL users table!</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleUpdate} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4 text-xs">
        <h3 className="font-bold text-sm text-slate-900">Vehicle Specifications & Contact Details</h3>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email (Immutable)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-500 cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              Registered EV Car
            </label>
            <input
              type="text"
              value={evModel}
              onChange={(e) => setEvModel(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Compatible Connector Standard
            </label>
            <select
              value={connector}
              onChange={(e) => setConnector(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
            >
              <option value="CCS2">CCS2 (DC Fast Charge)</option>
              <option value="Type 2">Type 2 (AC Single/Three Phase)</option>
              <option value="CHAdeMO">CHAdeMO (DC)</option>
              <option value="GB/T">GB/T</option>
              <option value="Tesla">Tesla NACS</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

    </div>
  );
}
