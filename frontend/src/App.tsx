import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

// ─── PÁGINAS DE AUTH ─────────────────────────────────────────────────────────
// LoginPage unifica os antigos AdminLogin, DoctorLogin e PatientLogin.
// A role é selecionada pelo usuário via tabs dentro do próprio componente.
import LoginPage from './pages/LoginPage';
import PatientPayment from './pages/Patient/PatientPayment';

// ─── PÁGINAS INTERNAS (com sidebar / AppLayout) ───────────────────────────────
import AdminDashboard from './pages/Admin/AdminDashboard';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import ConsultationRoom from './pages/Doctor/ConsultationRoom';
import PatientDashboard from './pages/Patient/PatientDashboard';
import PatientConsultationRoom from './pages/Patient/PatientConsultationRoom';
import PatientProfile from './pages/Patient/PatientProfile';

// ─── PÁGINAS PÚBLICAS ─────────────────────────────────────────────────────────
import HomePage from './pages/HomePage';
import VerifyDocument from './pages/VerifyDocument';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── PÚBLICO / LANDING ───────────────────────────────────────────── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/validar" element={<VerifyDocument />} />

        {/* ── AUTH (AuthLayout com painel decorativo) ─────────────────────────
            /login           → LoginPage (tab padrão: Paciente)
            /login?role=...  → LoginPage com tab pré-selecionada
            /login?mode=register → LoginPage em modo cadastro de paciente

            Aliases das rotas antigas: redirecionam para /login com ?role correto,
            garantindo compatibilidade com links externos e bookmarks salvos.
        */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />

          {/* Aliases de compatibilidade — rotas antigas redirecionam para a nova */}
          <Route path="/admin/login"   element={<Navigate to="/login?role=admin"   replace />} />
          <Route path="/doctor/login"  element={<Navigate to="/login?role=doctor"  replace />} />
          <Route path="/patient/login" element={<Navigate to="/login?role=patient" replace />} />

          {/* Pagamento do paciente (mantém AuthLayout pois é um passo do fluxo de auth) */}
          <Route path="/patient/payment" element={<PatientPayment />} />
        </Route>

        {/* ── PÁGINAS INTERNAS (AppLayout com sidebar) ───────────────────────── */}
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard"   element={<AdminDashboard />} />
          <Route path="/doctor/dashboard"  element={<DoctorDashboard />} />
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/profile"   element={<PatientProfile />} />
        </Route>

        {/* ── SALAS DE CONSULTA (fullscreen, sem layout wrapper) ─────────────── */}
        <Route path="/doctor/consultation/:roomId"  element={<ConsultationRoom />} />
        <Route path="/patient/consultation/:roomId" element={<PatientConsultationRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
