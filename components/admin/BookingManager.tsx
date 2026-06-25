"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type BookingStatus = "request" | "booked" | "cancelled";

type Booking = {
  id: string;
  car_name: string | null;
  car_plate_number: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  status: BookingStatus;
  comment: string | null;
};

type FilterKey = "all" | BookingStatus;

type CarOption = {
  id: string;
  name: string;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
};

type ClientSearchResult = {
  id: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  phone?: string | null;
  client_status: string;
  is_blacklisted: boolean;
};

type BookingForm = {
  carId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: BookingStatus;
  comment: string;
};

const initialForm: BookingForm = {
  carId: "",
  clientId: "",
  clientName: "",
  clientPhone: "",
  startDate: "",
  startTime: "12:00",
  endDate: "",
  endTime: "12:00",
  status: "request",
  comment: "",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatTime(value?: string) {
  return value || "12:00";
}

function formatDateTime(date: string, time?: string) {
  return `${formatDate(date)} ${formatTime(time)}`;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function statusLabel(status: BookingStatus) {
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

function clientStatusLabel(status: string) {
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

function isValidDate(startDate: string, endDate: string, startTime: string, endTime: string) {
  if (!startDate || !endDate || !startTime || !endTime) return false;

  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
}

function fullClientName(client: ClientSearchResult) {
  return `${client.last_name} ${client.first_name}${client.middle_name ? ` ${client.middle_name}` : ""}`.trim();
}

function carLabel(car: CarOption) {
  const title = car.brand || car.model || car.year ? `${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}`.trim() : car.name;
  return car.plate_number?.trim() ? `${title} · ${car.plate_number}` : title;
}

function dedupeCars(cars: CarOption[]) {
  const seen = new Set<string>();
  return cars.filter((car) => {
    const key = car.plate_number?.trim()
      ? `plate:${car.plate_number.trim().toLowerCase()}`
      : `name:${car.name.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function BookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientSearchResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [clientWarning, setClientWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const uniqueCars = useMemo(() => dedupeCars(cars), [cars]);

  const totals = useMemo(() => {
    const summary = { all: 0, request: 0, booked: 0, cancelled: 0 };
    for (const booking of bookings) {
      summary.all += 1;
      summary[booking.status] += 1;
    }
    return summary;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === "all") return bookings;
    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const isFormValid = useMemo(
    () =>
      Boolean(
        form.carId &&
          form.clientName.trim() &&
          form.startDate &&
          form.startTime &&
          form.endDate &&
          form.endTime &&
          isValidDate(form.startDate, form.endDate, form.startTime, form.endTime)
      ),
    [form]
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setError(null);
    try {
      const bookingsResponse = await fetch("/api/admin/bookings");
      const bookingsJson = await parseJson(bookingsResponse);
      if (!bookingsResponse.ok) {
        setError(bookingsJson?.message || "Ошибка загрузки бронирований");
        setBookings([]);
      } else {
        setBookings(bookingsJson?.bookings || []);
      }

      const carsResponse = await fetch("/api/admin/cars?activeOnly=true");
      const carsJson = await parseJson(carsResponse);
      if (!carsResponse.ok) {
        setError(carsJson?.message || "Ошибка загрузки автомобилей");
        setCars([]);
      } else {
        setCars(carsJson?.cars || []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка сети при загрузке данных");
      setBookings([]);
      setCars([]);
    }
  }

  async function loadClientOptions(query: string) {
    const search = query.trim();
    if (search.length < 2) {
      setClientOptions([]);
      return;
    }

    try {
      const url = new URL("/api/admin/clients", window.location.origin);
      url.searchParams.set("search", search);

      const response = await fetch(url.toString());
      const result = await parseJson(response);
      if (!response.ok) {
        setClientOptions([]);
        return;
      }

      setClientOptions((result?.clients || []).slice(0, 8));
    } catch {
      setClientOptions([]);
    }
  }

  async function handleConfirm(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${id}/confirm`, { method: "POST" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка подтверждения брони");
        return;
      }
      await loadData();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Ошибка подтверждения брони");
    }
  }

  async function handleCancel(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка отмены брони");
        return;
      }
      await loadData();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Ошибка отмены брони");
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Удалить бронь навсегда? Это действие нельзя отменить.");
    if (!confirmed) return;

    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка при удалении брони");
        return;
      }

      setSuccessMessage("Бронь удалена");
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка при удалении брони");
    }
  }

  function resetForm() {
    setForm(initialForm);
    setClientSearch("");
    setSelectedClient(null);
    setClientOptions([]);
    setClientWarning(null);
    setError(null);
    setDateError(null);
    setSuccessMessage(null);
  }

  function selectClient(client: ClientSearchResult) {
    const name = fullClientName(client);
    setSelectedClient(client);
    setClientSearch("");
    setClientOptions([]);
    setClientWarning(client.is_blacklisted ? "Клиент в чёрном списке" : null);
    setForm({
      ...form,
      clientId: client.id,
      clientName: name,
      clientPhone: client.phone ?? "",
    });
  }

  function clearSelectedClient() {
    setSelectedClient(null);
    setClientWarning(null);
    setForm({ ...form, clientId: "", clientName: "", clientPhone: "" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDateError(null);

    if (!isValidDate(form.startDate, form.endDate, form.startTime, form.endTime)) {
      setDateError("Дата и время возврата должны быть позже даты и времени начала");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: form.carId,
          clientId: form.clientId || undefined,
          clientName: form.clientName,
          clientPhone: form.clientPhone,
          startDate: form.startDate,
          startTime: form.startTime,
          endDate: form.endDate,
          endTime: form.endTime,
          status: form.status,
          comment: form.comment,
        }),
      });

      const result = await parseJson(response);
      if (!response.ok) {
        const message = result?.message || "Ошибка при создании брони";
        setError(
          message.includes("уже есть бронь")
            ? `Машина занята с ${formatDateTime(form.startDate, form.startTime)} до ${formatDateTime(form.endDate, form.endTime)}`
            : message
        );
        return;
      }

      resetForm();
      setShowForm(false);
      setSuccessMessage("Бронь добавлена");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ошибка при создании брони");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setError(null);
    setSyncMessage(null);
    setSyncLoading(true);

    try {
      const response = await fetch("/api/admin/sync", { method: "POST" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка синхронизации");
        return;
      }

      setSyncMessage(result?.message || "Синхронизация выполнена");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Ошибка синхронизации");
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Бронирования</h1>
          <p className="admin-description">
            Локальная работа с заявками и бронями. На сайт уходят только даты и статус.
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button admin-button-secondary" onClick={handleSync} disabled={syncLoading}>
            {syncLoading ? "Синхронизация..." : "Синхронизировать"}
          </button>
          <button type="button" className="admin-button admin-button-primary" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Скрыть форму" : "Добавить бронь"}
          </button>
        </div>
      </header>

      {successMessage ? <div className="admin-message success">{successMessage}</div> : null}
      {syncMessage ? <div className="admin-message success">{syncMessage}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Всего броней</div>
          <div className="admin-stat-value">{totals.all}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Заявки</div>
          <div className="admin-stat-value">{totals.request}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Подтверждено</div>
          <div className="admin-stat-value">{totals.booked}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Отменено</div>
          <div className="admin-stat-value">{totals.cancelled}</div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-row">
          {(["all", "request", "booked", "cancelled"] as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-button ${filter === key ? "admin-button-primary" : "admin-button-secondary"}`}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "Все" : statusLabel(key)}
            </button>
          ))}
        </div>
      </section>

      {showForm ? (
        <section className="admin-card">
          <h2 className="admin-form-section-title">Новая бронь</h2>
          <form onSubmit={handleSubmit} className="admin-grid">
            <div className="admin-form-section">
              <h3 className="admin-form-section-title">1. Автомобиль</h3>
              <label className="admin-label">
                Автомобиль
                <select className="admin-select" value={form.carId} onChange={(event) => setForm({ ...form, carId: event.target.value })} required>
                  <option value="">Выберите автомобиль</option>
                  {uniqueCars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {carLabel(car)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">2. Период аренды</h3>
              <div className="admin-grid-4">
                <label className="admin-label">
                  Дата начала
                  <input className="admin-input" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
                </label>
                <label className="admin-label">
                  Время начала
                  <input className="admin-input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required />
                </label>
                <label className="admin-label">
                  Дата возврата
                  <input className="admin-input" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
                </label>
                <label className="admin-label">
                  Время возврата
                  <input className="admin-input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required />
                </label>
              </div>
              {dateError ? <div className="admin-message error" style={{ marginTop: 12 }}>{dateError}</div> : null}
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">3. Клиент</h3>
              <div className="admin-grid">
                <div>
                  <div className="admin-muted" style={{ marginBottom: 8, fontWeight: 700 }}>Выбрать клиента из базы</div>
                  {selectedClient ? (
                    <div className="admin-selected-client">
                      <div>
                        <strong>Выбран:</strong> {form.clientName}
                        {form.clientPhone ? ` · ${form.clientPhone}` : ""}
                        <div style={{ marginTop: 6 }}>
                          <span className="admin-badge info">{clientStatusLabel(selectedClient.client_status)}</span>{" "}
                          {selectedClient.is_blacklisted ? <span className="admin-badge danger">Чёрный список</span> : null}
                        </div>
                      </div>
                      <button type="button" className="admin-button admin-button-secondary" onClick={clearSelectedClient}>
                        Сменить
                      </button>
                    </div>
                  ) : (
                    <div className="admin-autocomplete">
                      <input
                        className="admin-input"
                        type="search"
                        placeholder="Начните вводить фамилию, имя или телефон"
                        value={clientSearch}
                        onChange={(event) => {
                          const value = event.target.value;
                          setClientSearch(value);
                          setClientWarning(null);
                          loadClientOptions(value);
                        }}
                      />
                      {clientOptions.length > 0 ? (
                        <div className="admin-autocomplete-list">
                          {clientOptions.map((client) => (
                            <button key={client.id} type="button" className="admin-autocomplete-option" onClick={() => selectClient(client)}>
                              <div style={{ fontWeight: 800 }}>{fullClientName(client)}</div>
                              <div className="admin-muted" style={{ marginTop: 4 }}>{client.phone || "Телефон не указан"}</div>
                              <div className="admin-row" style={{ marginTop: 8 }}>
                                <span className="admin-badge info">{clientStatusLabel(client.client_status)}</span>
                                {client.is_blacklisted ? <span className="admin-badge danger">Чёрный список</span> : null}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {clientWarning ? <div className="admin-message error" style={{ marginTop: 12 }}>{clientWarning}</div> : null}
                </div>

                <div className="admin-divider-label">или ввести вручную</div>
                <div className="admin-grid-2">
                  <label className="admin-label">
                    Имя клиента
                    <input
                      className="admin-input"
                      value={form.clientId ? "" : form.clientName}
                      placeholder={form.clientId ? "Клиент выбран из базы" : "Фамилия Имя Отчество"}
                      disabled={Boolean(form.clientId)}
                      onChange={(event) => {
                        setSelectedClient(null);
                        setForm({ ...form, clientId: "", clientName: event.target.value });
                      }}
                      required={!form.clientId}
                    />
                  </label>
                  <label className="admin-label">
                    Телефон
                    <input
                      className="admin-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+7 999 123-45-67"
                      value={form.clientId ? "" : form.clientPhone}
                      disabled={Boolean(form.clientId)}
                      onChange={(event) => {
                        setSelectedClient(null);
                        setForm({ ...form, clientId: "", clientPhone: event.target.value });
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">4. Статус</h3>
              <label className="admin-label">
                Статус
                <select className="admin-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BookingStatus })}>
                  <option value="request">Заявка</option>
                  <option value="booked">Бронь подтверждена</option>
                </select>
              </label>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">5. Комментарий</h3>
              <textarea className="admin-textarea" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} rows={4} />
            </div>

            <div className="admin-actions">
              <button type="submit" className="admin-button admin-button-primary" disabled={!isFormValid || loading}>
                {loading ? "Сохраняем..." : "Сохранить бронь"}
              </button>
              <button type="button" className="admin-button admin-button-secondary" onClick={resetForm} disabled={loading}>
                Очистить форму
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-card">
        <div className="admin-grid">
          {filteredBookings.length === 0 ? (
            <div className="admin-empty">Нет броней для выбранного фильтра.</div>
          ) : (
            filteredBookings.map((booking) => (
              <article key={booking.id} className="admin-list-card">
                <div className="admin-list-card-header">
                  <div>
                    <div className="admin-row">
                      <div className="admin-list-title">
                        {booking.car_name || "Автомобиль"}
                        {booking.car_plate_number ? <span className="admin-muted"> · {booking.car_plate_number}</span> : null}
                      </div>
                      <span className={`admin-badge ${booking.status}`}>{statusLabel(booking.status)}</span>
                    </div>
                    <div className="admin-muted" style={{ marginTop: 6 }}>
                      {formatDateTime(booking.start_date, booking.start_time)} — {formatDateTime(booking.end_date, booking.end_time)}
                    </div>
                  </div>
                  <div className="admin-actions">
                    {booking.status === "request" ? (
                      <button type="button" className="admin-button admin-button-success" onClick={() => handleConfirm(booking.id)}>
                        Подтвердить бронь
                      </button>
                    ) : null}
                    {booking.status !== "cancelled" ? (
                      <button type="button" className="admin-button admin-button-secondary" onClick={() => handleCancel(booking.id)}>
                        Отменить
                      </button>
                    ) : null}
                    <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(booking.id)}>
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field">
                    <span>Клиент</span>
                    {booking.client_id ? (
                      <Link href={`/admin/clients/${booking.client_id}`}>{booking.client_name}</Link>
                    ) : (
                      <div>
                        {booking.client_name} <span className="admin-badge neutral">Клиент не из базы</span>
                      </div>
                    )}
                  </div>
                  <div className="admin-field">
                    <span>Телефон</span>
                    {booking.client_phone || "—"}
                  </div>
                  <div className="admin-field">
                    <span>Комментарий</span>
                    {booking.comment || "—"}
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
