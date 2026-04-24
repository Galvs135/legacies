import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { api } from "../lib/api";
import { ActionTypeItem, PipelineStageItem, UserItem } from "../lib/types";

type SettingsTab = "myData" | "actions" | "stages" | "users";

export function SettingsPage() {
  const { t } = useTranslation();
  const profile = api.getProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("myData");
  const [userId, setUserId] = useState(profile.userId);
  const [role, setRole] = useState<"admin" | "advogado">(profile.role);
  const [me, setMe] = useState<UserItem | null>(null);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionTypeItem[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageItem[]>([]);
  const [draggingStageId, setDraggingStageId] = useState("");
  const [saved, setSaved] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newActionType, setNewActionType] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageOrder, setNewStageOrder] = useState("1");
  const [userModalMode, setUserModalMode] = useState<"create" | "edit">("create");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "advogado">("advogado");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [editingUserName, setEditingUserName] = useState("");
  const [editingUserEmail, setEditingUserEmail] = useState("");
  const [editingUserRole, setEditingUserRole] = useState<"admin" | "advogado">("advogado");
  const [editingUserPassword, setEditingUserPassword] = useState("");

  const isAdmin = role === "admin";
  const orderedStages = useMemo(() => [...pipelineStages].sort((a, b) => a.order - b.order), [pipelineStages]);

  const load = async () => {
    const meData = await api.getSettingsMe();
    setMe(meData);
    setName(meData.name);
    setEmail(meData.email);
    setActionTypes(await api.getActionTypes());
    setPipelineStages(await api.getPipelineStages());
    try {
      setAllUsers(await api.getUsers());
    } catch {
      // Some environments may still protect this route for non-admin.
      setAllUsers([meData]);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [isAdmin]);

  const onSaveMyData = async (event: FormEvent) => {
    event.preventDefault();
    try {
      api.saveProfile(userId, role);
      await api.updateSettingsMe({ name, email });
      setSaved(`${t("settings.accessSaved")} ${t("settings.profileUpdated")}`);
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar perfil.");
    }
  };

  const addActionType = async () => {
    if (!newActionType.trim()) return;
    try {
      await api.createActionType(newActionType.trim());
      setNewActionType("");
      setSaved(`${t("settings.registerAction")} OK.`);
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cadastrar tipo de acao.");
    }
  };

  const addPipelineStage = async () => {
    if (!newStageName.trim()) return;
    try {
      await api.createPipelineStage({ name: newStageName.trim(), order: Number(newStageOrder) });
      setNewStageName("");
      setNewStageOrder("1");
      setSaved(`${t("settings.registerStage")} OK.`);
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cadastrar etapa.");
    }
  };

  const openEditUser = (target: UserItem) => {
    setUserModalMode("edit");
    setIsUserModalOpen(true);
    setEditingUserId(target.id);
    setEditingUserName(target.name);
    setEditingUserEmail(target.email);
    setEditingUserRole(target.role);
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;
    try {
      if (!newUserPassword.trim()) {
        throw new Error("Senha obrigatoria para novo usuario.");
      }
      await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        password: newUserPassword.trim()
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("advogado");
      setNewUserPassword("");
      setIsUserModalOpen(false);
      setSaved(`${t("settings.createUser")} OK.`);
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cadastrar usuario.");
    }
  };

  const saveUserEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin || !editingUserId) return;
    try {
      await api.updateUser(editingUserId, {
        name: editingUserName.trim(),
        email: editingUserEmail.trim(),
        role: editingUserRole,
        password: editingUserPassword.trim() || undefined
      });
      setIsUserModalOpen(false);
      setEditingUserPassword("");
      setSaved(`${t("settings.saveChanges")} OK.`);
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar usuario.");
    }
  };

  const openCreateUser = () => {
    setUserModalMode("create");
    setIsUserModalOpen(true);
  };

  const onStageDragStart = (stageId: string) => {
    setDraggingStageId(stageId);
  };

  const onStageDrop = async (targetStageId: string) => {
    if (!isAdmin || !draggingStageId || draggingStageId === targetStageId) return;
    const sourceIndex = orderedStages.findIndex((stage) => stage.id === draggingStageId);
    const targetIndex = orderedStages.findIndex((stage) => stage.id === targetStageId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...orderedStages];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const normalized = reordered.map((stage, index) => ({ ...stage, order: index + 1 }));
    setPipelineStages(normalized);
    setDraggingStageId("");
    try {
      await Promise.all(normalized.map((stage) => api.updatePipelineStage(stage.id, { order: stage.order })));
      setSaved(t("settings.stageOrderSaved"));
      setError("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao reordenar etapas.");
      await load();
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-header-actions">
        <div>
          <h2>{t("settings.title")}</h2>
          <p className="muted">{t("settings.subtitle")}</p>
        </div>
      </div>
      <section className="grid-4">
        <KpiCard title={t("settings.modeCurrent")} value={t("settings.modeValue")} />
        <KpiCard title={t("settings.activeUser")} value={userId} />
        <KpiCard title={t("settings.permission")} value={role} />
        <KpiCard title={t("settings.manageableUsers")} value={isAdmin ? t("settings.allUsers") : t("settings.ownProfileOnly")} />
      </section>

      <section className="panel">
        <div className="settings-tabs">
          <button type="button" className={activeTab === "myData" ? "active" : ""} onClick={() => setActiveTab("myData")}>
            {t("settings.myData")}
          </button>
          <button type="button" className={activeTab === "actions" ? "active" : ""} onClick={() => setActiveTab("actions")}>
            {t("settings.registerAction")}
          </button>
          <button type="button" className={activeTab === "stages" ? "active" : ""} onClick={() => setActiveTab("stages")}>
            {t("settings.registerStage")}
          </button>
          <button type="button" className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
            {t("settings.usersManagement")}
          </button>
        </div>

        {activeTab === "myData" && (
          <form className="form settings-tab-content" onSubmit={onSaveMyData}>
            <div className="split-2">
              <div>
                <h4>{t("settings.accessProfile")}</h4>
                <label>
                  {t("settings.userId")}
                  <input value={userId} onChange={(e) => setUserId(e.target.value)} required />
                </label>
                <label>
                  {t("settings.role")}
                  <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "advogado")}>
                    <option value="advogado">advogado</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
              </div>
              <div>
                <h4>{t("settings.myProfile")}</h4>
                <label>
                  {t("settings.name")}
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label>
                  {t("settings.email")}
                  <input value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
              </div>
            </div>
            <button type="submit">{t("settings.saveMyData")}</button>
            {me && <small className="muted">ID: {me.id}</small>}
          </form>
        )}

        {activeTab === "actions" && (
          <div className="settings-tab-content">
            <div className="users-toolbar">
              <h3>{t("settings.actionModalTitle")}</h3>
              <button type="button" onClick={() => setIsActionModalOpen(true)} disabled={!isAdmin}>
                {isAdmin ? t("settings.newAction") : t("settings.adminOnly")}
              </button>
            </div>
            <ul className="settings-list">
              {actionTypes.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === "stages" && (
          <div className="settings-tab-content">
            <div className="users-toolbar">
              <h3>{t("settings.stageModalTitle")}</h3>
              <button type="button" onClick={() => setIsStageModalOpen(true)} disabled={!isAdmin}>
                {isAdmin ? t("settings.newStage") : t("settings.adminOnly")}
              </button>
            </div>
            <ul className="settings-stage-list">
              {orderedStages.map((item) => (
                <li
                  key={item.id}
                  draggable={isAdmin}
                  onDragStart={() => onStageDragStart(item.id)}
                  onDragOver={(event: DragEvent<HTMLLIElement>) => event.preventDefault()}
                  onDrop={() => void onStageDrop(item.id)}
                >
                  <span>{item.order}. {item.name}</span>
                  {isAdmin && <small>::</small>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === "users" && (
          <div className="settings-tab-content">
            <div className="users-toolbar">
              <h3>{t("settings.usersModalTitle")}</h3>
              {isAdmin && (
                <button type="button" onClick={openCreateUser}>
                  {t("settings.newUser")}
                </button>
              )}
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("settings.name")}</th>
                    <th>{t("settings.email")}</th>
                    <th>{t("settings.role")}</th>
                    {isAdmin && <th>{t("settings.actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.role}</td>
                      {isAdmin && (
                        <td>
                          <button type="button" onClick={() => openEditUser(item)}>
                            {t("settings.edit")}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="buttons">
          {saved && <span className="success">{saved}</span>}
          {error && <span className="error-text">{error}</span>}
        </div>
      </section>

      {isActionModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h3>{t("settings.actionModalTitle")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsActionModalOpen(false)}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <div className="settings-modal-body">
              <div className="form-inline">
                <input value={newActionType} onChange={(e) => setNewActionType(e.target.value)} placeholder={t("settings.actionNamePlaceholder")} />
                <button type="button" onClick={() => void addActionType()} disabled={!isAdmin}>
                  {t("settings.register")}
                </button>
              </div>
              <ul className="check-list">
                {actionTypes.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isStageModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h3>{t("settings.stageModalTitle")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsStageModalOpen(false)}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <div className="settings-modal-body">
              <div className="form-inline">
                <input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder={t("settings.stageNamePlaceholder")} />
                <input
                  type="number"
                  min={1}
                  value={newStageOrder}
                  onChange={(e) => setNewStageOrder(e.target.value)}
                  placeholder={t("settings.stageOrderPlaceholder")}
                />
                <button type="button" onClick={() => void addPipelineStage()} disabled={!isAdmin}>
                  {t("settings.register")}
                </button>
              </div>
              <ul className="check-list">
                {pipelineStages.map((item) => (
                  <li key={item.id}>
                    {item.order}. {item.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h3>{userModalMode === "create" ? t("settings.newUser") : t("settings.edit")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setIsUserModalOpen(false);
                }}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>

            {userModalMode === "create" && isAdmin && (
              <form className="form settings-modal-body" onSubmit={createUser}>
                <label>
                  {t("settings.name")}
                  <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
                </label>
                <label>
                  {t("settings.email")}
                  <input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required />
                </label>
                <label>
                  {t("settings.role")}
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as "admin" | "advogado")}>
                    <option value="advogado">advogado</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <label>
                  {t("settings.password")}
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                  />
                </label>
                <button type="submit">{t("settings.createUser")}</button>
              </form>
            )}

            {userModalMode === "edit" && isAdmin && (
              <form className="form settings-modal-body" onSubmit={saveUserEdit}>
                <label>
                  {t("settings.name")}
                  <input value={editingUserName} onChange={(e) => setEditingUserName(e.target.value)} required />
                </label>
                <label>
                  {t("settings.email")}
                  <input value={editingUserEmail} onChange={(e) => setEditingUserEmail(e.target.value)} required />
                </label>
                <label>
                  {t("settings.role")}
                  <select
                    value={editingUserRole}
                    onChange={(e) => setEditingUserRole(e.target.value as "admin" | "advogado")}
                  >
                    <option value="advogado">advogado</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <label>
                  {t("settings.newPasswordOptional")}
                  <input
                    type="password"
                    value={editingUserPassword}
                    onChange={(e) => setEditingUserPassword(e.target.value)}
                  />
                </label>
                <div className="buttons">
                  <button type="submit">{t("settings.saveChanges")}</button>
                  <button type="button" onClick={() => setIsUserModalOpen(false)}>
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
