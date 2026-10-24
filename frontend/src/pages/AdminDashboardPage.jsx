import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  ShieldCheck, 
  MapPin, 
  Cpu, 
  Zap, 
  DollarSign, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Wrench, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Layers, 
  FileText,
  Activity
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AdminDashboardPage({ setActivePage, setSelectedStationId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Management data lists
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Forms
  const [newStation, setNewStation] = useState({
    station_code: '', name: '', address: '', city: 'Bengaluru', contact_number: '+91-80-11223344'
  });
  const [newCharger, setNewCharger] = useState({
    charger_code: '', station_id: '', label: '', technology_type: 'Fast DC', max_power_kw: 120
  });
  const [newPort, setNewPort] = useState({
    port_code: '', charger_id: '', port_number: 1, connector_type: 'CCS2', max_power_kw: 60
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, stationsRes, chargersRes, tariffsRes, maintRes, bookingsRes] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getStations(),
        api.getChargers(),
        api.getTariffs(),
        api.getMaintenance(),
        api.getAllBookings()
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes);
      if (stationsRes.success) setStations(stationsRes.stations || []);
      if (chargersRes.success) setChargers(chargersRes.chargers || []);
      if (tariffsRes.success) setTariffs(tariffsRes.tariffs || []);
      if (maintRes.success) setMaintenance(maintRes.records || []);
      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateStation = async (e) => {
    e.preventDefault();
    try {
      await api.createStation(newStation);
      alert('Station created successfully in MySQL.');
      setNewStation({ station_code: '', name: '', address: '', city: 'Bengaluru', contact_number: '+91-80-11223344' });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Error creating station.');
    }
  };

  const handleCreateCharger = async (e) => {
    e.preventDefault();
    try {
      await api.createCharger({
        ...newCharger,
        station_id: parseInt(newCharger.station_id, 10),
        max_power_kw: parseFloat(newCharger.max_power_kw)
      });
      alert('Charger created and mapped to parent station.');
      setNewCharger({ charger_code: '', station_id: '', label: '', technology_type: 'Fast DC', max_power_kw: 120 });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Error creating charger.');
    }
  };

  const handleCreatePort = async (e) => {
    e.preventDefault();
    try {
      await api.createPort({
        ...newPort,
        charger_id: parseInt(newPort.charger_id, 10),
        port_number: parseInt(newPort.port_number, 10),
        max_power_kw: parseFloat(newPort.max_power_kw)
      });
      alert('Port created and mapped to physical charger.');
      setNewPort({ port_code: '', charger_id: '', port_number: 1, connector_type: 'CCS2', max_power_kw: 60 });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Error creating port.');
    }
  };

  const summary = analytics?.summary || {};

  return (
    <div className="space-y-8 py-6">
      
      {/* Dashboard Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              ROLE: SYSTEM ADMINISTRATOR
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-600" />
            Central Management & DBMS Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live MySQL aggregate monitoring, relational CRUD mappings, tariff settings, and audit logs.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* 10 Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-medium block">Active Stations</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 mt-1 block">
            {summary.total_stations || 0}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> Operational Hubs
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-medium block">Physical Chargers</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 mt-1 block">
            {summary.total_chargers || 0}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <Cpu className="w-3 h-3" /> Cabinets Mapped
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-medium block">Total Dispenser Ports</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 mt-1 block">
            {summary.total_ports || 0}
          </span>
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3" /> Total Guns
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] text-emerald-800 font-medium block">Available Ports</span>
          <span className="text-2xl font-extrabold font-mono text-emerald-700 mt-1 block">
            {summary.available_ports || 0}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">Ready to Charge</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-[11px] text-blue-800 font-medium block">Reserved Ports</span>
          <span className="text-2xl font-extrabold font-mono text-blue-700 mt-1 block">
            {summary.reserved_ports || 0}
          </span>
          <span className="text-[10px] text-blue-600 font-medium block mt-1">Slots Booked</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] text-amber-800 font-medium block">Active Charging</span>
          <span className="text-2xl font-extrabold font-mono text-amber-700 mt-1 block">
            {summary.active_sessions || summary.charging_ports || 0}
          </span>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">Current Sessions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-medium block">Total Bookings</span>
          <span className="text-2xl font-extrabold font-mono text-slate-900 mt-1 block">
            {summary.total_bookings || 0}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Reservations Logged</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 shadow-2xs">
          <span className="text-[11px] text-emerald-900 font-medium block">Revenue Realized</span>
          <span className="text-xl font-extrabold font-mono text-emerald-800 mt-1 block">
            ₹{parseFloat(summary.total_revenue_collected || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium block mt-1">Paid Invoices</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-2xs">
          <span className="text-[11px] text-amber-900 font-medium block">Pending Receivables</span>
          <span className="text-xl font-extrabold font-mono text-amber-800 mt-1 block">
            ₹{parseFloat(summary.pending_revenue || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-700 font-medium block mt-1">Awaiting Settle</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[11px] text-rose-800 font-medium block">Under Maintenance</span>
          <span className="text-2xl font-extrabold font-mono text-rose-700 mt-1 block">
            {summary.maintenance_ports || 0}
          </span>
          <span className="text-[10px] text-rose-600 font-medium block mt-1">Defects Logged</span>
        </div>

      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'overview', label: 'Charts & Analytics', icon: Activity },
          { id: 'stations', label: 'Stations CRUD', icon: MapPin },
          { id: 'chargers', label: 'Chargers CRUD', icon: Cpu },
          { id: 'ports', label: 'Ports Mapping CRUD', icon: Zap },
          { id: 'tariffs', label: 'Tariffs Manager', icon: DollarSign },
          { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
          { id: 'audits', label: 'Audit Trail', icon: FileText }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CHARTS & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Revenue Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Daily Revenue Realized (INR)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.charts?.dailyRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Station Energy Consumption Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                Energy Delivered by Station (kWh)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.charts?.stationEnergy || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="station_name" type="category" width={110} tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="energy_kwh" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Energy (kWh)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Connector Types Distribution Pie */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Connector Standards Distribution
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.charts?.connectorStats || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="connector_type"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(analytics?.charts?.connectorStats || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Audit Events */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Recent Database Audit Events
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analytics?.recentAudits?.map((a) => (
                  <div key={a.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] border border-purple-200">
                        {a.action}
                      </span>
                      <span className="text-slate-600 ml-2 font-medium">on {a.entity_name} #{a.entity_id}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: STATIONS CRUD */}
      {activeTab === 'stations' && (
        <div className="space-y-6">
          {/* Add Station Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Add New Charging Station (MySQL INSERT)
            </h3>
            <form onSubmit={handleCreateStation} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                required
                placeholder="Station Code (e.g. STN-005)"
                value={newStation.station_code}
                onChange={(e) => setNewStation({ ...newStation, station_code: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
              />
              <input
                type="text"
                required
                placeholder="Station Name"
                value={newStation.name}
                onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl"
              />
              <input
                type="text"
                required
                placeholder="Address"
                value={newStation.address}
                onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl"
              />
              <input
                type="text"
                required
                placeholder="City"
                value={newStation.city}
                onChange={(e) => setNewStation({ ...newStation, city: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl"
              />
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                >
                  Create Station Record
                </button>
              </div>
            </form>
          </div>

          {/* Stations Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Station Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Operating Status</th>
                  <th className="py-3 px-4">Helpline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stations.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">{s.station_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{s.name}</td>
                    <td className="py-3 px-4 text-slate-600">{s.address}, {s.city}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.operational_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{s.contact_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CHARGERS CRUD */}
      {activeTab === 'chargers' && (
        <div className="space-y-6">
          {/* Add Charger Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Add Physical Charger Cabinet (Map to Station)
            </h3>
            <form onSubmit={handleCreateCharger} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                required
                placeholder="Charger Code (e.g. CHG-009)"
                value={newCharger.charger_code}
                onChange={(e) => setNewCharger({ ...newCharger, charger_code: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
              />
              <select
                required
                value={newCharger.station_id}
                onChange={(e) => setNewCharger({ ...newCharger, station_id: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="">Select Parent Station</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.station_code} - {s.name}</option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder="Cabinet Model Label"
                value={newCharger.label}
                onChange={(e) => setNewCharger({ ...newCharger, label: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl"
              />
              <input
                type="number"
                required
                placeholder="Max Output Power (kW)"
                value={newCharger.max_power_kw}
                onChange={(e) => setNewCharger({ ...newCharger, max_power_kw: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                >
                  Create & Map Charger
                </button>
              </div>
            </form>
          </div>

          {/* Chargers Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Charger Code</th>
                  <th className="py-3 px-4">Parent Station</th>
                  <th className="py-3 px-4">Hardware Label</th>
                  <th className="py-3 px-4">Power Rating</th>
                  <th className="py-3 px-4">Mapped Ports</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chargers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.charger_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{c.station_name} [{c.station_code}]</td>
                    <td className="py-3 px-4 text-slate-700">{c.label}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">{c.max_power_kw} kW</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.total_ports || 0} Ports</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.operational_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PORTS CRUD & MAPPING */}
      {activeTab === 'ports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Map New Physical Port to Charger Cabinet
            </h3>
            <form onSubmit={handleCreatePort} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                required
                placeholder="Port Code (e.g. PORT-017)"
                value={newPort.port_code}
                onChange={(e) => setNewPort({ ...newPort, port_code: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
              />
              <select
                required
                value={newPort.charger_id}
                onChange={(e) => setNewPort({ ...newPort, charger_id: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="">Select Parent Charger</option>
                {chargers.map(c => (
                  <option key={c.id} value={c.id}>{c.charger_code} - {c.label}</option>
                ))}
              </select>
              <select
                value={newPort.connector_type}
                onChange={(e) => setNewPort({ ...newPort, connector_type: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="CCS2">CCS2</option>
                <option value="Type 2">Type 2</option>
                <option value="CHAdeMO">CHAdeMO</option>
                <option value="GB/T">GB/T</option>
                <option value="Tesla">Tesla</option>
              </select>
              <input
                type="number"
                required
                placeholder="Port Power Rating (kW)"
                value={newPort.max_power_kw}
                onChange={(e) => setNewPort({ ...newPort, max_power_kw: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                >
                  Create & Map Port to Charger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: TARIFFS */}
      {activeTab === 'tariffs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Configured Electricity Tariffs per Connector Standard</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Station Scope</th>
                <th className="py-3 px-4">Connector Type</th>
                <th className="py-3 px-4">Energy Rate (₹/kWh)</th>
                <th className="py-3 px-4">Service Access Fee</th>
                <th className="py-3 px-4">Tax (GST %)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {tariffs.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-medium text-slate-700">
                    {t.station_name || 'Global Platform Default'}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-800">{t.connector_type}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">₹{t.rate_per_kwh}</td>
                  <td className="py-3 px-4 text-slate-600">₹{t.service_fee}</td>
                  <td className="py-3 px-4 text-slate-600">{t.tax_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: MAINTENANCE LOG */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Reported Hardware Defects & Port Repairs</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Port Code</th>
                <th className="py-3 px-4">Station & Charger</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reporter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-rose-700">{m.port_code}</td>
                  <td className="py-3 px-4 text-slate-700">{m.station_name} ({m.charger_code})</td>
                  <td className="py-3 px-4 text-slate-800">{m.issue_description}</td>
                  <td className="py-3 px-4 font-bold font-mono text-[10px] text-amber-700">{m.severity}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'OPEN' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{m.reporter_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audits' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Database Audit Log Records (<code className="font-mono">audit_logs</code>)</h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs font-mono max-h-96 overflow-y-auto">
            {analytics?.recentAudits?.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <span className="font-bold text-purple-700">{a.action}</span>
                  <span className="text-slate-500 ml-2">Entity: {a.entity_name} #{a.entity_id}</span>
                  <span className="text-slate-400 block text-[11px] mt-0.5 font-sans">
                    Triggered by: {a.actor_name || 'System Engine'} ({a.actor_role || 'CORE'})
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">{new Date(a.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
