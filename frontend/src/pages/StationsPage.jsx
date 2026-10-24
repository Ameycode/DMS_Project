import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  MapPin, 
  Search, 
  Filter, 
  Zap, 
  Cpu, 
  Clock, 
  Star, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Phone,
  RefreshCw
} from 'lucide-react';

export default function StationsPage({ setActivePage, setSelectedStationId }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [connectorFilter, setConnectorFilter] = useState('');

  const fetchStations = async () => {
    setLoading(true);
    try {
      let query = '?';
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (cityFilter) query += `city=${encodeURIComponent(cityFilter)}&`;
      if (connectorFilter) query += `connector=${encodeURIComponent(connectorFilter)}&`;

      const res = await api.getStations(query);
      if (res.success) {
        setStations(res.stations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [cityFilter, connectorFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStations();
  };

  return (
    <div className="space-y-6 py-6">
      
      {/* Header and Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find EV Charging Stations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse real-time station availability, inspect physical chargers, and identify individual charging ports.
          </p>
        </div>

        {/* Filter Controls */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search station name, area, or landmark..."
              className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 bg-white"
            >
              <option value="">All Locations</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Tumakuru Road">Tumakuru Road (NH48)</option>
              <option value="Devanahalli">Devanahalli (Airport)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={connectorFilter}
              onChange={(e) => setConnectorFilter(e.target.value)}
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 bg-white"
            >
              <option value="">All Connector Types</option>
              <option value="CCS2">CCS2 (DC Fast)</option>
              <option value="Type 2">Type 2 (AC)</option>
              <option value="CHAdeMO">CHAdeMO (DC)</option>
              <option value="GB/T">GB/T</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full h-full min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-colors"
              title="Execute Filter"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-2">
        <span>Found <strong>{stations.length}</strong> Stations matching criteria</span>
        <button 
          onClick={fetchStations} 
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Stations Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-xs text-slate-500">Querying MySQL stations and foreign key relations...</span>
        </div>
      ) : stations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">No stations match the selected filters</h3>
          <p className="text-xs text-slate-400">Try clearing city or connector constraints to view all charging plazas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {stations.map((stn) => (
            <div 
              key={stn.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Station Card Header */}
                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {stn.station_code}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 tracking-tight">{stn.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {stn.address}, {stn.city}
                    </p>
                  </div>

                  {/* Rating Badge */}
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    {parseFloat(stn.avg_rating).toFixed(1)}
                  </span>
                </div>

                {/* Relational Stats Pill Bar */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Chargers</span>
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      {stn.total_chargers} Cabinets
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Ports</span>
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-slate-500" />
                      {stn.total_ports} Guns
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Available Now</span>
                    <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {stn.available_ports} Ready
                    </span>
                  </div>
                </div>

                {/* Additional Station Details */}
                <div className="p-5 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" /> Operating Hours:
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {stn.opening_time?.slice(0, 5)} - {stn.closing_time?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3.5 h-3.5" /> Support Helpline:
                    </span>
                    <span className="font-mono text-slate-700">{stn.contact_number}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                  Status: {stn.operational_status}
                </span>

                <button
                  onClick={() => {
                    setSelectedStationId(stn.id);
                    setActivePage('station-detail');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <span>Inspect Chargers & Ports</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
