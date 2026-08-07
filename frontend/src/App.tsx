import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import AdminLogin from './pages/Admin/AdminLogin';
import DoctorLogin from './pages/Doctor/DoctorLogin';
import PatientLogin from './pages/Patient/PatientLogin';
import PatientPayment from './pages/Patient/PatientPayment';

// App Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import ConsultationRoom from './pages/Doctor/ConsultationRoom';
import PatientDashboard from './pages/Patient/PatientDashboard';
import PatientConsultationRoom from './pages/Patient/PatientConsultationRoom';
import PatientProfile from './pages/Patient/PatientProfile';

// Public Pages
import HomePage from './pages/HomePage';
import VerifyDocument from './pages/VerifyDocument';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / Landing */}
        <Route path="/" element={<HomePage />} />
        <Route path="/validar" element={<VerifyDocument />} />

        {/* Auth Pages (minimal header layout) */}
        <Route element={<AuthLayout />}>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route path="/patient/payment" element={<PatientPayment />} />
        </Route>

        {/* App Pages (sidebar layout) */}
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/profile" element={<PatientProfile />} />
        </Route>

        {/* Consultation Rooms (fullscreen, no layout wrapper) */}
        <Route path="/doctor/consultation/:roomId" element={<ConsultationRoom />} />
        <Route path="/patient/consultation/:roomId" element={<PatientConsultationRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
