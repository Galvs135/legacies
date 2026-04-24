import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { api } from "../lib/api";
import { CaseItem, InteractionItem, InteractionKind } from "../lib/types";

const interactionOptions: Array<{ value: InteractionKind; label: string }> = [
  { value: "meeting", label: "Reuniao" },
  { value: "call", label: "Ligacao" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "note", label: "Nota interna" }
];

export function AtendimentoPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "pt-BR";
  const [searchParams] = useSearchParams();
  const selectedCaseId = searchParams.get("caseId") ?? "";
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [kind, setKind] = useState<InteractionKind>("meeting");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProbability, setIsSavingProbability] = useState(false);
  const [probabilityPercent, setProbabilityPercent] = useState(0);
  const [error, setError] = useState("");
  const [probabilityMessage, setProbabilityMessage] = useState("");

  useEffect(() => {
    if (!selectedCaseId) return;
    api
      .getCaseById(selectedCaseId)
      .then((item) => {
        setSelectedCase(item);
        setProbabilityPercent(Math.round((item?.closeProbability ?? 0) * 100));
      })
      .catch(() => setSelectedCase(null));
    api.getCaseInteractions(selectedCaseId).then(setInteractions).catch(() => setInteractions([]));
  }, [selectedCaseId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCaseId || !content.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      await api.addCaseInteraction(selectedCaseId, {
        kind,
        content: content.trim()
      });
      const updated = await api.getCaseInteractions(selectedCaseId);
      setInteractions(updated);
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar historico.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalInteractions = interactions.length;
  const lastInteraction = interactions[0];

  const saveProbability = async () => {
    if (!selectedCaseId || !selectedCase) return;
    setIsSavingProbability(true);
    setProbabilityMessage("");
    setError("");
    try {
      const response = await api.updateCaseProbability(selectedCaseId, probabilityPercent / 100);
      if (response.found && response.case) {
        setSelectedCase(response.case);
      } else {
        setSelectedCase(await api.getCaseById(selectedCaseId));
      }
      setProbabilityMessage(t("attendance.probabilitySaved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar probabilidade.");
    } finally {
      setIsSavingProbability(false);
    }
  };

  return (
    <div className="page">
      <h2>{t("attendance.title")}</h2>
      <p className="muted">{t("attendance.subtitle")}</p>

      {!selectedCaseId && (
        <section className="panel">
          <p>{t("attendance.noneSelected")}</p>
          <Link to="/pipeline">{t("attendance.backToPipeline")}</Link>
        </section>
      )}

      <section className="grid-4">
        <KpiCard title={t("attendance.selectedCase")} value={selectedCase ? selectedCase.title : t("attendance.noneSelected")} />
        <KpiCard title={t("attendance.client")} value={selectedCase ? selectedCase.clientName : "-"} />
        <KpiCard title={t("attendance.interactions")} value={String(totalInteractions)} />
        <KpiCard
          title={t("attendance.lastContact")}
          value={lastInteraction ? new Date(lastInteraction.createdAt).toLocaleDateString(locale) : t("attendance.noRecord")}
        />
      </section>

      <section className="split-2 attendance-layout">
        <article className="panel attendance-main-panel">
          <h3>{t("attendance.data")}</h3>

          {selectedCase && (
            <div className="inline-tags attendance-data-tags">
              <span className="tag">{t("attendance.stage")}: {selectedCase.stage}</span>
              <span className="tag">{t("attendance.actionValue")}: {selectedCase.actionValue.toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
              <span className="tag">{t("attendance.client")}: {selectedCase.clientName}</span>
            </div>
          )}

          {selectedCase && (
            <div className="attendance-probability probability-editor">
              <div className="pipeline-probability-row">
                <span>{t("attendance.closeProbability")}</span>
                <strong>{probabilityPercent}%</strong>
              </div>
              <div className="pipeline-probability-bar">
                <span style={{ width: `${Math.max(6, probabilityPercent)}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={probabilityPercent}
                onChange={(event) => setProbabilityPercent(Number(event.target.value))}
              />
              <button type="button" onClick={() => void saveProbability()} disabled={isSavingProbability}>
                {isSavingProbability ? t("attendance.saving") : t("attendance.saveProbability")}
              </button>
              {probabilityMessage && <small className="success">{probabilityMessage}</small>}
            </div>
          )}

          <form className="form atendimento-form" onSubmit={onSubmit}>
            <label>
              {t("attendance.interactionType")}
              <select value={kind} onChange={(e) => setKind(e.target.value as InteractionKind)}>
                {interactionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("attendance.registerLabel")}
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("attendance.registerPlaceholder")}
                required
              />
            </label>
            <button type="submit" disabled={isSaving}>
              {isSaving ? t("attendance.saving") : t("attendance.register")}
            </button>
            {error && <p className="error-text">{error}</p>}
          </form>
        </article>

        <article className="panel attendance-side-panel">
          <h3>{t("attendance.history")}</h3>
          <ul className="timeline-list">
            {interactions.map((item) => (
              <li key={item.id}>
                <header>
                  <span className="tag">{item.kind}</span>
                  <small>{new Date(item.createdAt).toLocaleString(locale)}</small>
                </header>
                <p>{item.content}</p>
              </li>
            ))}
            {interactions.length === 0 && <li className="muted">{t("attendance.emptyHistory")}</li>}
          </ul>
        </article>
      </section>
    </div>
  );
}
