import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Zap,
  MapPin,
  ShieldCheck,
  Layers,
  Database,
  ArrowRight,
  BatteryCharging,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function LandingPage({ setActivePage }) {
  const [mapping, setMapping] = useState([]);

  useEffect(() => {
    api.getChargerPortMapping()
      .then((response) => {
        if (response.success) {
          setMapping(response.mapping || []);
        }
      })
      .catch((error) => {
        console.error('Unable to load charger-port mapping:', error);
      });
  }, []);

  const chargers = mapping.reduce((groups, port) => {
    const key = `${port.charger_code}-${port.station_code}`;
    if (!groups[key]) {
      groups[key] = {
        charger_code: port.charger_code,
        charger_label: port.charger_label,
        station_name: port.station_name,
        station_code: port.station_code,
        ports: []
      };
    }
    groups[key].ports.push(port);
    return groups;
  }, {});

  return (
    <div className="space-y-16 py-8">
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 rounded-3xl border border-emerald-100 p-8 sm:p-14 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Relational DBMS Project • 3NF Normalized • MySQL 8.x Engine</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            EV Charging <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
              Slot & Billing Management
            </span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Browse charging stations, reserve physical ports, monitor charging sessions, and manage invoices through a database-backed application.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button onClick={() => setActivePage('stations')} className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" /> Explore Charging Stations
            </button>
            <button onClick={() => setActivePage('mapping')} className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl border border-slate-300 flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-emerald-600" /> View Charger-Port Hierarchy
            </button>
          </div>
          <div className="pt-8 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 block font-medium">Data Source</span>
              <span className="text-xl font-bold font-mono text-slate-900">MySQL</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 block font-medium">Hierarchy</span>
              <span className="text-xl font-bold font-mono text-emerald-700">Station → Port</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 block font-medium">Booking Safety</span>
              <span className="text-xl font-bold font-mono text-purple-700">Row Locking</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 block font-medium">Current Mapping</span>
              <span className="text-xl font-bold font-mono text-blue-700">{mapping.length} Ports</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" /> Database-backed hierarchy
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Charger and Port Ownership</h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              This section is populated from the current database view, so it reflects the stations and ports currently configured by administrators.
            </p>
          </div>
          <button onClick={() => setActivePage('mapping')} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 self-start">
            Launch Hierarchy Inspector <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {Object.values(chargers).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {Object.values(chargers).map((charger) => (
              <div key={`${charger.charger_code}-${charger.station_code}`} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-xs">{charger.charger_code}</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{charger.charger_label}</h4>
                    <span className="text-xs text-slate-500">Parent Station: {charger.station_name} [{charger.station_code}]</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {charger.ports.map((port) => (
                    <div key={port.port_id} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{port.port_code}</span>
                      <span className="text-xs font-bold text-slate-800 block mt-1">{port.connector_type}</span>
                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="font-mono text-slate-600 font-semibold">{port.port_max_power_kw} kW</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{port.port_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Charger and port data will appear here when stations are available.
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: ShieldCheck, color: 'purple', title: 'ACID Concurrency', text: 'Prevents double-booking with MySQL row-level locking on half-open time intervals.' },
          { icon: BatteryCharging, color: 'emerald', title: 'Metered Sessions', text: 'Captures meter readings and calculates energy consumed from actual session data.' },
          { icon: DollarSign, color: 'blue', title: 'Automated Billing', text: 'Generates invoices using the active tariff configured in the database.' },
          { icon: Sliders, color: 'amber', title: 'Role-based Access', text: 'Separates customer, operator, and administrator capabilities with JWT authorization.' }
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
            <Icon className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
