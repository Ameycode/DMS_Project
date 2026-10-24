import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChargerPortCard from '../components/ChargerPortCard';
import PortBookingModal from '../components/PortBookingModal';
import { 
  MapPin, 
  ArrowLeft, 
  Clock, 
  Phone, 
  Layers, 
  Star, 
  Zap, 
  Cpu, 
  ShieldCheck, 
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function StationDetailPage({ stationId, setActivePage }) {
  const { user } = useAuth();
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Modal State
  const [selectedPort, setSelectedPort] = useState(null);
  const [selectedCharger, setSelectedCharger] = useState(null);

  // Detail Inspector Modal State
  const [inspectPort, setInspectPort] = useState(null);

  // Review Form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchStationDetails = async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await api.getStationById(stationId);
      if (res.success) {
        setStation(res.station);
      }
    } catch (err) {
      setError(err.message || 'Failed to load station details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStationDetails();
  }, [stationId]);

  const handleUpdatePortStatus = async (portId, status) => {
    try {
      await api.updatePortStatus(portId, status);
      fetchStationDetails();
    } catch (err) {
      alert(err.message || 'Status update failed.');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit a rating.');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.submitFeedback({
        station_id: stationId,
        rating: reviewRating,
        comment: reviewComment
      });
      setReviewComment('');
      fetchStationDetails();
    } catch (err) {
      alert(err.message || 'Feedback submission failed.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Querying Station ➔ Charger ➔ Port relational tree...</p>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl max-w-md mx-auto text-xs text-rose-700">
          {error || 'Station record not found.'}
        </div>
        <button
          onClick={() => setActivePage('stations')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Station Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      
      {/* Top Breadcrumb & Back Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActivePage('stations')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Station Directory
        </button>

        <span className="text-xs font-mono text-slate-400">
          Database ID: #{station.id} • Code: {station.station_code}
        </span>
      </div>

      {/* Station Overview Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                {station.station_code}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {station.operational_status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {station.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              {station.address}, {station.city}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-xs text-slate-400">Operating Schedule</span>
            <span className="text-sm font-bold font-mono text-slate-800 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {station.opening_time?.slice(0, 5)} - {station.closing_time?.slice(0, 5)}
            </span>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {station.contact_number}
            </span>
          </div>
        </div>

        {/* Visual Hierarchy Explanation Banner */}
        <div className="bg-emerald-900 text-emerald-100 rounded-2xl p-4 text-xs space-y-1 shadow-xs">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            Active Dispenser Hierarchy at this Station
          </div>
          <p className="text-emerald-200 leading-relaxed text-[11px]">
            Every card below represents a <strong>physical charger cabinet</strong> situated at {station.name}. Inside each charger cabinet card are its <strong>individual physical dispensing ports</strong>. Click "Book This Port" on any available port to reserve your time slot.
          </p>
        </div>
      </div>

      {/* Chargers and Their Ports Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600" />
            Physical Chargers ({station.chargers?.length || 0} Installed)
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Total Ports: {station.chargers?.reduce((acc, c) => acc + (c.ports?.length || 0), 0) || 0}
          </span>
        </div>

        {/* List of Charger Cards */}
        <div className="space-y-6">
          {station.chargers && station.chargers.length > 0 ? (
            station.chargers.map((chg) => (
              <ChargerPortCard
                key={chg.charger_id || chg.id}
                charger={chg}
                station={station}
                userRole={user?.role}
                onBookPort={(port, charger) => {
                  setSelectedPort(port);
                  setSelectedCharger(charger);
                }}
                onViewPortDetails={(port, charger) => {
                  setInspectPort({ port, charger });
                }}
                onUpdatePortStatus={handleUpdatePortStatus}
              />
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              No chargers currently mapped to this station in the database.
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews & Feedback */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Customer Feedback & Station Ratings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Reviews submitted by authenticated drivers</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {station.feedback?.length || 0} Reviews
          </span>
        </div>

        {/* Submit Review Box */}
        {user ? (
          <form onSubmit={handleSubmitReview} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Rate Your Charging Experience:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                  >
                    <Star className={`w-5 h-5 ${star <= reviewRating ? 'fill-amber-400 text-amber-500' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              required
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="How was the charger speed, connector health, or parking space?"
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-emerald-500 bg-white"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingReview ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Please log in as an EV Customer to submit a rating and feedback.
          </div>
        )}

        {/* Existing Reviews List */}
        <div className="space-y-3">
          {station.feedback && station.feedback.length > 0 ? (
            station.feedback.map((f) => (
              <div key={f.id} className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{f.customer_name}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(f.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600">{f.comment}</p>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No feedback submitted yet for this station.</p>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {selectedPort && selectedCharger && (
        <PortBookingModal
          port={selectedPort}
          charger={selectedCharger}
          station={station}
          onClose={() => {
            setSelectedPort(null);
            setSelectedCharger(null);
          }}
          onSuccess={() => {
            fetchStationDetails();
          }}
        />
      )}

      {/* Detailed Port Inspection Modal */}
      {inspectPort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Relational Port Inspector</h3>
              <button onClick={() => setInspectPort(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg">
                <strong>Which charger owns this port?</strong><br />
                Charger: {inspectPort.charger.charger_code} ({inspectPort.charger.label})<br />
                Station: {station.name} [{station.station_code}]
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Port Code:</span>
                <span className="font-bold text-slate-800">{inspectPort.port.port_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Connector Type:</span>
                <span className="font-bold text-slate-800">{inspectPort.port.connector_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Maximum Power:</span>
                <span className="font-bold text-slate-800">{inspectPort.port.max_power_kw} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Current Operational Status:</span>
                <span className="font-bold text-emerald-700">{inspectPort.port.current_status}</span>
              </div>
            </div>

            <button
              onClick={() => setInspectPort(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
