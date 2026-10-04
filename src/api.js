const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const SESSION_KEY = 'cliniclog_session';

let onUnauthorized = null;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function errorMessage(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join('; ');
  }
  return fallback;
}

export async function api(path, options = {}) {
  const {
    method = 'GET',
    body,
    token,
    auth = true,
    formData = false,
    raw = false,
  } = options;

  const headers = {};
  const session = getSession();
  const accessToken = token ?? session?.access_token;
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let payload = body;
  if (body != null && !formData && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: payload,
    });
  } catch (err) {
    throw new ApiError(
      'Unable to connect to the clinic server. Please ensure the backend is running.',
      0,
    );
  }

  if (response.status === 401) {
    clearSession();
    if (onUnauthorized) onUnauthorized();
    throw new ApiError('Your session expired. Please sign in again.', 401);
  }

  if (raw) {
    if (!response.ok) {
      let detail;
      try {
        detail = (await response.json()).detail;
      } catch {
        detail = null;
      }
      throw new ApiError(errorMessage(detail, 'Request failed'), response.status);
    }
    return response;
  }

  if (response.status === 204) return null;

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      errorMessage(data?.detail, 'Request failed'),
      response.status,
    );
  }

  return data;
}

export const authApi = {
  doctorLogin: (phone, password) =>
    api('/auth/doctor/login', { method: 'POST', body: { phone, password }, auth: false }),
  doctorRegister: (payload) =>
    api('/auth/doctor/register', { method: 'POST', body: payload, auth: false }),
  doctorMe: () => api('/auth/doctor/me'),
  patientLogin: (phone, password) =>
    api('/auth/patient/login', { method: 'POST', body: { phone, password }, auth: false }),
};

export const patientsApi = {
  list: (q = '') => api(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get: (id) => api(`/patients/${id}`),
  create: (payload) => api('/patients', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/patients/${id}`, { method: 'PATCH', body: payload }),
  addConsultation: (id, payload) =>
    api(`/patients/${id}/consultations`, { method: 'POST', body: payload }),
  uploadDocument: (id, file) => {
    const body = new FormData();
    body.append('file', file);
    return api(`/patients/${id}/documents`, { method: 'POST', body, formData: true });
  },
};

export const meApi = {
  get: () => api('/me'),
  update: (payload) => api('/me', { method: 'PATCH', body: payload }),
  uploadDocument: (file) => {
    const body = new FormData();
    body.append('file', file);
    return api('/me/documents', { method: 'POST', body, formData: true });
  },
  appointments: () => api('/me/appointments'),
  requestAppointment: (payload) =>
    api('/me/appointments', { method: 'POST', body: payload }),
  notifications: () => api('/me/notifications'),
};

export const appointmentsApi = {
  list: () => api('/appointments'),
  update: (id, payload) => api(`/appointments/${id}`, { method: 'PATCH', body: payload }),
};

export async function downloadDocument(documentId, filename) {
  const response = await api(`/documents/${documentId}/download`, { raw: true });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { API_BASE };
