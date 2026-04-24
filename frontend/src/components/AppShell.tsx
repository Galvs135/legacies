import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme";
import { Languages, LogOut, MoonStar, Sun } from "lucide-react";
import { api } from "../lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { mode, toggle } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navItems = [
    { to: "/", label: t("nav.dashboard"), icon: "◉" },
    { to: "/leads", label: t("nav.leads"), icon: "◎" },
    { to: "/pipeline", label: t("nav.pipeline"), icon: "◇" },
    { to: "/whatsapp", label: t("nav.whatsapp"), icon: "◍" },
    { to: "/ia", label: t("nav.ai"), icon: "◌" },
    { to: "/relatorios", label: t("nav.reports"), icon: "◈" },
    { to: "/configuracoes", label: t("nav.settings"), icon: "◐" }
  ];

  const themeClass = getThemeClass(location.pathname);
  const nextLanguage = getNextLanguage(i18n.language);

  return (
    <div className={`app-shell ${themeClass}${expanded ? " expanded" : ""} mode-${mode}`}>
      <aside className="sidebar" onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
        <h1 className="brand">
          <span className="brand-short">LG</span>
          <span className="brand-full">Legalytics</span>
        </h1>
        <p className="brand-subtitle">{t("shell.subtitle")}</p>
        <nav className="menu">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
              end={item.to === "/"}
            >
              <span className="menu-short" aria-hidden>
                {item.icon}
              </span>
              <span className="menu-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-controls">
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={toggle}
            title={t("shell.theme")}
            aria-label={t("shell.theme")}
          >
            {mode === "dark" ? <Sun size={18} /> : <MoonStar size={18} />}
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={() => void i18n.changeLanguage(nextLanguage)}
            title={t("shell.language")}
            aria-label={t("shell.language")}
          >
            <Languages size={18} />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn sidebar-icon-btn-logout"
            onClick={() => {
              api.clearSession();
              window.location.href = "/login";
            }}
            title={t("settings.logout")}
            aria-label={t("settings.logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <section className="content">{children}</section>
    </div>
  );
}

function getThemeClass(pathname: string): string {
  if (pathname.startsWith("/leads")) return "theme-leads";
  if (pathname.startsWith("/pipeline")) return "theme-pipeline";
  if (pathname.startsWith("/atendimento")) return "theme-attendance";
  if (pathname.startsWith("/whatsapp")) return "theme-whatsapp";
  if (pathname.startsWith("/ia")) return "theme-ai";
  if (pathname.startsWith("/relatorios")) return "theme-reports";
  if (pathname.startsWith("/configuracoes")) return "theme-settings";
  return "theme-dashboard";
}

function getNextLanguage(current: string): "pt-BR" | "en-US" | "es-ES" {
  if (current === "pt-BR") return "en-US";
  if (current === "en-US") return "es-ES";
  return "pt-BR";
}
