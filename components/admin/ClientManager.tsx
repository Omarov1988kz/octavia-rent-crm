"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type ClientStatus = "new" | "checked" | "active" | "problem" | "archived";
type ClientGender = "male" | "female" | "other" | "unknown";

type Client = {
  id: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  birth_date?: string | null;
  gender?: ClientGender | null;
  phone?: string | null;
  email?: string | null;
  residential_address?: string | null;
  registration_address?: string | null;
  document_type?: string | null;
  document_series_number?: string | null;
  document_issued_by?: string | null;
  document_issued_date?: string | null;
  document_expiry_date?: string | null;
  driver_license_number?: string | null;
  driver_license_issued_date?: string | null;
  driver_license_expiry_date?: string | null;
  driver_license_categories?: string | null;
  driver_license_country?: string | null;
  kbm?: string | null;
  inn?: string | null;
  client_registration_date: string;
  client_status: ClientStatus;
  preferences?: string | null;
  comments?: string | null;
  social_links?: string | null;
  acquisition_source?: string | null;
  is_blacklisted: boolean;
  blacklist_reason?: string | null;
};

type ClientForm = {
  last_name: string;
  first_name: string;
  middle_name: string;
  birth_date: string;
  gender: ClientGender;
  phone: string;
  email: string;
  residential_address: string;
  registration_address: string;
  document_type: string;
  document_series_number: string;
  document_issued_by: string;
  document_issued_date: string;
  document_expiry_date: string;
  driver_license_number: string;
  driver_license_issued_date: string;
  driver_license_expiry_date: string;
  driver_license_categories: string;
  driver_license_country: string;
  kbm: string;
  inn: string;
  client_registration_date: string;
  client_status: ClientStatus;
  preferences: string;
  comments: string;
  social_links: string;
  acquisition_source: string;
  is_blacklisted: boolean;
  blacklist_reason: string;
};

type FilterKey = ClientStatus | "all";

const initialForm: ClientForm = {
  last_name: "",
  first_name: "",
  middle_name: "",
  birth_date: "",
  gender: "unknown",
  phone: "",
  email: "",
  residential_address: "",
  registration_address: "",
  document_type: "",
  document_series_number: "",
  document_issued_by: "",
  document_issued_date: "",
  document_expiry_date: "",
  driver_license_number: "",
  driver_license_issued_date: "",
  driver_license_expiry_date: "",
  driver_license_categories: "",
  driver_license_country: "",
  kbm: "",
  inn: "",
  client_registration_date: new Date().toISOString().slice(0, 10),
  client_status: "new",
  preferences: "",
  comments: "",
  social_links: "",
  acquisition_source: "",
  is_blacklisted: false,
  blacklist_reason: "",
};

const dateFields = [
  "birth_date",
  "document_issued_date",
  "document_expiry_date",
  "driver_license_issued_date",
  "driver_license_expiry_date",
  "client_registration_date",
] as const;

