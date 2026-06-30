"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type ClientStatus = "new" | "checked" | "active" | "problem" | "archived";
type ClientGender = "male" | "female" | "other" | "unknown";
type BookingStatus = "request" | "booked" | "cancelled";

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
  passport_department_code?: string | null;
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

type ClientBooking = {
  id: string;
  car_name: string | null;
  car_plate_number: string | null;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  status: BookingStatus;
  comment: string | null;
};

type ClientBookingsPayload = {
  activeBookings: ClientBooking[];
  recentBookings: ClientBooking[];
  allBookings: ClientBooking[];
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
  passport_department_code: string;
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
  passport_department_code: "",
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

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
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

function bookingStatusLabel(status: BookingStatus) {
  switch (status) {
    case "request":
      return "Заявка";
    case "booked":
      return "Бронь";
    case "cancelled":
      return "Отменено";
    default:
      return status;
  }
}

function fullName(client: Client) {
  return `${client.last_name} ${client.first_name} ${client.middle_name ?? ""}`.trim();
}

function emptyToDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatDateTime(date: string, time?: string) {
  return `${formatDate(date)} ${time || "12:00"}`;
}

function carLabel(booking: ClientBooking) {
  return booking.car_plate_number ? `${booking.car_name || "Автомобиль"} · ${booking.car_plate_number}` : booking.car_name || "Автомобиль";
}

function buildPayload(form: ClientForm) {
  const payload: Record<string, string | boolean | null> = { ...form };
  for (const field of dateFields) {
    payload[field] = form[field].trim() ? form[field] : null;
  }
  return payload;
}

function clientToForm(client: Client): ClientForm {
  return {
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
    passport_department_code: client.passport_department_code ?? "",
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
  };
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="admin-info-item">
      <span>{label}</span>
      {emptyToDash(value)}
    </div>
  );
}

