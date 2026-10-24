import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  Zap, 
  X, 
  BatteryCharging, 
  CheckCircle2, 
  AlertCircle, 
  Gauge, 
  ArrowRight,
  TrendingUp,
  Receipt
} from 'lucide-react';

export default function SimulatedMeterModal({ 
  booking, 
  session, 
  onClose, 
  onSessionUpdated 
}) {
  const isStarting = !session || session.session_status !== 'IN_PROGRESS';
  
  const [meterStart, setMeterStart] = useState(session?.meter_start_kwh || '');
  const [meterEnd, setMeterEnd] = useState(
    session?.meter_start_kwh ? +(parseFloat(session.meter_start_kwh) + 26.50).toFixed(2) : 1226.50
  );
  
  const [chargingPercent, setChargingPercent] = useState(85);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedResult, setCompletedResult] = useState(null);

  const energyDelta = Math.max(0, +(meterEnd - meterStart).toFixed(2));
  const estimatedCost = +(energyDelta * 18.00 + 20.00 + (energyDelta * 18.00 + 20.00) * 0.18).toFixed(2);

  const handleStartSession = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.startSession({
        booking_id: booking.id,
        meter_start_kwh: parseFloat(meterStart)
      });
      if (res.success) {
        if (onSessionUpdated) onSessionUpdated();
      }
    } catch (err) {
      setError(err.message || 'Failed to start session.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (parseFloat(meterEnd) < parseFloat(meterStart)) {
      setError('Integrity Violation: Final meter reading cannot be lower than start meter reading.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.completeSession(session.id, parseFloat(meterEnd));
      if (res.success) {
        setCompletedResult(res.data);
        if (onSessionUpdated) onSessionUpdated();
      }
    } catch (err) {
      setError(err.message || 'Failed to complete session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BatteryCharging className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Simulated EV Charging Session</h3>
              <p className="text-xs text-amber-400 font-mono">
                Hardware Meter Simulator (Demo Viva Mode)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Hardware & Relational Identification Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Booking Reference:</span>
              <span className="font-bold text-slate-800">{booking.booking_reference}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Assigned Physical Port:</span>
              <span className="font-bold text-emerald-700">{booking.port_code} ({booking.connector_type})</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Parent Charger Dispenser:</span>
              <span className="font-bold text-slate-800">{booking.charger_code} ({booking.charger_label})</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Execution Error:</span>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {completedResult ? (
            /* Session Completed Screen */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">Charging Complete & Invoiced!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Meter readings committed, port released, and invoice generated in MySQL.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-left space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-bold text-emerald-700">{completedResult.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Energy Delivered:</span>
                  <span className="font-bold text-slate-900">{completedResult.energy_consumed_kwh} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tariff Applied:</span>
                  <span>₹{completedResult.breakdown?.tariff_rate_per_kwh}/kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Energy Charges:</span>
                  <span>₹{completedResult.breakdown?.energy_charge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Fee + GST:</span>
                  <span>₹{(completedResult.breakdown?.service_fee + completedResult.breakdown?.tax_amount).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Total Amount Due:</span>
                  <span className="text-emerald-700">₹{completedResult.breakdown?.total_amount}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Close & View Invoices
              </button>
            </div>
          ) : isStarting ? (
            /* Start Session Form */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold block">Simulation Mode Note:</span>
                This panel simulates the energy meter reading of the EV dispenser hardware. Click "Commence Charging" to transition port status to <strong>CHARGING</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-slate-500" />
                  Initial Meter Reading (kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={meterStart}
                  onChange={(e) => setMeterStart(e.target.value)}
                  className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-amber-500"
                />
              </div>

              <button
                onClick={handleStartSession}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? 'Starting Simulation...' : 'Plug In & Commence Charging'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Active Session In Progress - Stop & Meter Form */
            <div className="space-y-4">
              
              {/* Battery SOC Simulation Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <BatteryCharging className="w-4 h-4 text-emerald-600" />
                    Simulated Vehicle Battery State of Charge (SoC)
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">{chargingPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${chargingPercent}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={chargingPercent}
                  onChange={(e) => {
                    const pct = parseInt(e.target.value, 10);
                    setChargingPercent(pct);
                    // Dynamically scale meter end
                    const simulatedAdded = +((pct - 20) * 0.45).toFixed(2);
                    setMeterEnd(+(parseFloat(meterStart) + simulatedAdded).toFixed(2));
                  }}
                  className="w-full mt-2 cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Meter readings grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Initial Meter (kWh)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={meterStart}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Final Meter Reading (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={meterEnd}
                    onChange={(e) => setMeterEnd(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Calculated Real-time Energy Formula Callout */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-emerald-900">Formula: Δ Energy = End − Start</span>
                  <span className="font-bold text-emerald-800">{energyDelta} kWh</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] text-slate-600">
                  <span>Est. Bill (₹18/kWh + fee + 18% GST):</span>
                  <span className="font-bold text-slate-900">₹{estimatedCost}</span>
                </div>
              </div>

              {/* Complete Session Action */}
              <button
                onClick={handleCompleteSession}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                {loading ? 'Finalizing Session & Generating Bill...' : 'Complete Session & Generate Bill'}
                <Receipt className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
