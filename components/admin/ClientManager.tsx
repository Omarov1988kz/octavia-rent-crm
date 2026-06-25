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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}.${month}.${year}`;
}

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

function genderLabel(gender: ClientGender) {
  switch (gender) {
    case "male":
      return "Мужской";
    case "female":
      return "Женский";
    case "other":
      return "Другое";
    case "unknown":
      return "Не указано";
    default:
      return gender;
  }
}

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [loading, setLoading] = useState(false);
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
    const url = new URL("/api/admin/clients", window.location.origin);
    if (search.trim()) {
      url.searchParams.set("search", search.trim());
    }
    if (filter !== "all") {
      url.searchParams.set("status", filter);
    }
    if (blacklistOnly) {
      url.searchParams.set("isBlacklisted", "true");
    }
    const response = await fetch(url.toString());
    const result = await response.json();
    setClients(result.clients || []);
    setLoading(false);
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

    const payload = { ...form };
    const method = editingClientId ? "PATCH" : "POST";
    const url = editingClientId ? `/api/admin/clients/${editingClientId}` : "/api/admin/clients";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result?.message || "Ошибка при сохранении клиента");
      return;
    }

    setMessage(editingClientId ? "Клиент обновлен" : "Клиент создан");
    resetForm();
    setShowForm(false);
    await loadClients();
  }

  async function handleEdit(clientId: string) {
    setLoading(true);
    const response = await fetch(`/api/admin/clients/${clientId}`);
    const result = await response.json();
    setLoading(false);

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
      client_registration_date: client.client_registration_date,
      client_status: client.client_status,
      preferences: client.preferences ?? "",
      comments: client.comments ?? "",
      social_links: client.social_links ?? "",
      acquisition_source: client.acquisition_source ?? "",
      is_blacklisted: client.is_blacklisted,
      blacklist_reason: client.blacklist_reason ?? "",
    });
    setShowForm(true);
  }

  async function handleDelete(clientId: string) {
    const confirmed = window.confirm("Удалить клиента навсегда? Это действие нельзя отменить.");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/clients/${clientId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Ошибка при удалении клиента");
      return;
    }

    setMessage("Клиент удален");
    await loadClients();
  }

  async function openClient(clientId: string) {
    window.location.href = `/admin/clients/${clientId}`;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24, minHeight: "100%" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>Клиенты</h1>
          <p style={{ margin: "10px 0 0", color: "#475569" }}>
            CRM-локальные данные. Клиенты не отправляются на публичный сайт.
          </p>
          {message ? (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "#ecfdf5", color: "#166534", border: "1px solid #a7f3d0" }}>
              {message}
            </div>
          ) : null}
          {error ? (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "#fee2e2", color: "#831843", border: "1px solid #fecaca" }}>
              {error}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            minWidth: 170,
          }}
        >
          Добавить клиента
        </button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Всего клиентов</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.all}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Активные</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.active}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Проверенные</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.checked}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>В чёрном списке</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.blacklisted}</div>
        </div>
      </section>

      <section style={{ marginBottom: 24, padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            type="search"
            placeholder="Поиск по ФИО, телефону, email, документу или ВУ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ flex: 1, minWidth: 260, padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as FilterKey)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
          >
            <option value="all">Все статусы</option>
            <option value="new">Новый</option>
            <option value="checked">Проверен</option>
            <option value="active">Активный</option>
            <option value="problem">Проблемный</option>
            <option value="archived">Архивный</option>
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={blacklistOnly}
              onChange={(event) => setBlacklistOnly(event.target.checked)}
            />
            Только чёрный список
          </label>
          <button
            type="button"
            onClick={loadClients}
            style={{ padding: "12px 18px", borderRadius: 12, border: "1px solid #2563eb", background: "#2563eb", color: "white", cursor: "pointer" }}
          >
            Обновить
          </button>
        </div>
        {loading ? <div>Загрузка...</div> : null}
      </section>

      {showForm ? (
        <section style={{ marginBottom: 24, padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>{editingClientId ? "Редактирование клиента" : "Добавление клиента"}</h2>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Основное</div>
                <label style={{ display: "grid", gap: 8 }}>
                  Фамилия
                  <input
                    value={form.last_name}
                    onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                    required
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Имя
                  <input
                    value={form.first_name}
                    onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                    required
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Отчество
                  <input
                    value={form.middle_name}
                    onChange={(event) => setForm({ ...form, middle_name: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Дата рождения
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Пол
                  <select
                    value={form.gender}
                    onChange={(event) => setForm({ ...form, gender: event.target.value as ClientGender })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  >
                    <option value="unknown">Не указано</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                    <option value="other">Другое</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Статус клиента
                  <select
                    value={form.client_status}
                    onChange={(event) => setForm({ ...form, client_status: event.target.value as ClientStatus })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  >
                    <option value="new">Новый</option>
                    <option value="checked">Проверен</option>
                    <option value="active">Активный</option>
                    <option value="problem">Проблемный</option>
                    <option value="archived">Архивный</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Контакты</div>
                <label style={{ display: "grid", gap: 8 }}>
                  Телефон
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Соцсети
                  <input
                    value={form.social_links}
                    onChange={(event) => setForm({ ...form, social_links: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Источник привлечения
                  <input
                    value={form.acquisition_source}
                    onChange={(event) => setForm({ ...form, acquisition_source: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Адреса</div>
                <label style={{ display: "grid", gap: 8 }}>
                  Адрес проживания
                  <textarea
                    value={form.residential_address}
                    onChange={(event) => setForm({ ...form, residential_address: event.target.value })}
                    rows={3}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Адрес регистрации
                  <textarea
                    value={form.registration_address}
                    onChange={(event) => setForm({ ...form, registration_address: event.target.value })}
                    rows={3}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Документ</div>
                <label style={{ display: "grid", gap: 8 }}>
                  Тип документа
                  <input
                    value={form.document_type}
                    onChange={(event) => setForm({ ...form, document_type: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Серия и номер документа
                  <input
                    value={form.document_series_number}
                    onChange={(event) => setForm({ ...form, document_series_number: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Кем выдан
                  <input
                    value={form.document_issued_by}
                    onChange={(event) => setForm({ ...form, document_issued_by: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "grid", gap: 8, flex: 1 }}>
                    Дата выдачи
                    <input
                      type="date"
                      value={form.document_issued_date}
                      onChange={(event) => setForm({ ...form, document_issued_date: event.target.value })}
                      style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 8, flex: 1 }}>
                    Дата окончания
                    <input
                      type="date"
                      value={form.document_expiry_date}
                      onChange={(event) => setForm({ ...form, document_expiry_date: event.target.value })}
                      style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Водительское удостоверение</div>
                <label style={{ display: "grid", gap: 8 }}>
                  Номер ВУ
                  <input
                    value={form.driver_license_number}
                    onChange={(event) => setForm({ ...form, driver_license_number: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "grid", gap: 8, flex: 1 }}>
                    Дата выдачи ВУ
                    <input
                      type="date"
                      value={form.driver_license_issued_date}
                      onChange={(event) => setForm({ ...form, driver_license_issued_date: event.target.value })}
                      style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 8, flex: 1 }}>
                    Дата окончания ВУ
                    <input
                      type="date"
                      value={form.driver_license_expiry_date}
                      onChange={(event) => setForm({ ...form, driver_license_expiry_date: event.target.value })}
                      style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                    />
                  </label>
                </div>
                <label style={{ display: "grid", gap: 8 }}>
                  Категории ВУ
                  <input
                    value={form.driver_license_categories}
                    onChange={(event) => setForm({ ...form, driver_license_categories: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Страна выдачи ВУ
                  <input
                    value={form.driver_license_country}
                    onChange={(event) => setForm({ ...form, driver_license_country: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  КБМ
                  <input
                    value={form.kbm}
                    onChange={(event) => setForm({ ...form, kbm: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>Дополнительно</div>
                <label style={{ display: "grid", gap: 8 }}>
                  ИНН
                  <input
                    value={form.inn}
                    onChange={(event) => setForm({ ...form, inn: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Дата регистрации клиента
                  <input
                    type="date"
                    value={form.client_registration_date}
                    onChange={(event) => setForm({ ...form, client_registration_date: event.target.value })}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Предпочтения
                  <textarea
                    value={form.preferences}
                    onChange={(event) => setForm({ ...form, preferences: event.target.value })}
                    rows={3}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  Комментарии
                  <textarea
                    value={form.comments}
                    onChange={(event) => setForm({ ...form, comments: event.target.value })}
                    rows={4}
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>Чёрный список</div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={form.is_blacklisted}
                  onChange={(event) => setForm({ ...form, is_blacklisted: event.target.checked })}
                />
                В чёрном списке
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                Причина добавления в чёрный список
                <textarea
                  value={form.blacklist_reason}
                  onChange={(event) => setForm({ ...form, blacklist_reason: event.target.value })}
                  rows={3}
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="submit"
                style={{ padding: "14px 18px", borderRadius: 12, border: "none", background: "#2563eb", color: "white", cursor: "pointer" }}
              >
                Сохранить клиента
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", color: "#0f172a", cursor: "pointer" }}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section style={{ background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(15,23,42,0.08)", padding: 20 }}>
        <div style={{ display: "grid", gap: 16 }}>
          {clients.length === 0 ? (
            <div style={{ padding: 28, borderRadius: 16, background: "#f8fafc", color: "#475569" }}>
              Нет клиентов для выбранного фильтра.
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                style={{ display: "grid", gap: 14, padding: 20, borderRadius: 18, border: "1px solid #e2e8f0", background: "#ffffff" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{`${client.last_name} ${client.first_name} ${client.middle_name ?? ""}`.trim()}</div>
                    <div style={{ color: "#475569", marginTop: 6 }}>
                      <span style={{ fontWeight: 600 }}>Статус:</span> {statusLabel(client.client_status)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openClient(client.id)}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#2563eb", color: "white", cursor: "pointer" }}
                    >
                      Открыть
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(client.id)}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#10b981", color: "white", cursor: "pointer" }}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(client.id)}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#ef4444", color: "white", cursor: "pointer" }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, color: "#334155" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>Телефон:</span> {client.phone || "—"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Email:</span> {client.email || "—"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Дата рождения:</span> {formatDate(client.birth_date)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>ВУ:</span> {client.driver_license_number || "—"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Чёрный список:</span> {client.is_blacklisted ? "Да" : "Нет"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
