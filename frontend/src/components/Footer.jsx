import React from 'react';
import { Database, Zap, Cpu, Server } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-lg text-white">VoltSlot</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full-Stack EV Charging Slot & Billing Management System designed for Relational Database Management System (DBMS) viva & project demonstration.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50">
                <Database className="w-3 h-3" /> MySQL 8.x 3NF
              </span>
            </div>
          </div>

          {/* DBMS Architecture */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              DBMS Architecture
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Strict Charger-to-Port Foreign Key Map
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                ACID Pessimistic Locking (<code className="text-emerald-400 font-mono">FOR UPDATE</code>)
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Double Booking Collision Prevention
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Automated Database Triggers & Auditing
              </li>
            </ul>
          </div>

          {/* Core Relational Entities */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Relational Schema
            </h4>
            <div className="grid grid-cols-2 gap-1 text-xs font-mono text-slate-400">
              <span>• stations</span>
              <span>• chargers</span>
              <span>• ports</span>
              <span>• bookings</span>
              <span>• charging_sessions</span>
              <span>• bills</span>
              <span>• payments</span>
              <span>• tariffs</span>
              <span>• audit_logs</span>
              <span>• maintenance</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Runtime Services
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authentication, station availability, bookings, sessions, and billing are loaded from the configured backend and database.
            </p>
          </div>

        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 VoltSlot EV Charging Slot & Billing Management System. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-mono text-[11px]">
            Frontend: React+Vite • Backend: Express+MySQL • Concurrency: Row-Level Locking
          </p>
        </div>
      </div>
    </footer>
  );
}
