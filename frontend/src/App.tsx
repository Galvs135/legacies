import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AiAssistantPage } from "./pages/AiAssistantPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeadsPage } from "./pages/LeadsPage";
import { PipelinePage } from "./pages/PipelinePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { AtendimentoPage } from "./pages/AtendimentoPage";
import { WhatsAppPage } from "./pages/WhatsAppPage";

export function App() {
  const location = useLocation();
  const isAuthenticated = Boolean(localStorage.getItem("legalytics-access-token"));

  if (!isAuthenticated && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }
  if (isAuthenticated && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated) {
    return (
      <Routes location={location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <div key={location.pathname} className="route-transition">
        <Routes location={location}>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/atendimento" element={<AtendimentoPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/ia" element={<AiAssistantPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}
