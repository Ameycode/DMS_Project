import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Wrench, 
  MapPin, 
  Cpu, 
  Zap, 
  BatteryCharging, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Plus,
  Check
} from 'lucide-react';
import { getStatusBadge } from '../components/ChargerPortCard';

export default function OperatorPortalPage() {
  const [ports, setPorts] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [selectedPortId, setSelectedPortId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [reporting, setReporting] = useState(false);

  const fetchOperatorData = async () => {
    setLoading(true);
    try {
      const [portsRes, sessionsRes, maintRes] = await Promise.all([
        api.getPorts(),
        api.getActiveSessions(),
        api.getMaintenance('?status=OPEN')
      ]);

      if (portsRes.success) setPorts(portsRes.ports || []);
      if (sessionsRes.success) setActiveSessions(sessionsRes.active_sessions || []);
      if (maintRes.success) setMaintenanceTickets(maintRes.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperatorData();
  }, []);

  const handleStatusChange = async (portId, newStatus) => {
    try {
      await api.updatePortStatus(portId, newStatus);
      fetchOperatorData();
    } catch (err) {
      alert(err.message || 'Status override failed.');
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!selectedPortId || !issueDescription) return;
    setReporting(true);
    try {
      await api.reportMaintenance({
        port_id: parseInt(selectedPortId, 10),
        issue_description: issueDescription,
        severity
      });
      alert('Maintenance ticket opened in MySQL. Port status set to MAINTENANCE by database trigger.');
      setIssueDescription('');
      fetchOperatorData();
    } catch (err) {
      alert(err.message || 'Failed to report defect.');
    } finally {
      setReporting(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    const notes = prompt('Enter resolution notes / repair details:', 'Defect repaired and certified functional.');
    if (!notes) return;

    try {
      await api.resolveMaintenance(ticketId, notes);
      alert('Ticket resolved. Port operational status restored to AVAILABLE.');
      fetchOperatorData();
    } catch (err) {
      alert(err.message || 'Failed to resolve ticket.');
    }
  };

  return (
    <div className="space-y-8 py-6">
      
      {/* Operator Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              STATION OPERATOR CONSOLE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-600" />
            Port Monitoring & Defect Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Direct hardware supervision, active charging sessions, and maintenance ticketing.
          </p>
        </div>

        <button
          onClick={fetchOperatorData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Status
        </button>
      </div>

      {/* Active Charging Sessions Monitor */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-amber-600" />
            Live Active Charging Sessions ({activeSessions.length} in progress)
          </h2>
          <span className="text-xs font-mono text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            Real-time Metering Active
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            No live active charging sessions right now. All dispensers are idle or reserved.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-2 text-xs">
                <div className="flex justify-between items-start font-mono">
                  <span className="font-bold text-slate-900">{s.session_code}</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] animate-pulse">
                    CHARGING
                  </span>
                </div>
                <div className="text-slate-700 font-medium">
                  {s.station_name} ➔ <strong className="text-emerald-700">{s.charger_code}</strong> ➔ <strong className="text-slate-900">{s.port_code}</strong> ({s.connector_type})
                </div>
                <div className="flex justify-between text-slate-500 font-mono text-[11px] pt-1 border-t border-amber-100">
                  <span>Customer: {s.customer_name} ({s.customer_phone})</span>
                  <span>Start: {s.meter_start_kwh} kWh</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Defect Form & Open Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Defect Form */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-rose-600" />
            Report Hardware Defect
          </h3>
          <p className="text-xs text-slate-500">
            Filing a defect automatically triggers a database action to set the physical port to <strong>MAINTENANCE</strong>.
          </p>

          <form onSubmit={handleReportIssue} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Defective Port</label>
              <select
                required
                value={selectedPortId}
                onChange={(e) => setSelectedPortId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono"
              >
                <option value="">Choose Port...</option>
                {ports.map((p) => (
                  <option key={p.port_id} value={p.port_id}>
                    {p.port_code} ({p.charger_code} @ {p.station_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
              >
                <option value="LOW">LOW (Cosmetic / Cable loose)</option>
                <option value="MEDIUM">MEDIUM (Lock latch intermittent)</option>
                <option value="HIGH">HIGH (Handshake protocol failure)</option>
                <option value="CRITICAL">CRITICAL (Emergency stop tripped)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Description</label>
              <textarea
                required
                rows={3}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe failure code, mechanical issue, or error message..."
                className="w-full p-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={reporting}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              {reporting ? 'Logging Defect...' : 'Flag Port & Open Ticket'}
            </button>
          </form>
        </div>

        {/* Open Tickets List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Open Maintenance Tickets ({maintenanceTickets.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">Requires Field Resolution</span>
          </div>

          {maintenanceTickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No open maintenance tickets. All ports operational.
            </div>
          ) : (
            <div className="space-y-3">
              {maintenanceTickets.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        {t.port_code}
                      </span>
                      <span className="font-semibold text-slate-800">{t.station_name}</span>
                      <span className="text-[10px] font-bold text-rose-700 border border-rose-300 px-1.5 py-0.2 rounded font-mono">
                        {t.severity}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium">{t.issue_description}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Reported: {new Date(t.reported_at).toLocaleString()} by {t.reporter_name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleResolveTicket(t.id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Resolved
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Port Operational Status Controller Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">Direct Port Status Control Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Port</th>
                <th className="py-3 px-4">Parent Charger</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Connector & Power</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Operator Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ports.map((p) => {
                const badge = getStatusBadge(p.current_status);
                return (
                  <tr key={p.port_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.port_code}</td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{p.charger_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{p.station_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.connector_type} • {p.max_power_kw}kW</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={p.current_status}
                        onChange={(e) => handleStatusChange(p.port_id, e.target.value)}
                        className="text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700"
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="RESERVED">RESERVED</option>
                        <option value="CHARGING">CHARGING</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="UNAVAILABLE">UNAVAILABLE</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
