import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminLogin from './pages/Admin/AdminLogin';
import PatientLogin from './pages/Patient/PatientLogin';
import PatientDashboard from './pages/Patient/PatientDashboard';
import DoctorLogin from './pages/Doctor/DoctorLogin';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import ConsultationRoom from './pages/Doctor/ConsultationRoom';
import PatientConsultationRoom from './pages/Patient/PatientConsultationRoom';
import PatientProfile from './pages/Patient/PatientProfile';
import PatientPayment from './pages/Patient/PatientPayment';
import HomePage from './pages/HomePage';
import VerifyDocument from './pages/VerifyDocument';
import Header from './components/Header';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* Patient Routes */}
            <Route path="/patient/payment" element={<PatientPayment />} />
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/consultation/:roomId" element={<PatientConsultationRoom />} />
            <Route path="/patient/profile" element={<PatientProfile />} />

            {/* Doctor Routes */}
            <Route path="/doctor/login" element={<DoctorLogin />} />
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/consultation/:roomId" element={<ConsultationRoom />} />
            <Route path="/validar" element={<VerifyDocument />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
