import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StationsPage from './pages/StationsPage';
import StationDetailPage from './pages/StationDetailPage';
import ChargerPortMappingPage from './pages/ChargerPortMappingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import BillingHistoryPage from './pages/BillingHistoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import OperatorPortalPage from './pages/OperatorPortalPage';
import ProfilePage from './pages/ProfilePage';

function AppContent() {
  const [activePage, setActivePage] = useState('landing');
  const [selectedStationId, setSelectedStationId] = useState(null);
  const { user, isAdmin, isOperator } = useAuth();

  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage setActivePage={setActivePage} />;
      case 'login':
        return <LoginPage setActivePage={setActivePage} />;
      case 'register':
        return <RegisterPage setActivePage={setActivePage} />;
      case 'stations':
        return (
          <StationsPage
            setActivePage={setActivePage}
            setSelectedStationId={setSelectedStationId}
          />
        );
      case 'station-detail':
        return (
          <StationDetailPage
            stationId={selectedStationId}
            setActivePage={setActivePage}
          />
        );
      case 'mapping':
        return <ChargerPortMappingPage />;
      case 'my-bookings':
        return user ? <MyBookingsPage /> : <LoginPage setActivePage={setActivePage} />;
      case 'billing':
        return user ? <BillingHistoryPage /> : <LoginPage setActivePage={setActivePage} />;
      case 'admin':
        return isAdmin ? (
          <AdminDashboardPage
            setActivePage={setActivePage}
            setSelectedStationId={setSelectedStationId}
          />
        ) : (
          <LoginPage setActivePage={setActivePage} />
        );
      case 'operator':
        return (isOperator || isAdmin) ? (
          <OperatorPortalPage />
        ) : (
          <LoginPage setActivePage={setActivePage} />
        );
      case 'profile':
        return user ? <ProfilePage /> : <LoginPage setActivePage={setActivePage} />;
      default:
        return <LandingPage setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
