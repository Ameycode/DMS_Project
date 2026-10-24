const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: Request failed`);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getProfile: () => request('/auth/profile'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getAllUsers: () => request('/auth/users'),

  // Stations
  getStations: (params = '') => request(`/stations${params}`),
  getStationById: (id) => request(`/stations/${id}`),
  createStation: (data) => request('/stations', { method: 'POST', body: JSON.stringify(data) }),
  updateStation: (id, data) => request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStation: (id) => request(`/stations/${id}`, { method: 'DELETE' }),

  // Chargers
  getChargers: (params = '') => request(`/chargers${params}`),
  getChargerById: (id) => request(`/chargers/${id}`),
  createCharger: (data) => request('/chargers', { method: 'POST', body: JSON.stringify(data) }),
  updateCharger: (id, data) => request(`/chargers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCharger: (id) => request(`/chargers/${id}`, { method: 'DELETE' }),

  // Ports
  getPorts: (params = '') => request(`/ports${params}`),
  getPortById: (id) => request(`/ports/${id}`),
  createPort: (data) => request('/ports', { method: 'POST', body: JSON.stringify(data) }),
  updatePortStatus: (id, status) => request(`/ports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ current_status: status }) }),
  getChargerPortMapping: () => request('/ports/mapping/hierarchy'),

  // Bookings
  createBooking: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getMyBookings: () => request('/bookings/my'),
  getAllBookings: (params = '') => request(`/bookings/all${params}`),
  cancelBooking: (id, reason) => request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  checkAvailability: (portId, start, end) => request(`/bookings/availability?port_id=${portId}&start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`),

  // Charging Sessions
  startSession: (data) => request('/sessions/start', { method: 'POST', body: JSON.stringify(data) }),
  completeSession: (id, meterEnd) => request(`/sessions/${id}/complete`, { method: 'POST', body: JSON.stringify({ meter_end_kwh: meterEnd }) }),
  getActiveSessions: () => request('/sessions/active'),
  getSessionById: (id) => request(`/sessions/${id}`),

  // Billing & Payments
  getMyBills: () => request('/billing/my'),
  getAllBills: (params = '') => request(`/billing/all${params}`),
  getBillById: (id) => request(`/billing/${id}`),
  payBill: (id, paymentMethod) => request(`/billing/${id}/pay`, { method: 'POST', body: JSON.stringify({ payment_method: paymentMethod }) }),

  // Tariffs
  getTariffs: () => request('/tariffs'),
  createTariff: (data) => request('/tariffs', { method: 'POST', body: JSON.stringify(data) }),
  updateTariff: (id, data) => request(`/tariffs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Maintenance
  getMaintenance: (params = '') => request(`/maintenance${params}`),
  reportMaintenance: (data) => request('/maintenance/report', { method: 'POST', body: JSON.stringify(data) }),
  resolveMaintenance: (id, notes) => request(`/maintenance/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution_notes: notes }) }),

  // Feedback
  submitFeedback: (data) => request('/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getStationFeedback: (stationId) => request(`/feedback/station/${stationId}`),

  // Analytics & Notifications
  getDashboardAnalytics: () => request('/analytics/dashboard'),
  getNotifications: () => request('/analytics/notifications'),
  markNotificationRead: (id) => request(`/analytics/notifications/${id}/read`, { method: 'PATCH' }),

  // Health
  checkHealth: () => request('/health')
};
