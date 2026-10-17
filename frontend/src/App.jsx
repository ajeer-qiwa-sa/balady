import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddCertificate from "./pages/AddCertificate";
import EditCertificate from "./pages/EditCertificate";
import CertificatePage from "./pages/CertificatePage";
import CertificateView from "./pages/CertificateView";
import AllCertificates from "./pages/AllCertificates";
import IslamicReminder from "./components/IslamicReminder";
import AuthMiddleware from "./components/AuthMiddleware";

function App() {
  const location = useLocation();
  const isViewPage = location.pathname.startsWith('/view/');

  return (
    <>
      {!isViewPage && <IslamicReminder />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/view/:id" element={<CertificateView />} />

        {/* Protected Admin Routes (Guarded by AuthMiddleware) */}
        <Route element={<AuthMiddleware />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-certificate" element={<AddCertificate />} />
          <Route path="/edit-certificate/:id" element={<EditCertificate />} />
          <Route path="/certificate/:id" element={<CertificatePage />} />
          <Route path="/certificates" element={<AllCertificates />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
