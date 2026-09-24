import { Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import ServiceDetail from "./pages/ServiceDetail";
import TaskStatus from "./pages/TaskStatus";
import TaskResult from "./pages/TaskResult";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminPanel from "./pages/admin/AdminPanel";

// Глубокая ссылка от бота: /#/?service=<id>
function Root() {
  const [params] = useSearchParams();
  const service = params.get("service");
  if (service) return <Navigate to={`/service/${encodeURIComponent(service)}`} replace />;
  return <Home />;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/profile" element={<Profile />} />
          {/* Формы услуг доступны только по прямой ссылке (через бота) */}
          <Route path="/service/:id" element={<ServiceDetail />} />
          <Route path="/task/:id" element={<TaskStatus />} />
          <Route path="/task/:id/result" element={<TaskResult />} />
          {/* Админ-панель (для десктопа): вход по паролю из VITE_ADMIN_PASSWORD */}
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/history" element={<Navigate to="/" replace />} />
          <Route path="/services" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
