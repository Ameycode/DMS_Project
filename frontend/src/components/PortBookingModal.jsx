import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  X, 
  Calendar, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Calculator,
  ArrowRight
} from 'lucide-react';

export default function PortBookingModal({ 
  port, 
  charger, 
  station, 
  onClose, 
  onSuccess 
}) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d.toISOString().slice(0, 10);
  });
  
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d.toTimeString().slice(0, 5);
  });

  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [availabilityWarning, setAvailabilityWarning] = useState(null);

  // Default tariffs
  const tariffRate = 18.00;
  const serviceFee = 20.00;
  const gstPct = 18.00;

  // Compute intervals
  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  // Power rating & estimated kWh
  const powerKw = port?.max_power_kw || 60;
  // EV charging curve average factor 0.75
  const estimatedKwh = +((powerKw * (durationMinutes / 60)) * 0.75).toFixed(2);
  const energyCharge = +(estimatedKwh * tariffRate).toFixed(2);
  const taxAmount = +((energyCharge + serviceFee) * (gstPct / 100)).toFixed(2);
  const estimatedTotal = +(energyCharge + serviceFee + taxAmount).toFixed(2);

  // Pre-check availability when time changes
  useEffect(() => {
    if (port && !isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
      api.checkAvailability(port.id || port.port_id, startDateTime.toISOString(), endDateTime.toISOString())
        .then(res => {
          if (res.available) {
            setAvailabilityWarning(null);
          } else {
            setAvailabilityWarning('Warning: A conflict exists on this port for the chosen interval.');
          }
        })
        .catch(() => {});
    }
  }, [date, startTime, durationMinutes, port]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        port_id: port.id || port.port_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        estimated_kwh: estimatedKwh
      };

      const res = await api.createBooking(payload);
      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        if (onSuccess) onSuccess(res.booking);
      }
    } catch (err) {
      setError(err.message || 'Booking transaction failed.');
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
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Book Charging Slot</h3>
              <p className="text-xs text-slate-400">
                Port: <span className="text-emerald-400 font-mono font-bold">{port.port_code}</span> on Dispenser <span className="text-white font-mono font-bold">{charger.charger_code}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {confirmedBooking ? (
            /* Booking Confirmation View */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">Reservation Confirmed!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Database transaction committed with pessimistic lock.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Booking Reference:</span>
                  <span className="font-bold text-emerald-700">{confirmedBooking.booking_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Station:</span>
                  <span className="font-medium text-slate-800">{station?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Parent Charger:</span>
                  <span className="font-bold text-slate-800">{charger?.charger_code} ({charger?.label})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Port:</span>
                  <span className="font-bold text-emerald-700">{port?.port_code} ({port?.connector_type} • {port?.max_power_kw}kW)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Time:</span>
                  <span className="text-slate-800">{new Date(confirmedBooking.start_time).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Total:</span>
                  <span className="font-bold text-slate-900">₹{confirmedBooking.estimated_cost}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              
              {/* Hierarchy Summary Banner */}
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-emerald-900">Assigned Dispenser Unit</span>
                  <span className="text-slate-600">
                    {station?.name} ➔ {charger.charger_code} ➔ <strong className="text-emerald-800">{port.port_code}</strong>
                  </span>
                </div>
                <span className="font-mono bg-white px-2 py-1 rounded text-emerald-700 font-bold border border-emerald-200">
                  {port.connector_type} • {port.max_power_kw} kW
                </span>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Transaction Aborted:</span>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Warning Notice */}
              {availabilityWarning && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{availabilityWarning}</span>
                </div>
              )}

              {/* Date & Start Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Duration Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Charging Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        durationMinutes === mins
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              {/* Tariff & Cost Calculator Breakdown */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Estimated Energy Consumed:</span>
                  <span className="font-mono font-medium text-slate-800">~{estimatedKwh} kWh</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Energy Rate (₹{tariffRate}/kWh):</span>
                  <span className="font-mono font-medium text-slate-800">₹{energyCharge}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Station Service Fee:</span>
                  <span className="font-mono font-medium text-slate-800">₹{serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Applicable GST (18%):</span>
                  <span className="font-mono font-medium text-slate-800">₹{taxAmount}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-900 font-bold">
                  <span>Estimated Total Amount:</span>
                  <span className="text-base font-mono text-emerald-700">₹{estimatedTotal}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Acquiring Lock & Booking...</span>
                  ) : (
                    <>
                      <span>Confirm Reservation</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
