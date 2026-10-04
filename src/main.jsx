import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  appointmentsApi,
  authApi,
  clearSession,
  downloadDocument,
  getSession,
  meApi,
  patientsApi,
  setSession,
  setUnauthorizedHandler,
} from './api';
import './styles.css';

const TONES = ['lavender', 'sky', 'peach', 'mint'];

const Icon = ({ name, size = 18 }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.66 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06L6.6 16.94l.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98 8.72 5.86l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7v-.08h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    back: <path d="m15 18-6-6 6-6"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    upload: <><path d="M12 16V3M7 8l5-5 5 5"/><path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

function initials(name = '') {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function toneFor(id = 0) {
  return TONES[Math.abs(Number(id) || 0) % TONES.length];
}

function formatDate(value) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function greetingLabel() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).toUpperCase();
}

function ageLabel(age) {
  if (age == null || age === '') return 'Age not added';
  return `${age} years`;
}

function Avatar({ patient, large = false }) {
  const name = patient?.name || '';
  return (
    <div className={`avatar ${toneFor(patient?.id)} ${large ? 'large' : ''}`}>
      {initials(name)}
    </div>
  );
}

function Button({ children, variant = 'primary', onClick, type = 'button', className = '', disabled = false }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}

function Toast({ message, error = false }) {
  if (!message) return null;
  return (
    <div className={`toast ${error ? 'error' : ''}`}>
      <span><Icon name={error ? 'x' : 'check'} size={17} /></span>
      {message}
    </div>
  );
}

function LoadingBlock({ label = 'Loading…' }) {
  return <div className="loading-block">{label}</div>;
}

function ErrorText({ message }) {
  if (!message) return null;
  return <p className="form-error">{message}</p>;
}

function SearchBox({ value, setValue, placeholder = 'Search patients by name or phone…' }) {
  return (
    <div className="searchbox">
      <Icon name="search" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      {value && <button type="button" onClick={() => setValue('')}><Icon name="x" size={16} /></button>}
    </div>
  );
}

