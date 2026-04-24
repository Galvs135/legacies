import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { api } from "../lib/api";

type LocalLead = {
  id: string;
  name: string;
  email: string;
  source: "website" | "referral" | "social" | "other";
  createdAt: string;
  notes?: string;
};

export function LeadsPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<"website" | "referral" | "social" | "other">("website");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [recentLeads, setRecentLeads] = useState<LocalLead[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLeads = async () => {
    const leads = await api.getLeads();
    setRecentLeads(
      leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        source: lead.source as LocalLead["source"],
        notes: lead.notes,
        createdAt: lead.createdAt
      }))
    );
  };

  useEffect(() => {
    loadLeads().catch(() => undefined);
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.createLead({ name, email, source, notes });
      await loadLeads();
      setMessage(t("leads.success"));
      setError("");
      setName("");
      setEmail("");
      setNotes("");
      setIsLeadModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cadastrar lead.");
    }
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentLeads;
    return recentLeads.filter((lead) => lead.name.toLowerCase().includes(q) || lead.email.toLowerCase().includes(q));
  }, [recentLeads, search]);

  const bySource = useMemo(
    () => ({
      website: recentLeads.filter((x) => x.source === "website").length,
      referral: recentLeads.filter((x) => x.source === "referral").length,
      social: recentLeads.filter((x) => x.source === "social").length
    }),
    [recentLeads]
  );

  return (
    <div className="page">
      <div className="page-header-actions">
        <div>
          <h2>{t("leads.title")}</h2>
          <p className="muted">{t("leads.subtitle")}</p>
        </div>
        <button type="button" onClick={() => setIsLeadModalOpen(true)}>
          {t("leads.addNewButton")}
        </button>
      </div>

      <section className="grid-4">
        <KpiCard title={t("leads.recent")} value={String(recentLeads.length)} />
        <KpiCard title={t("leads.website")} value={String(bySource.website)} />
        <KpiCard title={t("leads.referral")} value={String(bySource.referral)} />
        <KpiCard title={t("leads.social")} value={String(bySource.social)} />
      </section>

      <section className="panel leads-team-panel">
        <div className="leads-panel-header">
          <h3>{t("leads.queue")}</h3>
          <label>
            {t("common.search")}
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("leads.searchPlaceholder")} />
          </label>
        </div>

        <div className="lead-card-grid">
          {filteredLeads.map((lead) => (
            <article key={lead.id} className="lead-card">
              <header className="lead-card-header">
                <span className="lead-avatar">{initialsOf(lead.name)}</span>
                <div>
                  <strong>{lead.name}</strong>
                  <small>{lead.email}</small>
                </div>
              </header>
              <p>{lead.notes?.trim() || t("leads.noNotes")}</p>
              <footer className="lead-card-footer">
                <span className="tag">{toSourceLabel(lead.source, t)}</span>
                <small>{new Date(lead.createdAt).toLocaleDateString()}</small>
              </footer>
            </article>
          ))}
        </div>

        {message && <span className="success">{message}</span>}
        {error && <span className="error-text">{error}</span>}
      </section>

      {isLeadModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h3>{t("leads.modalTitle")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsLeadModalOpen(false)}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <form className="form" onSubmit={onSubmit}>
              <label>
                {t("leads.name")}
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                {t("leads.email")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label>
                {t("leads.source")}
                <select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                  <option value="website">{t("leads.website")}</option>
                  <option value="referral">{t("leads.referral")}</option>
                  <option value="social">{t("leads.social")}</option>
                  <option value="other">{t("leads.other")}</option>
                </select>
              </label>
              <label>
                {t("leads.notes")}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </label>
              <button type="submit">{t("leads.saveLead")}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function toSourceLabel(source: LocalLead["source"], t: (key: string) => string): string {
  if (source === "website") return t("leads.website");
  if (source === "referral") return t("leads.referral");
  if (source === "social") return t("leads.social");
  return t("leads.other");
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
