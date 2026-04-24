import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KpiCard } from "../components/KpiCard";
import { api } from "../lib/api";
import { UserItem } from "../lib/types";

type LawyerPerformance = { ownerUserId: string; cases: number; revenue: number };

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "pt-BR";
  const [performance, setPerformance] = useState<LawyerPerformance[]>([]);
  const [usersById, setUsersById] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([api.getLawyerPerformance(), api.getUsers()])
      .then(([perfData, users]) => {
        setPerformance(perfData);
        const mapped = (users as UserItem[]).reduce<Record<string, string>>((acc, user) => {
          acc[user.id] = user.name;
          return acc;
        }, {});
        setUsersById(mapped);
      })
      .catch(async () => {
        setPerformance(await api.getLawyerPerformance());
        setUsersById({});
      });
  }, []);

  const filtered = performance.filter((item) => {
    const q = query.toLowerCase();
    const name = usersById[item.ownerUserId]?.toLowerCase() ?? "";
    return item.ownerUserId.toLowerCase().includes(q) || name.includes(q);
  });
  const totalRevenue = filtered.reduce((acc, item) => acc + item.revenue, 0);
  const totalCases = filtered.reduce((acc, item) => acc + item.cases, 0);

  return (
    <div className="page reports-page">
      <div className="page-header-actions">
        <div>
          <h2>{t("reports.title")}</h2>
          <p className="muted">{t("reports.subtitle")}</p>
        </div>
      </div>
      <section className="grid-4">
        <KpiCard title={t("reports.lawyers")} value={String(filtered.length)} />
        <KpiCard title={t("reports.cases")} value={String(totalCases)} />
        <KpiCard title={t("reports.revenue")} value={`R$ ${totalRevenue.toLocaleString(locale)}`} />
        <KpiCard title={t("reports.avgRevenue")} value={`R$ ${(filtered.length ? totalRevenue / filtered.length : 0).toLocaleString(locale)}`} />
      </section>

      <section className="panel reports-toolbar">
        <label>
          {t("reports.filterUser")}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("reports.filterPlaceholder")} />
        </label>
        <div className="reports-export-buttons">
          <button onClick={() => api.exportReport("csv")}>{t("reports.exportCsv")}</button>
          <button onClick={() => api.exportReport("pdf")}>{t("reports.exportPdf")}</button>
        </div>
      </section>

      <section className="panel">
        <h3>{t("reports.performance")}</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>{t("reports.user")}</th>
                <th>{t("reports.cases")}</th>
                <th>{t("reports.revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.ownerUserId}>
                  <td>{usersById[item.ownerUserId] ?? item.ownerUserId}</td>
                  <td>{item.cases}</td>
                  <td>R$ {item.revenue.toLocaleString(locale)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">{t("reports.noResults")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