function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [role, setRole] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [patientUser, setPatientUser] = useState(null);
  const [page, setPage] = useState('welcome');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);

  const notify = (message, isError = false) => {
    setToast(message);
    setToastError(isError);
    setTimeout(() => {
      setToast('');
      setToastError(false);
    }, 3200);
  };

  const logout = (nextPage = 'welcome') => {
    clearSession();
    setRole(null);
    setDoctor(null);
    setPatientUser(null);
    setPage(nextPage);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setRole(null);
      setDoctor(null);
      setPatientUser(null);
      setPage('welcome');
      notify('Your session expired. Please sign in again.', true);
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = getSession();
      if (!session?.access_token || !session?.role) {
        if (active) setBootstrapping(false);
        return;
      }
      try {
        if (session.role === 'doctor') {
          const me = await authApi.doctorMe();
          if (!active) return;
          setDoctor(me);
          setRole('doctor');
          setPage('home');
        } else {
          const me = await meApi.get();
          if (!active) return;
          setPatientUser(me);
          setRole('patient');
          setPage('patienthome');
        }
      } catch {
        clearSession();
      } finally {
        if (active) setBootstrapping(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleDoctorAuth = async (tokenPayload) => {
    setSession(tokenPayload);
    const me = await authApi.doctorMe();
    setDoctor(me);
    setRole('doctor');
    setPage('home');
    notify(`Welcome back, ${me.name}`);
  };

  const handlePatientAuth = async (tokenPayload) => {
    setSession(tokenPayload);
    const me = await meApi.get();
    setPatientUser(me);
    setRole('patient');
    setPage('patienthome');
    notify(`Welcome, ${me.name.split(' ')[0]}`);
  };

  if (bootstrapping) {
    return <main className="boot-screen"><LoadingBlock label="Opening ClinicLog…" /></main>;
  }

  if (!role) {
    if (page === 'doctorlogin' || page === 'doctorregister') {
      return (
        <>
          <DoctorAuth
            mode={page === 'doctorregister' ? 'register' : 'login'}
            onSuccess={handleDoctorAuth}
            onBack={() => setPage('welcome')}
            switchMode={(mode) => setPage(mode === 'register' ? 'doctorregister' : 'doctorlogin')}
            notify={notify}
          />
          <Toast message={toast} error={toastError} />
        </>
      );
    }
    if (page === 'patientlogin') {
      return (
        <>
          <PatientLogin
            back={() => setPage('welcome')}
            onSuccess={handlePatientAuth}
            notify={notify}
          />
          <Toast message={toast} error={toastError} />
        </>
      );
    }
    return (
      <>
        <Welcome
          onDoctor={() => setPage('doctorlogin')}
          onPatient={() => setPage('patientlogin')}
        />
        <Toast message={toast} error={toastError} />
      </>
    );
  }

  if (role === 'patient' && patientUser) {
    return (
      <PatientPortal
        patient={patientUser}
        setPatient={setPatientUser}
        page={page}
        setPage={setPage}
        logout={() => logout('welcome')}
        notify={notify}
        toast={toast}
        toastError={toastError}
      />
    );
  }

  return (
    <DoctorApp
      doctor={doctor}
      page={page}
      setPage={setPage}
      logout={() => logout('welcome')}
      notify={notify}
      toast={toast}
      toastError={toastError}
    />
  );
}

function Welcome({ onDoctor, onPatient }) {
  return (
    <main className="welcome-screen">
      <div className="portal-brand">
        <span className="brand-mark"><span /><span /><span /></span>
        ClinicLog
      </div>
      <section className="login-card welcome-card">
        <p className="eyebrow">CLINIC REGISTER</p>
        <h1>Private records for your clinic</h1>
        <p>Sign in as a doctor to manage patients, or open the patient portal with your phone and password.</p>
        <div className="welcome-actions">
          <Button className="full" onClick={onDoctor}>Doctor sign in <Icon name="arrow" size={16} /></Button>
          <Button className="full" variant="secondary" onClick={onPatient}>Patient portal <Icon name="users" size={16} /></Button>
        </div>
      </section>
    </main>
  );
}

function DoctorAuth({ mode, onSuccess, onBack, switchMode, notify }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({
    name: '',
    clinic_name: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = isRegister
        ? await authApi.doctorRegister(form)
        : await authApi.doctorLogin(form.phone, form.password);
      await onSuccess(token);
    } catch (err) {
      setError(err.message || 'Could not sign in');
      notify(err.message || 'Could not sign in', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="patient-login">
      <div className="portal-brand">
        <span className="brand-mark"><span /><span /><span /></span>
        ClinicLog
      </div>
      <button className="back portal-back" onClick={onBack} type="button">
        <Icon name="back" size={17} /> Back
      </button>
      <section className="login-card">
        <div className="login-symbol"><Icon name="home" size={27} /></div>
        <p className="eyebrow">DOCTOR ACCESS</p>
        <h1>{isRegister ? 'Create your clinic account' : 'Sign in to your clinic'}</h1>
        <p>
          {isRegister
            ? 'Register with a secure password to start your private patient register.'
            : 'Use your clinic phone number and password to continue.'}
        </p>
        {!isRegister && (
          <div className="demo-hint">
            <strong>Seeded Doctor Account</strong>
            Phone: <code>9000000000</code> · Password: <code>PriyaClinic12</code>
          </div>
        )}
        <form onSubmit={submit}>
          {isRegister && (
            <>
              <label>Your name<input required name="name" value={form.name} onChange={change} placeholder="e.g. Dr. Priya Desai" /></label>
              <label>Clinic name<input required name="clinic_name" value={form.clinic_name} onChange={change} placeholder="e.g. Priya Clinic" /></label>
            </>
          )}
          <label>Phone number<input required name="phone" value={form.phone} onChange={change} placeholder="e.g. 9000000000" inputMode="tel" /></label>
          <label>
            Password
            <input
              required
              type="password"
              name="password"
              value={form.password}
              onChange={change}
              placeholder={isRegister ? 'At least 12 characters' : 'Your password'}
              minLength={isRegister ? 12 : 1}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </label>
          <ErrorText message={error} />
          <Button type="submit" className="full" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in securely'}
            {!loading && <Icon name="arrow" size={16} />}
          </Button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already registered?' : 'New clinic?'}{' '}
          <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  );
}

function DoctorApp({ doctor, page, setPage, logout, notify, toast, toastError }) {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPatients = async (search = '') => {
    setLoading(true);
    try {
      const list = await patientsApi.list(search);
      setPatients(list);
    } catch (err) {
      notify(err.message || 'Could not load patients', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 'patients' || page === 'home') loadPatients(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, page]);

  const openPatient = async (patient) => {
    setDetailLoading(true);
    setPage('profile');
    try {
      const detail = await patientsApi.get(patient.id);
      setSelected(detail);
    } catch (err) {
      notify(err.message || 'Could not open patient', true);
      setPage('patients');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async (id) => {
    const detail = await patientsApi.get(id);
    setSelected(detail);
    return detail;
  };

  const nav = [
    ['home', 'Home', 'home'],
    ['users', 'Patients', 'patients'],
    ['calendar', 'Appointments', 'appointments'],
    ['settings', 'Settings', 'settings'],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>ClinicLog</span>
        </div>
        <div className="doctor-mini">
          <div className="doctor-avatar">{initials(doctor.name)}</div>
          <div>
            <strong>{doctor.name}</strong>
            <small>{doctor.clinic_name}</small>
          </div>
        </div>
        <nav>
          {nav.map(([icon, label, target]) => (
            <button
              key={target}
              type="button"
              className={`nav-item ${page === target || (page === 'profile' && target === 'patients') || (page === 'consult' && target === 'patients') || (page === 'newpatient' && target === 'patients') || (page === 'editpatient' && target === 'patients') ? 'active' : ''}`}
              onClick={() => setPage(target)}
            >
              <Icon name={icon} />{label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="portal-link" type="button" onClick={logout}>
            <Icon name="users" size={16} /><span>Sign out</span><Icon name="arrow" size={14} />
          </button>
          <div className="privacy"><Icon name="check" size={15} /><span>Private & secure</span></div>
        </div>
      </aside>
      <main className="content">
        {page === 'home' && (
          <Home
            doctor={doctor}
            patients={patients}
            loading={loading}
            openPatient={openPatient}
            setPage={setPage}
            setQuery={setQuery}
          />
        )}
        {page === 'patients' && (
          <Patients
            patients={patients}
            query={query}
            setQuery={setQuery}
            openPatient={openPatient}
            setPage={setPage}
            loading={loading}
          />
        )}
        {page === 'profile' && (
          detailLoading || !selected
            ? <LoadingBlock label="Loading patient record…" />
            : (
              <Profile
                patient={selected}
                setPage={setPage}
                onConsult={() => setPage('consult')}
                onEdit={() => setPage('editpatient')}
                notify={notify}
                onUploaded={async () => {
                  await refreshSelected(selected.id);
                  notify('Document uploaded to this record');
                }}
              />
            )
        )}
        {page === 'newpatient' && (
          <PatientForm
            title="Add a patient"
            eyebrow="NEW PATIENT"
            cancel={() => setPage('home')}
            notify={notify}
            onSave={async (payload) => {
              const created = await patientsApi.create(payload);
              await loadPatients(query);
              const detail = await patientsApi.get(created.id);
              setSelected(detail);
              setPage('profile');
              notify('Patient added to ClinicLog');
            }}
          />
        )}
        {page === 'editpatient' && selected && (
          <PatientForm
            title="Edit patient"
            eyebrow="UPDATE PATIENT"
            initial={selected}
            cancel={() => setPage('profile')}
            notify={notify}
            onSave={async (payload) => {
              await patientsApi.update(selected.id, payload);
              await refreshSelected(selected.id);
              await loadPatients(query);
              setPage('profile');
              notify('Patient details updated');
            }}
          />
        )}
        {page === 'consult' && selected && (
          <Consultation
            patient={selected}
            cancel={() => setPage('profile')}
            notify={notify}
            onSave={async (payload) => {
              await patientsApi.addConsultation(selected.id, payload);
              await refreshSelected(selected.id);
              await loadPatients(query);
              setPage('profile');
              notify('Today’s visit saved');
            }}
          />
        )}
        {page === 'appointments' && <DoctorAppointments notify={notify} />}
        {page === 'settings' && <Settings doctor={doctor} logout={logout} />}
      </main>
      <Toast message={toast} error={toastError} />
    </div>
  );
}

function Home({ doctor, patients, loading, openPatient, setPage, setQuery }) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await patientsApi.list(search.trim());
        setSearchResults(results.slice(0, 5));
      } catch {
        setSearchResults(
          patients.filter((p) => `${p.name} ${p.phone || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
        );
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [search, patients]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{greetingLabel()}</p>
          <h1>Good day, {doctor.name.split(' ')[0]}</h1>
          <p className="muted">Your clinic register, all in one calm place.</p>
        </div>
        <Button onClick={() => setPage('newpatient')}><Icon name="plus" /> Add patient</Button>
      </header>
      <section className="hero">
        <div>
          <h2>Find a patient</h2>
          <p>Search by name or phone number to open their record.</p>
          <SearchBox value={search} setValue={setSearch} />
          {search && (
            <div className="quick-results">
              {searching ? (
                <div className="no-result">Searching patients…</div>
              ) : searchResults.length ? (
                <>
                  {searchResults.map((p) => (
                    <button key={p.id} type="button" onClick={() => openPatient(p)}>
                      <Avatar patient={p} />
                      <span><strong>{p.name}</strong><small>{p.phone || 'No phone'}</small></span>
                      <Icon name="arrow" />
                    </button>
                  ))}
                  <div className="no-result" style={{ borderTop: '1px solid var(--line)', padding: '9px 14px' }}>
                    <button type="button" onClick={() => { setQuery(search); setPage('patients'); }}>
                      View all results in register <Icon name="arrow" size={13} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-result">
                  No matching patient.{' '}
                  <button type="button" onClick={() => setPage('newpatient')}>Add a new patient</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="hero-icon"><Icon name="search" size={36} /></div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Recent patients</h2>
            <p>Records you opened or added recently.</p>
          </div>
          <button className="link-button" type="button" onClick={() => { setQuery(''); setPage('patients'); }}>
            View all <Icon name="arrow" size={16} />
          </button>
        </div>
        {loading ? <LoadingBlock /> : (
          <div className="patient-list home-list">
            {patients.slice(0, 4).map((p) => (
              <PatientRow key={p.id} patient={p} open={() => openPatient(p)} />
            ))}
            {!patients.length && <p className="portal-empty">No patients yet. Add your first record.</p>}
          </div>
        )}
      </section>
    </>
  );
}

function PatientRow({ patient, open }) {
  return (
    <button className="patient-row" type="button" onClick={open}>
      <Avatar patient={patient} />
      <div className="patient-info">
        <strong>{patient.name}</strong>
        <span>{ageLabel(patient.age)} <i /> {patient.gender || 'Not specified'}</span>
      </div>
      <div className="last-visit">
        <span>Added</span>
        <strong>{formatDate(patient.created_at)}</strong>
      </div>
      <Icon name="arrow" className="chev" />
    </button>
  );
}

function Patients({ patients, query, setQuery, openPatient, setPage, loading }) {
  return (
    <>
      <header className="page-header simple">
        <div>
          <p className="eyebrow">PATIENTS</p>
          <h1>Patient register</h1>
          <p className="muted">Find a record or add someone new.</p>
        </div>
        <Button onClick={() => setPage('newpatient')}><Icon name="plus" /> Add patient</Button>
      </header>
      <SearchBox value={query} setValue={setQuery} />
      <div className="list-meta">
        <span>{patients.length} {patients.length === 1 ? 'patient' : 'patients'}</span>
        <span>Sorted by recent activity</span>
      </div>
      {loading ? <LoadingBlock /> : (
        <>
          <div className="patient-list">
            {patients.map((p) => <PatientRow key={p.id} patient={p} open={() => openPatient(p)} />)}
          </div>
          {!patients.length && (
            <div className="empty">
              <div><Icon name="users" size={28} /></div>
              <h3>No patients found</h3>
              <p>Try another name or phone number.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Profile({ patient, setPage, onConsult, onEdit, notify, onUploaded }) {
  const consultations = patient.consultations || [];
  const documents = patient.documents || [];
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await patientsApi.uploadDocument(patient.id, file);
      await onUploaded();
    } catch (err) {
      notify(err.message || 'Upload failed', true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button className="back" type="button" onClick={() => setPage('patients')}>
        <Icon name="back" size={17} /> Back to patients
      </button>
      <section className="profile-head">
        <Avatar patient={patient} large />
        <div className="profile-name">
          <h1>{patient.name}</h1>
          <p>{ageLabel(patient.age)} <i /> {patient.gender || 'Not specified'} <i /> {patient.locality || 'Locality not added'}</p>
          <span>{patient.phone || 'No phone added'}</span>
        </div>
        <div className="profile-actions">
          <Button onClick={onConsult}><Icon name="plus" /> Today's visit</Button>
          <Button variant="secondary" onClick={onEdit}>Edit</Button>
        </div>
      </section>
      <div className="profile-grid">
        <section>
          <div className="section-heading">
            <div>
              <h2>Visit history</h2>
              <p>{consultations.length ? 'Previous consultations, newest first.' : 'No consultations yet.'}</p>
            </div>
            {consultations.length > 0 && <span className="count">{consultations.length}</span>}
          </div>
          {consultations.length ? (
            <div className="timeline">
              {consultations.map((visit) => (
                <article className="visit-card" key={visit.id}>
                  <div className="visit-date"><Icon name="calendar" size={15} />{formatDate(visit.visit_date)}</div>
                  <h3>{visit.reason || "Clinic visit"}</h3>
                  <p>{visit.notes}</p>
                  {visit.prescription && (
                    <div className="rx"><strong>Prescription</strong><span>{visit.prescription}</span></div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty compact">
              <div><Icon name="file" size={26} /></div>
              <h3>No visits recorded</h3>
              <p>Start with a short note for today’s visit.</p>
              <Button onClick={onConsult}><Icon name="plus" /> Record today’s visit</Button>
            </div>
          )}
        </section>
        <aside className="documents">
          <div className="section-heading">
            <div>
              <h2>Documents</h2>
              <p>Reports and prescriptions.</p>
            </div>
          </div>
          {documents.length ? documents.map((doc) => (
            <button
              className="document"
              key={doc.id}
              type="button"
              onClick={async () => {
                try {
                  await downloadDocument(doc.id, doc.filename);
                } catch (err) {
                  notify(err.message || 'Download failed', true);
                }
              }}
            >
              <div className="doc-icon"><Icon name="file" size={19} /></div>
              <div>
                <strong>{doc.filename}</strong>
                <span>{doc.document_type} · {formatDate(doc.uploaded_at)}</span>
              </div>
              <Icon name="arrow" size={16} />
            </button>
          )) : (
            <div className="doc-empty"><Icon name="upload" size={22} /><p>No documents yet</p></div>
          )}
          <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
            <Icon name="upload" size={16} /> {uploading ? 'Uploading…' : 'Upload report'}
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              disabled={uploading}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        </aside>
      </div>
    </>
  );
}

function PatientForm({ title, eyebrow, initial, cancel, onSave, notify }) {
  const [data, setData] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    age: initial?.age ?? '',
    gender: initial?.gender || '',
    locality: initial?.locality || '',
    notes: initial?.notes || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: data.name.trim(),
        phone: data.phone || null,
        age: data.age === '' ? null : Number(data.age),
        gender: data.gender || null,
        locality: data.locality || null,
        notes: data.notes || null,
      };
      if (data.password) payload.password = data.password;
      await onSave(payload);
    } catch (err) {
      setError(err.message || 'Could not save patient');
      notify(err.message || 'Could not save patient', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="back" type="button" onClick={cancel}><Icon name="back" size={17} /> Back</button>
      <div className="form-wrap">
        <div className="form-intro">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>Add the details you have. You can complete the profile later.</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-section">
            <label>Patient name <b>*</b><input required autoFocus name="name" value={data.name} onChange={change} placeholder="e.g. Anita Sharma" /></label>
            <div className="form-grid">
              <label>Phone number <em>Optional</em><input name="phone" value={data.phone} onChange={change} placeholder="e.g. +91 98765 43210" /></label>
              <label>Age <em>Optional</em><input name="age" value={data.age} onChange={change} inputMode="numeric" placeholder="Years" /></label>
            </div>
            <div className="form-grid">
              <label>
                Gender <em>Optional</em>
                <select name="gender" value={data.gender} onChange={change}>
                  <option value="">Select</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              <label>Area / locality <em>Optional</em><input name="locality" value={data.locality} onChange={change} placeholder="e.g. Indiranagar" /></label>
            </div>
            <label>Portal password <em>Optional · min 12 chars</em><input type="password" name="password" value={data.password} onChange={change} minLength={12} placeholder="Set if patient should sign in" /></label>
            <label>Additional notes <em>Optional</em><textarea name="notes" value={data.notes} onChange={change} placeholder="Anything useful to remember about this patient…" rows="3" /></label>
          </div>
          <ErrorText message={error} />
          <p className="form-note"><Icon name="check" size={15} /> Only the patient name is required. You can update details any time.</p>
          <div className="form-actions">
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : <><Icon name="plus" /> Save patient</>}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

function Consultation({ patient, cancel, onSave, notify }) {
  const [data, setData] = useState({ reason: '', notes: '', prescription: '', visit_date: todayIso() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave({
        visit_date: data.visit_date,
        reason: data.reason || null,
        notes: data.notes,
        prescription: data.prescription || null,
      });
    } catch (err) {
      setError(err.message || 'Could not save visit');
      notify(err.message || 'Could not save visit', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="back" type="button" onClick={cancel}><Icon name="back" size={17} /> Back to {patient.name}</button>
      <div className="form-wrap consult">
        <div className="form-intro">
          <p className="eyebrow">NEW CONSULTATION</p>
          <h1>Today's visit</h1>
          <div className="patient-chip">
            <Avatar patient={patient} />
            <span>Patient <strong>{patient.name}</strong></span>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="form-section">
            <div className="visit-date-input">
              <label>Visit date<input type="date" name="visit_date" value={data.visit_date} onChange={change} required /></label>
              <Icon name="calendar" size={18} />
            </div>
            <label>Reason for visit <em>Optional</em><input name="reason" value={data.reason} onChange={change} placeholder="e.g. Follow-up for cough" /></label>
            <label>Doctor's notes <b>*</b><textarea required name="notes" value={data.notes} onChange={change} rows="6" placeholder="Write your notes in the same way you would in a register…" /></label>
            <label>Prescription <em>Optional</em><textarea name="prescription" value={data.prescription} onChange={change} rows="3" placeholder="Free-text entry. No automatic suggestions." /></label>
          </div>
          <ErrorText message={error} />
          <div className="form-actions">
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : <><Icon name="check" /> Save visit</>}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

function DoctorAppointments({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reschedule, setReschedule] = useState({});
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await appointmentsApi.list());
    } catch (err) {
      notify(err.message || 'Could not load appointments', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, payload) => {
    setBusyId(id);
    try {
      await appointmentsApi.update(id, payload);
      await load();
      setEditingId(null);
      notify(`Appointment ${payload.status}. Patient notified.`);
    } catch (err) {
      notify(err.message || 'Update failed', true);
    } finally {
      setBusyId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  const countFor = (status) => (status === 'all' ? items.length : items.filter((i) => i.status === status).length);

  return (
    <>
      <header className="page-header simple">
        <div>
          <p className="eyebrow">APPOINTMENTS</p>
          <h1>Appointment requests</h1>
          <p className="muted">Approve, reschedule, or cancel patient requests with automated patient notifications.</p>
        </div>
      </header>

      <div className="appointment-filter-tabs">
        <button
          type="button"
          className={`appointment-filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({countFor('all')})
        </button>
        <button
          type="button"
          className={`appointment-filter-tab ${filter === 'requested' ? 'active' : ''}`}
          onClick={() => setFilter('requested')}
        >
          Pending ({countFor('requested')})
        </button>
        <button
          type="button"
          className={`appointment-filter-tab ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved ({countFor('approved')})
        </button>
        <button
          type="button"
          className={`appointment-filter-tab ${filter === 'rescheduled' ? 'active' : ''}`}
          onClick={() => setFilter('rescheduled')}
        >
          Rescheduled ({countFor('rescheduled')})
        </button>
        <button
          type="button"
          className={`appointment-filter-tab ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({countFor('cancelled')})
        </button>
      </div>

      {loading ? <LoadingBlock label="Loading appointments…" /> : (
        <div className="appointment-manage">
          {filteredItems.map((item) => {
            const draft = reschedule[item.id] || {
              preferred_date: item.preferred_date,
              preferred_time: item.preferred_time,
              doctor_note: item.doctor_note || '',
            };
            const isPending = item.status === 'requested' || item.status === 'rescheduled';
            const showActions = isPending || editingId === item.id;

            return (
              <article className="appointment-card" key={item.id}>
                <div className="appointment-card-head">
                  <div>
                    <strong>{item.patient_name || `Patient #${item.patient_id}`}</strong>
                    <span className={`status-pill status-${item.status}`}>{item.status}</span>
                  </div>
                  <p>
                    <Icon name="calendar" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {formatDate(item.preferred_date)} · {item.preferred_time}
                  </p>
                  {item.reason && <p className="muted">Reason: {item.reason}</p>}
                  {item.doctor_note && <p className="doctor-note">Clinic Note: {item.doctor_note}</p>}
                </div>

                {!showActions && (
                  <div style={{ marginTop: 4 }}>
                    <Button
                      variant="secondary"
                      className="small"
                      onClick={() => setEditingId(item.id)}
                    >
                      Change status / Add note
                    </Button>
                  </div>
                )}

                {showActions && (
                  <div className="appointment-actions">
                    <div className="form-grid">
                      <label>
                        Date
                        <input
                          type="date"
                          value={draft.preferred_date}
                          onChange={(e) => setReschedule({
                            ...reschedule,
                            [item.id]: { ...draft, preferred_date: e.target.value },
                          })}
                        />
                      </label>
                      <label>
                        Time slot
                        <select
                          value={draft.preferred_time}
                          onChange={(e) => setReschedule({
                            ...reschedule,
                            [item.id]: { ...draft, preferred_time: e.target.value },
                          })}
                        >
                          <option>9:30 AM – 10:00 AM</option>
                          <option>11:00 AM – 11:30 AM</option>
                          <option>4:30 PM – 5:00 PM</option>
                          <option>6:00 PM – 6:30 PM</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Note to patient <em>Optional · included in patient notification</em>
                      <input
                        value={draft.doctor_note}
                        onChange={(e) => setReschedule({
                          ...reschedule,
                          [item.id]: { ...draft, doctor_note: e.target.value },
                        })}
                        placeholder="e.g. Please bring recent blood test reports"
                      />
                    </label>
                    <div className="form-actions left">
                      <Button
                        disabled={busyId === item.id}
                        onClick={() => act(item.id, {
                          status: 'approved',
                          preferred_date: draft.preferred_date,
                          preferred_time: draft.preferred_time,
                          doctor_note: draft.doctor_note || null,
                        })}
                      >
                        {busyId === item.id ? 'Updating…' : 'Approve'}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busyId === item.id}
                        onClick={() => act(item.id, {
                          status: 'rescheduled',
                          preferred_date: draft.preferred_date,
                          preferred_time: draft.preferred_time,
                          doctor_note: draft.doctor_note || null,
                        })}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busyId === item.id}
                        onClick={() => act(item.id, {
                          status: 'cancelled',
                          doctor_note: draft.doctor_note || null,
                        })}
                      >
                        Cancel
                      </Button>
                      {!isPending && (
                        <button
                          type="button"
                          className="link-button"
                          style={{ marginLeft: 'auto', fontSize: '12px' }}
                          onClick={() => setEditingId(null)}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {!filteredItems.length && (
            <p className="portal-empty">
              {filter === 'all'
                ? 'No appointment requests yet.'
                : `No ${filter} appointments found.`}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Settings({ doctor, logout }) {
  return (
    <>
      <header className="page-header simple">
        <div>
          <p className="eyebrow">SETTINGS</p>
          <h1>Clinic settings</h1>
          <p className="muted">Your account and clinic details.</p>
        </div>
      </header>
      <div className="settings-wrap">
        <section className="settings-card">
          <h2>Doctor & clinic</h2>
          <p>These details are shown only to you.</p>
          <div className="form-grid">
            <label>Your name<input value={doctor.name} readOnly /></label>
            <label>Clinic name<input value={doctor.clinic_name} readOnly /></label>
          </div>
          <label>Phone<input value={doctor.phone} readOnly /></label>
          <Button variant="secondary" onClick={logout}>Sign out</Button>
        </section>
        <section className="settings-card security">
          <div className="lock"><Icon name="check" /></div>
          <div>
            <h2>Your records are private</h2>
            <p>ClinicLog keeps patient records organized under your account. Always use a secure password and sign out on shared devices.</p>
          </div>
        </section>
      </div>
    </>
  );
}

function PatientLogin({ back, onSuccess, notify }) {
  const [phone, setPhone] = useState('9876543120');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = await authApi.patientLogin(phone.trim(), password);
      await onSuccess(token);
    } catch (err) {
      setError(err.message || 'Could not sign in');
      notify(err.message || 'Could not sign in', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="patient-login">
      <div className="portal-brand">
        <span className="brand-mark"><span /><span /><span /></span>
        ClinicLog
      </div>
      <button className="back portal-back" type="button" onClick={back}>
        <Icon name="back" size={17} /> Back
      </button>
      <section className="login-card">
        <div className="login-symbol"><Icon name="users" size={27} /></div>
        <p className="eyebrow">PATIENT ACCESS</p>
        <h1>Welcome to your clinic</h1>
        <p>Sign in with your registered phone number and password to view your health record, share documents, or request an appointment.</p>
        <div className="demo-hint">
          <strong>Demo Patient Account</strong>
          Phone: <code>9876543120</code> · Password: <code>AnitaSharma12</code>
        </div>
        <form onSubmit={submit}>
          <label>
            Phone number
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98765 43120"
              inputMode="tel"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your portal password"
              autoComplete="current-password"
            />
          </label>
          <ErrorText message={error} />
          <Button type="submit" className="full" disabled={loading}>
            {loading ? 'Signing in…' : <>Sign in securely <Icon name="arrow" size={16} /></>}
          </Button>
        </form>
      </section>
      <p className="login-foot">
        <Icon name="check" size={14} /> Your information is visible only to you and your clinic.
      </p>
    </main>
  );
}

function PatientPortal({ patient, setPatient, page, setPage, logout, notify, toast, toastError }) {
  const tab = page.replace('patient', '') || 'home';
  const routes = [
    ['home', 'Home', 'home'],
    ['details', 'My details', 'users'],
    ['documents', 'Documents', 'file'],
    ['appointments', 'Appointments', 'calendar'],
    ['notifications', 'Updates', 'clock'],
  ];

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-brand">
          <span className="brand-mark"><span /><span /><span /></span>
          ClinicLog <small>Patient portal</small>
        </div>
        <div className="portal-user">
          <Avatar patient={patient} />
          <span>{patient.name}</span>
          <button type="button" onClick={logout}>Log out</button>
        </div>
      </header>
      <div className="portal-content">
        <aside className="portal-nav">
          {routes.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'active' : ''}
              onClick={() => setPage(`patient${id}`)}
            >
              <Icon name={icon} />{label}
            </button>
          ))}
          <div className="clinic-card">
            <strong>Your clinic</strong>
            <span>Private patient portal</span>
            <small>For urgent care, please call the clinic.</small>
          </div>
        </aside>
        <main className="portal-main">
          {tab === 'home' && <PatientHome patient={patient} setPage={setPage} notify={notify} />}
          {tab === 'details' && (
            <PatientDetails
              patient={patient}
              notify={notify}
              onSaved={(updated) => setPatient({ ...patient, ...updated })}
            />
          )}
          {tab === 'documents' && (
            <PatientDocuments
              patient={patient}
              notify={notify}
              onChanged={async () => setPatient(await meApi.get())}
            />
          )}
          {tab === 'appointments' && <PatientAppointments notify={notify} />}
          {tab === 'notifications' && <PatientNotifications notify={notify} />}
        </main>
      </div>
      <Toast message={toast} error={toastError} />
    </div>
  );
}

function PatientHome({ patient, setPage, notify }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const consultations = patient.consultations || [];

  useEffect(() => {
    (async () => {
      try {
        setAppointments(await meApi.appointments());
      } catch (err) {
        notify(err.message || 'Could not load appointments', true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latest = appointments[0];
  const displayedVisits = showAllVisits ? consultations : consultations.slice(0, 2);

  return (
    <>
      <p className="eyebrow">YOUR HEALTH RECORD</p>
      <h1>Hello, {patient.name.split(' ')[0]}</h1>
      <p className="muted">A simple way to keep your clinic information up to date.</p>
      <section className="portal-hero">
        <div>
          <span className="eyebrow">NEXT STEP</span>
          <h2>{latest ? `Appointment ${latest.status}` : 'Need to see the doctor?'}</h2>
          <p>
            {latest
              ? `${formatDate(latest.preferred_date)} · ${latest.preferred_time}`
              : 'Request a convenient time and your clinic will confirm it.'}
          </p>
          <Button onClick={() => setPage('patientappointments')}>
            {latest ? 'View appointments' : 'Request an appointment'} <Icon name="arrow" size={16} />
          </Button>
        </div>
        <div className="calendar-orb"><Icon name="calendar" size={32} /></div>
      </section>
      <div className="portal-cards">
        <button type="button" onClick={() => setPage('patientdetails')}>
          <span className="portal-card-icon"><Icon name="users" /></span>
          <strong>Keep details up to date</strong>
          <small>Phone, age, locality and more</small>
          <Icon name="arrow" size={16} />
        </button>
        <button type="button" onClick={() => setPage('patientdocuments')}>
          <span className="portal-card-icon peach"><Icon name="upload" /></span>
          <strong>Share a document</strong>
          <small>Upload a report or prescription</small>
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <section className="portal-section">
        <div className="section-heading">
          <div>
            <h2>{showAllVisits ? 'All visits' : 'Recent visits'}</h2>
            <p>Notes and prescriptions shared by your doctor.</p>
          </div>
          {consultations.length > 2 && (
            <button
              type="button"
              className="link-button"
              onClick={() => setShowAllVisits(!showAllVisits)}
            >
              {showAllVisits ? 'Show less' : `View all (${consultations.length})`} <Icon name="arrow" size={15} />
            </button>
          )}
        </div>
        {loading ? <LoadingBlock /> : consultations.length ? (
          <div className="patient-visit">
            {displayedVisits.map((visit) => (
              <article key={visit.id}>
                <span>{formatDate(visit.visit_date)}</span>
                <strong>{visit.reason || 'Clinic visit'}</strong>
                <p>{visit.notes}</p>
                {visit.prescription && (
                  <div className="rx" style={{ marginTop: '8px' }}>
                    <strong>Prescription</strong>
                    <span>{visit.prescription}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="portal-empty">There are no visit notes in your record yet.</p>
        )}
      </section>
    </>
  );
}

function PatientDetails({ patient, onSaved, notify }) {
  const [data, setData] = useState({
    phone: patient.phone || '',
    age: patient.age ?? '',
    gender: patient.gender || 'Not specified',
    locality: patient.locality || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updated = await meApi.update({
        phone: data.phone || null,
        age: data.age === '' ? null : Number(data.age),
        gender: data.gender || null,
        locality: data.locality || null,
      });
      onSaved(updated);
      notify('Your details have been updated');
    } catch (err) {
      setError(err.message || 'Could not update details');
      notify(err.message || 'Could not update details', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <p className="eyebrow">MY DETAILS</p>
      <h1>Keep your details current</h1>
      <p className="muted details-lead">This helps the clinic identify your record. Only update information you are comfortable sharing.</p>
      <form onSubmit={submit} className="patient-form">
        <div className="form-section">
          <label>Your name<input value={patient.name} readOnly /></label>
          <div className="form-grid">
            <label>Phone number<input name="phone" value={data.phone} onChange={change} /></label>
            <label>Age<input name="age" value={data.age} onChange={change} /></label>
          </div>
          <div className="form-grid">
            <label>
              Gender
              <select name="gender" value={data.gender} onChange={change}>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
                <option>Not specified</option>
              </select>
            </label>
            <label>Area / locality<input name="locality" value={data.locality} onChange={change} /></label>
          </div>
        </div>
        <ErrorText message={error} />
        <div className="form-actions">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : <><Icon name="check" /> Save my details</>}</Button>
        </div>
      </form>
    </>
  );
}

function PatientDocuments({ patient, notify, onChanged }) {
  const documents = patient.documents || [];
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await meApi.uploadDocument(file);
      await onChanged();
      notify('Your document was shared with the clinic');
    } catch (err) {
      notify(err.message || 'Upload failed', true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <p className="eyebrow">MY DOCUMENTS</p>
      <h1>Reports & prescriptions</h1>
      <p className="muted details-lead">Share a document with your clinic when it is useful for your care.</p>
      <section className="document-panel">
        {documents.length ? documents.map((doc) => (
          <button
            className="document"
            key={doc.id}
            type="button"
            onClick={async () => {
              try {
                await downloadDocument(doc.id, doc.filename);
              } catch (err) {
                notify(err.message || 'Download failed', true);
              }
            }}
          >
            <div className="doc-icon"><Icon name="file" size={19} /></div>
            <div>
              <strong>{doc.filename}</strong>
              <span>{doc.document_type} · shared {formatDate(doc.uploaded_at)}</span>
            </div>
          </button>
        )) : <p className="portal-empty">No documents have been shared yet.</p>}
        <label className={`portal-upload ${uploading ? 'disabled' : ''}`}>
          <Icon name="upload" size={19} />
          <span>
            <strong>{uploading ? 'Uploading…' : 'Upload a document'}</strong>
            <small>PDF, JPG or PNG · shared only with your clinic</small>
          </span>
          <input
            type="file"
            accept=".pdf,image/jpeg,image/png"
            disabled={uploading}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </section>
    </>
  );
}

function PatientAppointments({ notify }) {
  const [appointments, setAppointments] = useState([]);
  const [data, setData] = useState({ preferred_date: '', preferred_time: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const load = async () => {
    setLoading(true);
    try {
      setAppointments(await meApi.appointments());
    } catch (err) {
      notify(err.message || 'Could not load appointments', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await meApi.requestAppointment({
        preferred_date: data.preferred_date,
        preferred_time: data.preferred_time,
        reason: data.reason || null,
      });
      setData({ preferred_date: '', preferred_time: '', reason: '' });
      await load();
      notify('Appointment request sent to your clinic');
    } catch (err) {
      setError(err.message || 'Could not send request');
      notify(err.message || 'Could not send request', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="eyebrow">APPOINTMENTS</p>
      <h1>Request an appointment</h1>
      <p className="muted details-lead">Choose a preferred time. The clinic will review and confirm availability.</p>
      {loading ? <LoadingBlock label="Loading appointments…" /> : appointments.length > 0 ? (
        <div className="appointment-list">
          {appointments.map((item) => (
            <div key={item.id}>
              <div className="appointment-date">
                <Icon name="calendar" />
                <strong>{formatDate(item.preferred_date)}</strong>
                <span className={`status-pill status-${item.status}`} style={{ marginLeft: 'auto' }}>
                  {item.status}
                </span>
              </div>
              <span>Time: {item.preferred_time}</span>
              {item.reason && <p>{item.reason}</p>}
              {item.doctor_note && (
                <p style={{ marginTop: '6px', fontStyle: 'italic', color: '#385549' }}>
                  Clinic note: {item.doctor_note}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="portal-empty">No appointment requests yet. Choose a date and time below to request an appointment.</p>
      )}
      <form onSubmit={submit} className="patient-form">
        <div className="form-section">
          <div className="form-grid">
            <label>
              Preferred date
              <input
                required
                type="date"
                name="preferred_date"
                min={todayIso()}
                value={data.preferred_date}
                onChange={change}
              />
            </label>
            <label>
              Preferred time
              <select required name="preferred_time" value={data.preferred_time} onChange={change}>
                <option value="">Select a time</option>
                <option>9:30 AM – 10:00 AM</option>
                <option>11:00 AM – 11:30 AM</option>
                <option>4:30 PM – 5:00 PM</option>
                <option>6:00 PM – 6:30 PM</option>
              </select>
            </label>
          </div>
          <label>Reason for visit <em>Optional</em><textarea name="reason" value={data.reason} onChange={change} rows="3" placeholder="A short note for the clinic…" /></label>
        </div>
        <ErrorText message={error} />
        <div className="form-actions">
          <Button type="submit" disabled={saving}>{saving ? 'Sending…' : <><Icon name="calendar" /> Send request</>}</Button>
        </div>
      </form>
    </>
  );
}

function PatientNotifications({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setItems(await meApi.notifications());
      } catch (err) {
        notify(err.message || 'Could not load updates', true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <p className="eyebrow">UPDATES</p>
      <h1>Messages from your clinic</h1>
      <p className="muted details-lead">Approvals, reschedules, and cancellations appear here.</p>
      {loading ? <LoadingBlock /> : (
        <div className="notification-list">
          {items.map((item) => (
            <article key={item.id}>
              <span>{formatDateTime(item.created_at)}</span>
              <p>{item.message}</p>
            </article>
          ))}
          {!items.length && <p className="portal-empty">No updates yet.</p>}
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
