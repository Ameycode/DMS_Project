import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Layers, 
  Search, 
  MapPin, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  HelpCircle,
  Database,
  ArrowRight,
  Filter
} from 'lucide-react';
import { getStatusBadge } from '../components/ChargerPortCard';

export default function ChargerPortMappingPage() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [connectorFilter, setConnectorFilter] = useState('');

  // Reverse query demo: "Which charger owns this port?"
  const [reversePortQuery, setReversePortQuery] = useState('');
  const [reverseResult, setReverseResult] = useState(null);

  useEffect(() => {
    fetchMapping();
  }, []);

  const fetchMapping = async () => {
    setLoading(true);
    try {
      const res = await api.getChargerPortMapping();
      if (res.success) {
        setMappings(res.mapping || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMappings = mappings.filter((item) => {
    const matchesSearch = 
      item.port_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.charger_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.charger_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.station_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStation = selectedStation ? item.station_name === selectedStation : true;
    const matchesConnector = connectorFilter ? item.connector_type === connectorFilter : true;

    return matchesSearch && matchesStation && matchesConnector;
  });

  const uniqueStations = [...new Set(mappings.map(m => m.station_name))];

  const handleReverseLookup = (e) => {
    e.preventDefault();
    if (!reversePortQuery) return;
    const found = mappings.find(
      m => m.port_code.toLowerCase() === reversePortQuery.trim().toLowerCase()
    );
    setReverseResult(found || 'NOT_FOUND');
  };

  return (
    <div className="space-y-8 py-6">
      
      {/* Primary Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              Sourced from Database View: <code className="font-mono text-emerald-900 font-bold">v_charger_port_mapping</code>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Charger-to-Port Ownership & Relational Mapping
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Inspect physical foreign key dependencies between Station locations, Charger cabinets, and individual Dispensing Ports.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono space-y-1 self-start">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">Database Invariant</span>
            <div className="text-emerald-700 font-bold">1 Station : N Chargers</div>
            <div className="text-emerald-700 font-bold">1 Charger : N Physical Ports</div>
          </div>
        </div>

        {/* Reverse Query Interactive Tool: "Which charger owns this port?" */}
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Examiner Query: "Which Charger and Station owns this Port?"</h3>
          </div>
          <form onSubmit={handleReverseLookup} className="flex flex-wrap sm:flex-nowrap gap-2 max-w-xl">
            <input
              type="text"
              value={reversePortQuery}
              onChange={(e) => setReversePortQuery(e.target.value)}
              placeholder="e.g. PORT-002, PORT-007, PORT-014"
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder:text-slate-500 focus:outline-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              Resolve Ownership
            </button>
          </form>

          {reverseResult && reverseResult !== 'NOT_FOUND' && (
            <div className="bg-emerald-900/60 border border-emerald-500/40 rounded-xl p-3.5 text-xs space-y-1 text-emerald-100 font-mono animate-in fade-in">
              <span className="font-bold text-white block">Ownership Resolved via Database Join:</span>
              <div>Port Code: <strong className="text-emerald-300">{reverseResult.port_code}</strong> ({reverseResult.connector_type} • {reverseResult.port_max_power_kw} kW)</div>
              <div>Parent Charger Cabinet: <strong className="text-white">{reverseResult.charger_code}</strong> ({reverseResult.charger_label} • {reverseResult.charger_max_power_kw} kW)</div>
              <div>Station: <strong className="text-white">{reverseResult.station_name}</strong> [{reverseResult.station_code}], {reverseResult.station_city}</div>
            </div>
          )}

          {reverseResult === 'NOT_FOUND' && (
            <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 font-mono">
              Port ID not found in database records. Please verify code.
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search port, charger code, or station..."
            className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 bg-white"
          >
            <option value="">All Stations</option>
            {uniqueStations.map(stn => (
              <option key={stn} value={stn}>{stn}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={connectorFilter}
            onChange={(e) => setConnectorFilter(e.target.value)}
            className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 bg-white"
          >
            <option value="">All Connector Standards</option>
            <option value="CCS2">CCS2</option>
            <option value="Type 2">Type 2</option>
            <option value="CHAdeMO">CHAdeMO</option>
            <option value="GB/T">GB/T</option>
          </select>
        </div>
      </div>

      {/* Relational Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Complete Relational Hierarchy Mapping Table
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {filteredMappings.length} Mapped Port Dispensers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Port Code & ID</th>
                <th className="py-3 px-4">Parent Charger Cabinet</th>
                <th className="py-3 px-4">Station Location</th>
                <th className="py-3 px-4">Connector Type</th>
                <th className="py-3 px-4">Port Power</th>
                <th className="py-3 px-4">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Loading view data...
                  </td>
                </tr>
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No mapping records match the criteria.
                  </td>
                </tr>
              ) : (
                filteredMappings.map((row) => {
                  const badge = getStatusBadge(row.port_status);
                  const BadgeIcon = badge.icon;

                  return (
                    <tr key={row.port_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {row.port_code}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-1 font-normal">
                          Gun #{row.port_number} (Port #{row.port_id})
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            {row.charger_code}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800 text-xs block mt-0.5">
                          {row.charger_label}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Rating: {row.charger_max_power_kw} kW ({row.charger_technology})
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{row.station_name}</span>
                        <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {row.station_city} [{row.station_code}]
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                          {row.connector_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {row.port_max_power_kw} kW
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
