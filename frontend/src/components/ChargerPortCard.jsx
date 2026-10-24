import React from 'react';
import { 
  Zap, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  BatteryCharging, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';

export function getStatusBadge(status) {
  switch (status) {
    case 'AVAILABLE':
      return {
        label: 'Available',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
        icon: CheckCircle2
      };
    case 'RESERVED':
      return {
        label: 'Reserved',
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        dot: 'bg-blue-500',
        icon: Clock
      };
    case 'CHARGING':
      return {
        label: 'Charging',
        bg: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
        dot: 'bg-amber-500',
        icon: BatteryCharging
      };
    case 'MAINTENANCE':
      return {
        label: 'Maintenance',
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500',
        icon: Wrench
      };
    default:
      return {
        label: 'Offline',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
        icon: ShieldAlert
      };
  }
}

export default function ChargerPortCard({ 
  charger, 
  station, 
  onBookPort, 
  onViewPortDetails,
  onUpdatePortStatus,
  userRole 
}) {
  const isOperatorOrAdmin = userRole === 'OPERATOR' || userRole === 'ADMIN';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      
      {/* Charger Cabinet Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                {charger.charger_code}
              </span>
              <h3 className="font-bold text-base text-white tracking-tight">{charger.label}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Manufacturer: <span className="text-white font-medium">{charger.manufacturer || 'OEM Standard'}</span> • Type: <span className="text-emerald-400 font-medium">{charger.technology_type}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Output Power</span>
            <span className="text-sm font-bold text-white font-mono">{charger.max_power_kw} kW</span>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            charger.operational_status === 'ACTIVE' 
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' 
              : 'bg-rose-950/80 text-rose-400 border border-rose-800'
          }`}>
            {charger.operational_status}
          </span>
        </div>
      </div>

      {/* Relational Ownership Breadcrumb Callout */}
      <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-xs text-emerald-900">
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Hierarchy Mapping: 
          <span className="font-bold text-slate-900">{station?.name || 'Station'}</span>
          <span className="text-emerald-500 font-bold">➔</span>
          <span className="font-mono font-bold text-emerald-800">[{charger.charger_code}]</span>
          <span className="text-emerald-500 font-bold">➔</span>
          <span className="text-slate-600 font-medium">{charger.ports?.length || 0} Physical Ports Dispensed</span>
        </span>
      </div>

      {/* Ports Grid inside this physical charger */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {charger.ports && charger.ports.length > 0 ? (
            charger.ports.map((port) => {
              const badge = getStatusBadge(port.current_status);
              const BadgeIcon = badge.icon;
              const isEligibleForBooking = port.current_status === 'AVAILABLE';

              return (
                <div 
                  key={port.id || port.port_id} 
                  className={`relative rounded-xl border p-4 transition-all ${
                    port.current_status === 'AVAILABLE' 
                      ? 'border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-sm' :
                    port.current_status === 'CHARGING'
                      ? 'border-amber-200 bg-amber-50/20' :
                    port.current_status === 'RESERVED'
                      ? 'border-blue-200 bg-blue-50/20' :
                    'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  {/* Top Bar of Port */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {port.port_code}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          (Gun #{port.port_number || 1})
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        {port.connector_type} Connector
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Port Spec details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Rating</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{port.max_power_kw} kW</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Parent Dispenser</span>
                      <span className="font-mono font-medium text-emerald-700">{charger.charger_code}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center gap-2">
                    {isEligibleForBooking ? (
                      <button
                        onClick={() => onBookPort && onBookPort(port, charger)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
                      >
                        Book This Port
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 px-3 py-2 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg cursor-not-allowed text-center"
                      >
                        {port.current_status === 'CHARGING' ? 'Occupied - Charging' :
                         port.current_status === 'RESERVED' ? 'Slot Reserved' : 'Currently Unavailable'}
                      </button>
                    )}

                    <button
                      onClick={() => onViewPortDetails && onViewPortDetails(port, charger)}
                      className="px-2.5 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
                      title="Inspect Relational Details"
                    >
                      Inspect
                    </button>

                    {/* Operator quick action */}
                    {isOperatorOrAdmin && (
                      <select
                        value={port.current_status}
                        onChange={(e) => onUpdatePortStatus && onUpdatePortStatus(port.id || port.port_id, e.target.value)}
                        className="text-[11px] font-mono bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 font-semibold focus:outline-emerald-500"
                        title="Override Operational Status"
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="RESERVED">RESERVED</option>
                        <option value="CHARGING">CHARGING</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="UNAVAILABLE">UNAVAILABLE</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 py-6 text-center text-slate-400 text-xs italic">
              No physical ports currently mapped to this charger dispenser.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
