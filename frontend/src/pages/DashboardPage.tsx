import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KpiCard } from "../components/KpiCard";
import { api } from "../lib/api";
import { FunnelItem, Kpis } from "../lib/types";

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "pt-BR";
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [funnel, setFunnel] = useState<FunnelItem[]>([]);
  const [performance, setPerformance] = useState<Array<{ ownerUserId: string; cases: number; revenue: number }>>([]);
  const [userNamesById, setUserNamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([api.getKpis(), api.getFunnel(), api.getLawyerPerformance(), api.getUsers().catch(() => [])]).then(
      ([kpiData, funnelData, perfData, users]) => {
        setKpis(kpiData);
        setFunnel(funnelData);
        setPerformance(perfData);
        setUserNamesById(
          users.reduce<Record<string, string>>((acc, user) => {
            acc[user.id] = user.name;
            return acc;
          }, {})
        );
      }
    );
  }, []);

  if (!kpis) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <div className="page">
      <h2>{t("dashboard.title")}</h2>
      <section className="grid-4">
        <KpiCard title={t("dashboard.newLeads")} value={String(kpis.newLeads)} />
        <KpiCard title={t("dashboard.conversionRate")} value={`${(kpis.conversionRate * 100).toFixed(1)}%`} />
        <KpiCard title={t("dashboard.valueInNegotiation")} value={`R$ ${kpis.totalInNegotiation.toLocaleString(locale)}`} />
        <KpiCard title={t("dashboard.wonLost")} value={`${kpis.wonCases}/${kpis.lostCases}`} />
      </section>

      <article className="panel dashboard-funnel-full">
        <h3>{t("dashboard.funnel")}</h3>
        <div className="grid-5">
          {funnel.map((item) => (
            <KpiCard key={item.stage} title={item.stage} value={String(item.total)} />
          ))}
        </div>
      </article>

      <section className="dashboard-layout">
        <article className="panel">
          <h3>{t("dashboard.performance")}</h3>
          <ul className="stat-list">
            {performance.slice(0, 4).map((item) => (
              <li key={item.ownerUserId}>
                <div>
                  <strong>{userNamesById[item.ownerUserId] ?? item.ownerUserId}</strong>
                  <span>{t("dashboard.casesCount", { count: item.cases })}</span>
                </div>
                <strong>R$ {item.revenue.toLocaleString(locale)}</strong>
              </li>
            ))}
          </ul>
          <div className="inline-tags">
            <span className="tag">{t("dashboard.monthlyGoal")}</span>
            <span className="tag">{t("dashboard.risk")}</span>
            <span className="tag">{t("dashboard.focus")}</span>
          </div>
        </article>
      </section>
    </div>
  );
}
