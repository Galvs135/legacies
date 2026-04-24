import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      console.log("[Login payload]", {
        email: email.trim(),
        password
      });
      const result = await api.login(email.trim(), password);
      localStorage.setItem("legalytics-access-token", result.accessToken);
      localStorage.setItem("legalytics-user-id", result.user.id);
      localStorage.setItem("legalytics-user-role", result.user.role);
      navigate("/", { replace: true });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-card">
        <h1>{t("login.title")}</h1>
        <p className="muted">{t("login.subtitle")}</p>
        <form className="form" onSubmit={onSubmit}>
          <label>
            {t("login.email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {t("login.password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" disabled={isLoading}>
            {isLoading ? t("login.submitting") : t("login.submit")}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
        <p className="muted">{t("login.footer")}</p>
      </section>
    </main>
  );
}