function statusLabel(status: ClientStatus) {
  switch (status) {
    case "new":
      return "Новый";
    case "checked":
      return "Проверен";
    case "active":
      return "Активный";
    case "problem":
      return "Проблемный";
    case "archived":
      return "Архивный";
    default:
      return status;
  }
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function fullName(client: Client) {
  return `${client.last_name} ${client.first_name} ${client.middle_name ?? ""}`.trim();
}

function emptyToDash(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function buildPayload(form: ClientForm) {
  const payload: Record<string, string | boolean | null> = { ...form };
  for (const field of dateFields) {
    payload[field] = form[field].trim() ? form[field] : null;
  }
  return payload;
}

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blacklistOnly, setBlacklistOnly] = useState(false);

  const totals = useMemo(() => {
    const summary = { all: 0, active: 0, checked: 0, blacklisted: 0 };
    for (const client of clients) {
      summary.all += 1;
      if (client.client_status === "active") summary.active += 1;
      if (client.client_status === "checked") summary.checked += 1;
      if (client.is_blacklisted) summary.blacklisted += 1;
    }
    return summary;
  }, [clients]);

  useEffect(() => {
    loadClients();
  }, [filter, search, blacklistOnly]);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/clients", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (filter !== "all") url.searchParams.set("status", filter);
      if (blacklistOnly) url.searchParams.set("isBlacklisted", "true");

      const response = await fetch(url.toString());
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка загрузки клиентов");
        setClients([]);
      } else {
        setClients(result?.clients || []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка сети при загрузке клиентов");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingClientId(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.last_name.trim() || !form.first_name.trim()) {
      setError("Фамилия и имя обязательны");
      return;
    }

    setSaving(true);
    try {
      const method = editingClientId ? "PATCH" : "POST";
      const url = editingClientId ? `/api/admin/clients/${editingClientId}` : "/api/admin/clients";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });

      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка при сохранении клиента");
        return;
      }

      setMessage(editingClientId ? "Клиент обновлён" : "Клиент создан");
      resetForm();
      setShowForm(false);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ошибка при сохранении клиента");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(clientId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/clients/${clientId}`);
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка загрузки клиента");
        return;
      }

      const client = result.client as Client;
      setEditingClientId(client.id);
      setForm({
        last_name: client.last_name,
        first_name: client.first_name,
        middle_name: client.middle_name ?? "",
        birth_date: client.birth_date ?? "",
        gender: client.gender ?? "unknown",
        phone: client.phone ?? "",
        email: client.email ?? "",
        residential_address: client.residential_address ?? "",
        registration_address: client.registration_address ?? "",
        document_type: client.document_type ?? "",
        document_series_number: client.document_series_number ?? "",
        document_issued_by: client.document_issued_by ?? "",
        document_issued_date: client.document_issued_date ?? "",
        document_expiry_date: client.document_expiry_date ?? "",
        driver_license_number: client.driver_license_number ?? "",
        driver_license_issued_date: client.driver_license_issued_date ?? "",
        driver_license_expiry_date: client.driver_license_expiry_date ?? "",
        driver_license_categories: client.driver_license_categories ?? "",
        driver_license_country: client.driver_license_country ?? "",
        kbm: client.kbm ?? "",
        inn: client.inn ?? "",
        client_registration_date: client.client_registration_date ?? "",
        client_status: client.client_status,
        preferences: client.preferences ?? "",
        comments: client.comments ?? "",
        social_links: client.social_links ?? "",
        acquisition_source: client.acquisition_source ?? "",
        is_blacklisted: client.is_blacklisted,
        blacklist_reason: client.blacklist_reason ?? "",
      });
      setShowForm(true);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Ошибка сети при загрузке клиента");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(clientId: string) {
    const confirmed = window.confirm("Удалить клиента навсегда? Это действие нельзя отменить.");
    if (!confirmed) return;

    setError(null);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка при удалении клиента");
        return;
      }

      setMessage("Клиент удалён");
      await loadClients();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка при удалении клиента");
    }
  }

  function openClient(clientId: string) {
    window.location.href = `/admin/clients/${clientId}`;
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Клиенты</h1>
          <p className="admin-description">Локальная база клиентов. Эти данные не отправляются на сайт.</p>
        </div>
        <button
          type="button"
          className="admin-button admin-button-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Добавить клиента
        </button>
      </header>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Всего клиентов</div>
          <div className="admin-stat-value">{totals.all}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Активные</div>
          <div className="admin-stat-value">{totals.active}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Проверенные</div>
          <div className="admin-stat-value">{totals.checked}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Чёрный список</div>
          <div className="admin-stat-value">{totals.blacklisted}</div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            className="admin-input"
            type="search"
            placeholder="Поиск по ФИО, телефону, email, документу или ВУ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-select" value={filter} onChange={(event) => setFilter(event.target.value as FilterKey)}>
            <option value="all">Все статусы</option>
            <option value="new">Новый</option>
            <option value="checked">Проверен</option>
            <option value="active">Активный</option>
            <option value="problem">Проблемный</option>
            <option value="archived">Архивный</option>
          </select>
          <label className="admin-check-label">
            <input type="checkbox" checked={blacklistOnly} onChange={(event) => setBlacklistOnly(event.target.checked)} />
            Только чёрный список
          </label>
          <button type="button" className="admin-button admin-button-secondary" onClick={loadClients}>
            Обновить
          </button>
        </div>
        {loading ? <div className="admin-muted" style={{ marginTop: 12 }}>Загрузка...</div> : null}
      </section>

      {showForm ? (
        <section className="admin-card">
          <h2 className="admin-form-section-title">{editingClientId ? "Редактирование клиента" : "Добавление клиента"}</h2>
          <form onSubmit={handleSubmit} className="admin-grid">
            <details className="admin-details" open>
              <summary>Основное</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  Фамилия
                  <input className="admin-input" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required />
                </label>
                <label className="admin-label">
                  Имя
                  <input className="admin-input" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required />
                </label>
                <label className="admin-label">
                  Отчество
                  <input className="admin-input" value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} />
                </label>
                <label className="admin-label">
                  Дата рождения
                  <input className="admin-input" type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} />
                </label>
                <label className="admin-label">
                  Пол
                  <select className="admin-select" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as ClientGender })}>
                    <option value="unknown">Не указано</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                    <option value="other">Другое</option>
                  </select>
                </label>
                <label className="admin-label">
                  Статус клиента
                  <select className="admin-select" value={form.client_status} onChange={(event) => setForm({ ...form, client_status: event.target.value as ClientStatus })}>
                    <option value="new">Новый</option>
                    <option value="checked">Проверен</option>
                    <option value="active">Активный</option>
                    <option value="problem">Проблемный</option>
                    <option value="archived">Архивный</option>
                  </select>
                </label>
              </div>
            </details>

            <details className="admin-details" open>
              <summary>Контакты</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  Телефон
                  <input className="admin-input" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </label>
                <label className="admin-label">
                  Email
                  <input className="admin-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </label>
                <label className="admin-label">
                  Соцсети
                  <input className="admin-input" value={form.social_links} onChange={(event) => setForm({ ...form, social_links: event.target.value })} />
                </label>
                <label className="admin-label">
                  Источник привлечения
                  <input className="admin-input" value={form.acquisition_source} onChange={(event) => setForm({ ...form, acquisition_source: event.target.value })} />
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Адреса</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  Адрес проживания
                  <textarea className="admin-textarea" value={form.residential_address} onChange={(event) => setForm({ ...form, residential_address: event.target.value })} rows={3} />
                </label>
                <label className="admin-label">
                  Адрес регистрации
                  <textarea className="admin-textarea" value={form.registration_address} onChange={(event) => setForm({ ...form, registration_address: event.target.value })} rows={3} />
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Документ</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  Тип документа
                  <input className="admin-input" value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })} />
                </label>
                <label className="admin-label">
                  Серия и номер
                  <input className="admin-input" value={form.document_series_number} onChange={(event) => setForm({ ...form, document_series_number: event.target.value })} />
                </label>
                <label className="admin-label">
                  Кем выдан
                  <input className="admin-input" value={form.document_issued_by} onChange={(event) => setForm({ ...form, document_issued_by: event.target.value })} />
                </label>
                <label className="admin-label">
                  Дата выдачи
                  <input className="admin-input" type="date" value={form.document_issued_date} onChange={(event) => setForm({ ...form, document_issued_date: event.target.value })} />
                </label>
                <label className="admin-label">
                  Дата окончания
                  <input className="admin-input" type="date" value={form.document_expiry_date} onChange={(event) => setForm({ ...form, document_expiry_date: event.target.value })} />
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Водительское удостоверение</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  Номер ВУ
                  <input className="admin-input" value={form.driver_license_number} onChange={(event) => setForm({ ...form, driver_license_number: event.target.value })} />
                </label>
                <label className="admin-label">
                  Дата выдачи ВУ
                  <input className="admin-input" type="date" value={form.driver_license_issued_date} onChange={(event) => setForm({ ...form, driver_license_issued_date: event.target.value })} />
                </label>
                <label className="admin-label">
                  Дата окончания ВУ
                  <input className="admin-input" type="date" value={form.driver_license_expiry_date} onChange={(event) => setForm({ ...form, driver_license_expiry_date: event.target.value })} />
                </label>
                <label className="admin-label">
                  Категории
                  <input className="admin-input" value={form.driver_license_categories} onChange={(event) => setForm({ ...form, driver_license_categories: event.target.value })} />
                </label>
                <label className="admin-label">
                  Страна выдачи
                  <input className="admin-input" value={form.driver_license_country} onChange={(event) => setForm({ ...form, driver_license_country: event.target.value })} />
                </label>
                <label className="admin-label">
                  КБМ
                  <input className="admin-input" value={form.kbm} onChange={(event) => setForm({ ...form, kbm: event.target.value })} />
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Дополнительно</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  ИНН
                  <input className="admin-input" value={form.inn} onChange={(event) => setForm({ ...form, inn: event.target.value })} />
                </label>
                <label className="admin-label">
                  Дата регистрации клиента
                  <input className="admin-input" type="date" value={form.client_registration_date} onChange={(event) => setForm({ ...form, client_registration_date: event.target.value })} />
                </label>
                <label className="admin-label">
                  Предпочтения
                  <textarea className="admin-textarea" value={form.preferences} onChange={(event) => setForm({ ...form, preferences: event.target.value })} rows={3} />
                </label>
                <label className="admin-label">
                  Комментарии
                  <textarea className="admin-textarea" value={form.comments} onChange={(event) => setForm({ ...form, comments: event.target.value })} rows={3} />
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Чёрный список</summary>
              <div className="admin-details-body admin-grid">
                <label className="admin-check-label">
                  <input type="checkbox" checked={form.is_blacklisted} onChange={(event) => setForm({ ...form, is_blacklisted: event.target.checked })} />
                  В чёрном списке
                </label>
                <label className="admin-label">
                  Причина
                  <textarea className="admin-textarea" value={form.blacklist_reason} onChange={(event) => setForm({ ...form, blacklist_reason: event.target.value })} rows={3} />
                </label>
              </div>
            </details>

            <div className="admin-actions">
              <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить клиента"}
              </button>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                disabled={saving}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-card">
        <div className="admin-grid">
          {clients.length === 0 ? (
            <div className="admin-empty">Нет клиентов для выбранного фильтра.</div>
          ) : (
            clients.map((client) => (
              <article key={client.id} className="admin-list-card">
                <div className="admin-list-card-header">
                  <div>
                    <div className="admin-row">
                      <div className="admin-list-title">{fullName(client)}</div>
                      <span className="admin-badge info">{statusLabel(client.client_status)}</span>
                      {client.is_blacklisted ? <span className="admin-badge danger">Чёрный список</span> : null}
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => openClient(client.id)}>
                      Открыть
                    </button>
                    <button type="button" className="admin-button admin-button-success" onClick={() => handleEdit(client.id)}>
                      Редактировать
                    </button>
                    <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(client.id)}>
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field">
                    <span>Телефон</span>
                    {emptyToDash(client.phone)}
                  </div>
                  <div className="admin-field">
                    <span>Email</span>
                    {emptyToDash(client.email)}
                  </div>
                  <div className="admin-field">
                    <span>ВУ</span>
                    {emptyToDash(client.driver_license_number)}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
