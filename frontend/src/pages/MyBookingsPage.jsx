import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SimulatedMeterModal from '../components/SimulatedMeterModal';
import InvoiceModal from '../components/InvoiceModal';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Zap, 
  BatteryCharging, 
  Receipt, 
  XCircle, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [activeSessionBooking, setActiveSessionBooking] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getMyBookings();
      if (res.success) {
        setBookings(res.bookings || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this charging slot reservation?')) {
      return;
    }

    try {
      const res = await api.cancelBooking(bookingId, 'Customer requested cancellation via portal');
      if (res.success) {
        fetchBookings();
      }
    } catch (err) {
      alert(err.message || 'Cancellation rejected.');
    }
  };

  const handleOpenInvoice = async (billId) => {
    try {
      const res = await api.getBillById(billId);
      if (res.success) {
        setViewInvoice(res.invoice);
      }
    } catch (err) {
      alert(err.message || 'Failed to load invoice.');
    }
  };

  return (
    <div className="space-y-6 py-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            My Charging Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your port time slots, start simulated EV charging sessions, and download invoices.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-xs text-slate-500">Retrieving booking records...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">No reservations found</h3>
          <p className="text-xs text-slate-400">You haven't booked any charging ports yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const isActive = b.status === 'ACTIVE';
            const isCompleted = b.status === 'COMPLETED';
            const isCancelled = b.status === 'CANCELLED';

            return (
              <div 
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Info Area */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {b.booking_reference}
                    </span>
                    
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isConfirmed ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      isActive ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                      isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {b.status}
                    </span>

                    {b.invoice_number && (
                      <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Invoice: {b.invoice_number} ({b.payment_status})
                      </span>
                    )}
                  </div>

                  {/* Relational Mapping Hierarchy line */}
                  <div className="text-xs text-slate-800 font-semibold flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{b.station_name}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-mono">Charger: {b.charger_code} ({b.charger_label})</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-emerald-700 font-mono font-bold">Port: {b.port_code} ({b.connector_type} • {b.max_power_kw}kW)</span>
                  </div>

                  {/* Timestamps */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Slot: {new Date(b.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} ➔ {new Date(b.end_time).toLocaleTimeString([], { timeStyle: 'short' })}
                    </span>
                    <span>•</span>
                    <span>Est. Cost: ₹{b.estimated_cost}</span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Start Charging Simulator */}
                  {(isConfirmed || isActive) && (
                    <button
                      onClick={() => setActiveSessionBooking(b)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <BatteryCharging className="w-4 h-4" />
                      {isActive ? 'Continue Meter Simulator' : 'Start Simulated Charging'}
                    </button>
                  )}

                  {/* Cancel Button */}
                  {isConfirmed && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Cancel Slot
                    </button>
                  )}

                  {/* View Invoice */}
                  {b.bill_id && (
                    <button
                      onClick={() => handleOpenInvoice(b.bill_id)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Receipt className="w-4 h-4" />
                      View Tax Invoice
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Simulated Meter Modal */}
      {activeSessionBooking && (
        <SimulatedMeterModal
          booking={activeSessionBooking}
          session={activeSessionBooking.session_id ? { id: activeSessionBooking.session_id, session_status: activeSessionBooking.session_status, meter_start_kwh: activeSessionBooking.meter_start_kwh } : null}
          onClose={() => setActiveSessionBooking(null)}
          onSessionUpdated={() => {
            fetchBookings();
            setActiveSessionBooking(null);
          }}
        />
      )}

      {/* Invoice Modal */}
      {viewInvoice && (
        <InvoiceModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          onPaymentComplete={() => {
            fetchBookings();
          }}
        />
      )}

    </div>
  );
}
