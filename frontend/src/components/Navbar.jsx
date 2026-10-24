import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Zap, 
  MapPin, 
  Layers, 
  Calendar, 
  Receipt, 
  ShieldCheck, 
  Wrench, 
  User, 
  LogOut, 
  Bell, 
  Menu, 
  X,
  CheckCircle2
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout, isAdmin, isOperator } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount((res.notifications || []).filter(n => !n.is_read).length);
      }
    } catch (e) {
      // ignore silently if not logged in
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const navLinkClass = (page) => `
    flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all
    ${activePage === page 
      ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-xs' 
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
  `;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setActivePage('landing')} 
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1">
                  Volt<span className="text-emerald-600">Slot</span>
                </span>
                <span className="text-[10px] block font-mono text-slate-400 font-medium tracking-wider uppercase">
                  DBMS EV Engine
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => setActivePage('stations')} 
                className={navLinkClass('stations')}
              >
                <MapPin className="w-4 h-4 text-emerald-600" />
                Find Stations
              </button>

              <button 
                onClick={() => setActivePage('mapping')} 
                className={navLinkClass('mapping')}
              >
                <Layers className="w-4 h-4 text-emerald-600" />
                Charger-Port Map
              </button>

              {user && (
                <>
                  <button 
                    onClick={() => setActivePage('my-bookings')} 
                    className={navLinkClass('my-bookings')}
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    My Bookings
                  </button>

                  <button 
                    onClick={() => setActivePage('billing')} 
                    className={navLinkClass('billing')}
                  >
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Bills & Invoices
                  </button>
                </>
              )}

              {isOperator && (
                <button 
                  onClick={() => setActivePage('operator')} 
                  className={navLinkClass('operator')}
                >
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Operator Console
                </button>
              )}

              {isAdmin && (
                <button 
                  onClick={() => setActivePage('admin')} 
                  className={navLinkClass('admin')}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Admin Dashboard
                </button>
              )}
            </nav>
          </div>

          {/* Right Header Area */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
                    title="System Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Database Notifications ({unreadCount} new)
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">No notifications yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => handleMarkAsRead(n.id)}
                              className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-emerald-50/40' : ''}`}
                            >
                              <div className="font-semibold text-slate-800 flex items-center justify-between">
                                {n.title}
                                {!n.is_read && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                              </div>
                              <p className="text-slate-600 mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Pill & Role Badge */}
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-900 block leading-tight">
                      {user.full_name?.split(' ')[0]}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'OPERATOR' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => setActivePage('profile')}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    title="User Profile"
                  >
                    <User className="w-5 h-5" />
                  </button>

                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePage('login')}
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => setActivePage('register')}
                  className="px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/20 transition-all hover:shadow"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Hamburger */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <button 
            onClick={() => { setActivePage('stations'); setMobileMenuOpen(false); }} 
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <MapPin className="w-4 h-4 text-emerald-600" /> Find Stations
          </button>
          <button 
            onClick={() => { setActivePage('mapping'); setMobileMenuOpen(false); }} 
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Layers className="w-4 h-4 text-emerald-600" /> Charger-Port Map
          </button>
          {user && (
            <>
              <button 
                onClick={() => { setActivePage('my-bookings'); setMobileMenuOpen(false); }} 
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Calendar className="w-4 h-4 text-emerald-600" /> My Bookings
              </button>
              <button 
                onClick={() => { setActivePage('billing'); setMobileMenuOpen(false); }} 
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Receipt className="w-4 h-4 text-emerald-600" /> Bills & Invoices
              </button>
            </>
          )}
          {isOperator && (
            <button 
              onClick={() => { setActivePage('operator'); setMobileMenuOpen(false); }} 
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              <Wrench className="w-4 h-4" /> Operator Console
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => { setActivePage('admin'); setMobileMenuOpen(false); }} 
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50"
            >
              <ShieldCheck className="w-4 h-4" /> Admin Dashboard
            </button>
          )}
          {user && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Logged in as {user.email}</span>
              <button 
                onClick={() => { logout(); setMobileMenuOpen(false); }} 
                className="text-xs text-rose-600 font-semibold"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