function BookingMini({ booking }: { booking: ClientBooking }) {
  return (
    <div className="admin-booking-mini">
      <div className="admin-row">
        <strong>{formatDateTime(booking.start_date, booking.start_time)} — {formatDateTime(booking.end_date, booking.end_time)}</strong>
        <span className={`admin-badge ${booking.status}`}>{bookingStatusLabel(booking.status)}</span>
      </div>
      <div className="admin-muted">{carLabel(booking)}</div>
      <div>{booking.comment || "—"}</div>
      <div className="admin-actions">
        <a className="admin-button admin-button-secondary" href={`/api/admin/contracts/rental/${booking.id}`}>
          Сформировать договор
        </a>
      </div>
    </div>
  );
}

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBookings, setClientBookings] = useState<ClientBookingsPayload | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
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

  function startEdit(client: Client) {
    setSelectedClient(null);
    setClientBookings(null);
    setEditingClientId(client.id);
    setForm(clientToForm(client));
    setShowForm(true);
  }

  async function openClient(client: Client) {
    setSelectedClient(client);
    setClientBookings(null);
    setShowAllBookings(false);
    setError(null);

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/bookings`);
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка загрузки бронирований клиента");
        return;
      }
      setClientBookings(result);
    } catch (bookingsError) {
      setError(bookingsError instanceof Error ? bookingsError.message : "Ошибка загрузки бронирований клиента");
    }
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

      setSelectedClient(null);
      setClientBookings(null);
      setMessage("Клиент удалён");
      await loadClients();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка при удалении клиента");
    }
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
                <label className="admin-label">Фамилия<input className="admin-input" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required /></label>
                <label className="admin-label">Имя<input className="admin-input" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required /></label>
                <label className="admin-label">Отчество<input className="admin-input" value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} /></label>
                <label className="admin-label">Дата рождения<input className="admin-input" type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} /></label>
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
                <label className="admin-label">Телефон<input className="admin-input" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label className="admin-label">Email<input className="admin-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label className="admin-label">Соцсети<input className="admin-input" value={form.social_links} onChange={(event) => setForm({ ...form, social_links: event.target.value })} /></label>
                <label className="admin-label">Источник привлечения<input className="admin-input" value={form.acquisition_source} onChange={(event) => setForm({ ...form, acquisition_source: event.target.value })} /></label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Адреса</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">Адрес проживания<textarea className="admin-textarea" value={form.residential_address} onChange={(event) => setForm({ ...form, residential_address: event.target.value })} rows={3} /></label>
                <label className="admin-label">Адрес регистрации<textarea className="admin-textarea" value={form.registration_address} onChange={(event) => setForm({ ...form, registration_address: event.target.value })} rows={3} /></label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Документ</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">Тип документа<input className="admin-input" value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })} /></label>
                <label className="admin-label">Серия и номер<input className="admin-input" value={form.document_series_number} onChange={(event) => setForm({ ...form, document_series_number: event.target.value })} /></label>
                <label className="admin-label">Кем выдан<input className="admin-input" value={form.document_issued_by} onChange={(event) => setForm({ ...form, document_issued_by: event.target.value })} /></label>
                <label className="admin-label">Дата выдачи<input className="admin-input" type="date" value={form.document_issued_date} onChange={(event) => setForm({ ...form, document_issued_date: event.target.value })} /></label>
                <label className="admin-label">Код подразделения<input className="admin-input" placeholder="123-456" value={form.passport_department_code} onChange={(event) => setForm({ ...form, passport_department_code: event.target.value })} /></label>
                <label className="admin-label">Дата окончания<input className="admin-input" type="date" value={form.document_expiry_date} onChange={(event) => setForm({ ...form, document_expiry_date: event.target.value })} /></label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Водительское удостоверение</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">Номер ВУ<input className="admin-input" value={form.driver_license_number} onChange={(event) => setForm({ ...form, driver_license_number: event.target.value })} /></label>
                <label className="admin-label">Дата выдачи ВУ<input className="admin-input" type="date" value={form.driver_license_issued_date} onChange={(event) => setForm({ ...form, driver_license_issued_date: event.target.value })} /></label>
                <label className="admin-label">Дата окончания ВУ<input className="admin-input" type="date" value={form.driver_license_expiry_date} onChange={(event) => setForm({ ...form, driver_license_expiry_date: event.target.value })} /></label>
                <label className="admin-label">Категории<input className="admin-input" value={form.driver_license_categories} onChange={(event) => setForm({ ...form, driver_license_categories: event.target.value })} /></label>
                <label className="admin-label">Страна выдачи<input className="admin-input" value={form.driver_license_country} onChange={(event) => setForm({ ...form, driver_license_country: event.target.value })} /></label>
                <label className="admin-label">КБМ<input className="admin-input" value={form.kbm} onChange={(event) => setForm({ ...form, kbm: event.target.value })} /></label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Дополнительно</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">ИНН<input className="admin-input" value={form.inn} onChange={(event) => setForm({ ...form, inn: event.target.value })} /></label>
                <label className="admin-label">Дата регистрации клиента<input className="admin-input" type="date" value={form.client_registration_date} onChange={(event) => setForm({ ...form, client_registration_date: event.target.value })} /></label>
                <label className="admin-label">Предпочтения<textarea className="admin-textarea" value={form.preferences} onChange={(event) => setForm({ ...form, preferences: event.target.value })} rows={3} /></label>
                <label className="admin-label">Комментарии<textarea className="admin-textarea" value={form.comments} onChange={(event) => setForm({ ...form, comments: event.target.value })} rows={3} /></label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Чёрный список</summary>
              <div className="admin-details-body admin-grid">
                <label className="admin-check-label">
                  <input type="checkbox" checked={form.is_blacklisted} onChange={(event) => setForm({ ...form, is_blacklisted: event.target.checked })} />
                  В чёрном списке
                </label>
                <label className="admin-label">Причина<textarea className="admin-textarea" value={form.blacklist_reason} onChange={(event) => setForm({ ...form, blacklist_reason: event.target.value })} rows={3} /></label>
              </div>
            </details>

            <div className="admin-actions">
              <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить клиента"}
              </button>
              <button type="button" className="admin-button admin-button-secondary" onClick={() => { resetForm(); setShowForm(false); }} disabled={saving}>
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
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => openClient(client)}>
                      Открыть
                    </button>
                    <button type="button" className="admin-button admin-button-success" onClick={() => startEdit(client)}>
                      Редактировать
                    </button>
                    <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(client.id)}>
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field"><span>Телефон</span>{emptyToDash(client.phone)}</div>
                  <div className="admin-field"><span>Email</span>{emptyToDash(client.email)}</div>
                  <div className="admin-field"><span>ВУ</span>{emptyToDash(client.driver_license_number)}</div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {selectedClient ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedClient(null);
        }}>
          <div className="admin-modal-panel">
            <div className="admin-modal-header">
              <div>
                <div className="admin-row" style={{ marginBottom: 8 }}>
                  <h2 className="admin-title" style={{ margin: 0 }}>{fullName(selectedClient)}</h2>
                  <span className="admin-badge info">{statusLabel(selectedClient.client_status)}</span>
                  {selectedClient.is_blacklisted ? <span className="admin-badge danger">Чёрный список</span> : null}
                </div>
                <div className="admin-row">
                  <span>{emptyToDash(selectedClient.phone)}</span>
                  <span className="admin-muted">Источник: {emptyToDash(selectedClient.acquisition_source)}</span>
                </div>
              </div>
              <div className="admin-actions">
                <Link className="admin-button admin-button-secondary" href={`/admin/bookings?clientId=${selectedClient.id}`}>
                  Все бронирования клиента
                </Link>
                <button type="button" className="admin-button admin-button-success" onClick={() => startEdit(selectedClient)}>
                  Редактировать
                </button>
                <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(selectedClient.id)}>
                  Удалить
                </button>
                <button type="button" className="admin-button admin-button-secondary" onClick={() => setSelectedClient(null)}>
                  Закрыть
                </button>
              </div>
            </div>

            <div className="admin-modal-body">
              <section className="admin-info-section">
                <h3 className="admin-info-title">Контакты</h3>
                <div className="admin-info-grid">
                  <InfoItem label="Телефон" value={selectedClient.phone} />
                  <InfoItem label="Email" value={selectedClient.email} />
                  <InfoItem label="Соцсети" value={selectedClient.social_links} />
                  <InfoItem label="Источник привлечения" value={selectedClient.acquisition_source} />
                </div>
              </section>

              <section className="admin-info-section">
                <h3 className="admin-info-title">Активные заявки и бронирования</h3>
                <div className="admin-grid">
                  {clientBookings?.activeBookings.length ? (
                    clientBookings.activeBookings.map((booking) => <BookingMini key={booking.id} booking={booking} />)
                  ) : (
                    <div className="admin-empty">Активных заявок и бронирований нет.</div>
                  )}
                </div>
              </section>

              <section className="admin-info-section">
                <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 className="admin-info-title" style={{ margin: 0 }}>Последние бронирования</h3>
                  <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowAllBookings((value) => !value)}>
                    {showAllBookings ? "Скрыть историю" : "Показать всю историю"}
                  </button>
                </div>
                <div className="admin-grid">
                  {(showAllBookings ? clientBookings?.allBookings : clientBookings?.recentBookings)?.length ? (
                    (showAllBookings ? clientBookings?.allBookings : clientBookings?.recentBookings)?.map((booking) => <BookingMini key={booking.id} booking={booking} />)
                  ) : (
                    <div className="admin-empty">Истории бронирований пока нет.</div>
                  )}
                </div>
              </section>

              <div className="admin-grid-2">
                <section className="admin-info-section">
                  <h3 className="admin-info-title">Документ</h3>
                  <div className="admin-info-grid">
                    <InfoItem label="Тип документа" value={selectedClient.document_type} />
                    <InfoItem label="Серия и номер" value={selectedClient.document_series_number} />
                    <InfoItem label="Кем выдан" value={selectedClient.document_issued_by} />
                    <InfoItem label="Дата выдачи" value={formatDate(selectedClient.document_issued_date)} />
                    <InfoItem label="Код подразделения" value={selectedClient.passport_department_code} />
                    <InfoItem label="Дата окончания" value={formatDate(selectedClient.document_expiry_date)} />
                  </div>
                </section>

                <section className="admin-info-section">
                  <h3 className="admin-info-title">Водительское удостоверение</h3>
                  <div className="admin-info-grid">
                    <InfoItem label="Номер ВУ" value={selectedClient.driver_license_number} />
                    <InfoItem label="Дата выдачи" value={formatDate(selectedClient.driver_license_issued_date)} />
                    <InfoItem label="Дата окончания" value={formatDate(selectedClient.driver_license_expiry_date)} />
                    <InfoItem label="Категории" value={selectedClient.driver_license_categories} />
                    <InfoItem label="Страна выдачи" value={selectedClient.driver_license_country} />
                    <InfoItem label="КБМ" value={selectedClient.kbm} />
                  </div>
                </section>
              </div>

              <div className="admin-grid-2">
                <section className="admin-info-section">
                  <h3 className="admin-info-title">Адреса</h3>
                  <div className="admin-info-grid">
                    <InfoItem label="Адрес проживания" value={selectedClient.residential_address} />
                    <InfoItem label="Адрес регистрации" value={selectedClient.registration_address} />
                  </div>
                </section>

                <section className="admin-info-section">
                  <h3 className="admin-info-title">Дополнительно</h3>
                  <div className="admin-info-grid">
                    <InfoItem label="Дата рождения" value={formatDate(selectedClient.birth_date)} />
                    <InfoItem label="ИНН" value={selectedClient.inn} />
                    <InfoItem label="Предпочтения" value={selectedClient.preferences} />
                    <InfoItem label="Комментарии" value={selectedClient.comments} />
                  </div>
                </section>
              </div>

              <section className="admin-info-section">
                <h3 className="admin-info-title">Чёрный список</h3>
                <div className="admin-info-grid">
                  <InfoItem label="В списке" value={selectedClient.is_blacklisted ? "Да" : "Нет"} />
                  <InfoItem label="Причина" value={selectedClient.blacklist_reason} />
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
