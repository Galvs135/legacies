import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { ActionTypeItem, CaseItem, PipelineStageItem } from "../lib/types";

type LeadOption = {
  id: string;
  name: string;
  email: string;
};

const BRL_MONEY_REGEX = /^R\$\s?\d{1,3}(\.\d{3})*,\d{2}$/;
const FIXED_CLOSE_PROBABILITY = 35;

export function PipelinePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "pt-BR";
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [stages, setStages] = useState<PipelineStageItem[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionTypeItem[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [minProbability, setMinProbability] = useState(0);
  const [sortBy, setSortBy] = useState<"value" | "probability" | "recent">("value");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [leadName, setLeadName] = useState("");
  const [clientName, setClientName] = useState("");
  const [actionTypeId, setActionTypeId] = useState("");
  const [actionValue, setActionValue] = useState("R$ 0,00");

  const loadCases = () => {
    api.getCases().then(setCases);
  };

  useEffect(() => {
    loadCases();
    api.getCrmPipelineStages().then(setStages);
    api.getLeads().then((items) => {
      const leadItems = items.map((lead) => ({ id: lead.id, name: lead.name, email: lead.email }));
      setLeads(leadItems);
      if (leadItems[0]) {
        setLeadName(leadItems[0].name);
      }
    });
    api.getCrmActionTypes().then((items) => {
      setActionTypes(items);
      if (items[0]) {
        setActionTypeId(items[0].id);
      }
    });
  }, []);

  const filteredCases = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const bySearch = normalized
      ? cases.filter((item) => item.title.toLowerCase().includes(normalized) || item.clientName.toLowerCase().includes(normalized))
      : cases;
    const byProbability = bySearch.filter((item) => (item.closeProbability ?? 0) >= minProbability / 100);
    const sorted = [...byProbability].sort((a, b) => {
      if (sortBy === "probability") return (b.closeProbability ?? 0) - (a.closeProbability ?? 0);
      if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.actionValue - a.actionValue;
    });
    return sorted;
  }, [cases, minProbability, search, sortBy]);

  const grouped = useMemo(
    () => stages.map((stage) => ({ stage: stage.name, items: filteredCases.filter((item) => item.stage === stage.name) })),
    [filteredCases, stages]
  );

  const metrics = useMemo(() => {
    const totalValue = filteredCases.reduce((acc, item) => acc + item.actionValue, 0);
    const weighted = filteredCases.reduce((acc, item) => acc + item.actionValue * (item.closeProbability ?? 0), 0);
    const avgProbability =
      filteredCases.length === 0
        ? 0
        : filteredCases.reduce((acc, item) => acc + (item.closeProbability ?? 0), 0) / filteredCases.length;
    return {
      totalCases: filteredCases.length,
      totalValue,
      weightedForecast: weighted,
      avgProbability
    };
  }, [filteredCases]);

  const onDrop = (event: React.DragEvent<HTMLElement>, stage: string) => {
    event.preventDefault();
    const caseId = event.dataTransfer.getData("text/plain");
    const caseItem = cases.find((item) => item.id === caseId);
    if (!caseItem?.canDrag) {
      return;
    }
    api.moveCaseStage(caseId, stage).then(loadCases);
  };

  const submitNewCase = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError("");
    try {
      const parsedActionValue = parseBrlToNumber(actionValue);
      if (parsedActionValue === null) {
        throw new Error(t("pipeline.invalidActionValue"));
      }
      await api.createCase({
        leadName: leadName.trim(),
        clientName: clientName.trim() || leadName.trim(),
        actionTypeId,
        actionValue: parsedActionValue,
        closeProbability: FIXED_CLOSE_PROBABILITY / 100
      });
      setIsModalOpen(false);
      setLeadName("");
      setClientName("");
      setActionValue("R$ 0,00");
      loadCases();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Falha ao criar novo caso.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page pipeline-page">
      <div className="page-header-actions">
        <div>
          <h2>{t("pipeline.title")}</h2>
          <p className="muted">
            {t("pipeline.subtitle")}
          </p>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)}>
          {t("pipeline.newCase")}
        </button>
      </div>

      <section className="grid-4">
        <article className="card">
          <span className="card-title">{t("pipeline.activeCases")}</span>
          <strong className="card-value">{metrics.totalCases}</strong>
        </article>
        <article className="card">
          <span className="card-title">{t("pipeline.totalValue")}</span>
          <strong className="card-value">R$ {metrics.totalValue.toLocaleString(locale)}</strong>
        </article>
        <article className="card">
          <span className="card-title">{t("pipeline.weightedForecast")}</span>
          <strong className="card-value">R$ {metrics.weightedForecast.toLocaleString(locale)}</strong>
        </article>
        <article className="card">
          <span className="card-title">{t("pipeline.avgProbability")}</span>
          <strong className="card-value">{(metrics.avgProbability * 100).toFixed(1)}%</strong>
        </article>
      </section>

      <section className="panel pipeline-toolbar">
        <label>
          {t("pipeline.searchCase")}
          <input
            placeholder={t("pipeline.searchCasePlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {t("pipeline.minProbability")}
          <input
            type="range"
            min={0}
            max={100}
            value={minProbability}
            onChange={(event) => setMinProbability(Number(event.target.value))}
          />
          <small>{minProbability}%</small>
        </label>
        <label>
          {t("pipeline.sort")}
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            <option value="value">{t("pipeline.sortValue")}</option>
            <option value="probability">{t("pipeline.sortProbability")}</option>
            <option value="recent">{t("pipeline.sortRecent")}</option>
          </select>
        </label>
      </section>

      <section className="grid-5">
        {grouped.map((column) => (
          <article
            key={column.stage}
            className="pipeline-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, column.stage)}
          >
            <header className="pipeline-column-header">
              <h4>{column.stage}</h4>
              <small>
                {column.items.length} caso(s) - R${" "}
                {column.items.reduce((acc, item) => acc + item.actionValue, 0).toLocaleString(locale)}
              </small>
            </header>

            {column.items.length === 0 && <div className="pipeline-empty">{t("pipeline.emptyStage")}</div>}

            {column.items.map((item) => (
              <div
                className="pipeline-item"
                key={item.id}
                draggable={Boolean(item.canDrag)}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
              >
                <strong className="pipeline-item-title">{item.title}</strong>
                <p>{item.clientName}</p>
                <small>R$ {item.actionValue.toLocaleString(locale)}</small>
                <div className="pipeline-probability-row">
                  <span>{t("pipeline.prob")} {(item.closeProbability * 100).toFixed(0)}%</span>
                  <span>{daysSince(item.createdAt)}d</span>
                </div>
                <div className="pipeline-probability-bar">
                  <span style={{ width: `${Math.max(6, Math.round((item.closeProbability ?? 0) * 100))}%` }} />
                </div>
              </div>
            ))}
          </article>
        ))}
      </section>

      <section className="panel pipeline-case-list-panel">
        <h3>{t("pipeline.caseListTitle")}</h3>
        <div className="pipeline-case-list pipeline-case-list-scroll">
          {filteredCases.map((item, index) => (
            <article key={item.id} className="pipeline-case-row">
              <div className="pipeline-case-row-main">
                <strong>
                  {formatCaseIndex(index + 1)} {item.title}
                </strong>
                <small>
                  {item.clientName} - {item.stage}
                </small>
              </div>
              <button
                type="button"
                className="pipeline-case-plus"
                onClick={() => navigate(`/atendimento?caseId=${item.id}`)}
                aria-label={t("pipeline.viewAttendance")}
                title={t("pipeline.viewAttendance")}
              >
                +
              </button>
            </article>
          ))}
          {filteredCases.length === 0 && <div className="pipeline-empty">{t("pipeline.caseListEmpty")}</div>}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h3>{t("pipeline.newCaseTitle")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <form className="form" onSubmit={submitNewCase}>
              <label>
                {t("pipeline.leadName")}
                <select
                  value={leadName}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    setLeadName(selectedName);
                    if (!clientName.trim()) {
                      setClientName(selectedName);
                    }
                  }}
                  required
                >
                  {leads.length === 0 && <option value="">{t("pipeline.noLeadsAvailable")}</option>}
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.name}>
                      {lead.name} ({lead.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("pipeline.clientNameOptional")}
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </label>
              <label>
                {t("pipeline.actionType")}
                <select value={actionTypeId} onChange={(e) => setActionTypeId(e.target.value)}>
                  {actionTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("pipeline.actionValue")}
                <input
                  value={actionValue}
                  onChange={(e) => setActionValue(formatBrlMoney(e.target.value))}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  required
                />
              </label>
              <label>
                {t("pipeline.closeProbability")}
                <div className="probability-editor">
                  <div className="pipeline-probability-row">
                    <span>{t("pipeline.closeProbability")}</span>
                    <strong>{FIXED_CLOSE_PROBABILITY}%</strong>
                  </div>
                  <div className="pipeline-probability-bar">
                    <span style={{ width: `${FIXED_CLOSE_PROBABILITY}%` }} />
                  </div>
                  <small>{t("pipeline.fixedProbabilityHint", { value: FIXED_CLOSE_PROBABILITY })}</small>
                </div>
              </label>
              <button type="submit" disabled={isSaving || leads.length === 0}>
                {isSaving ? t("pipeline.creatingCase") : t("pipeline.createCase")}
              </button>
              {leads.length === 0 && <p className="error-text">{t("pipeline.noLeadsAvailable")}</p>}
              {modalError && <p className="error-text">{modalError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function daysSince(dateIso: string): number {
  const now = Date.now();
  const created = new Date(dateIso).getTime();
  const diff = Math.max(0, now - created);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatCaseIndex(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatBrlMoney(value: string): string {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length > 0 ? digits : "0";
  const amount = Number(normalized) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBrlToNumber(value: string): number | null {
  const normalized = value.replace(/\u00A0/g, " ").trim();
  if (!BRL_MONEY_REGEX.test(normalized)) {
    return null;
  }
  const numeric = normalized.replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}
