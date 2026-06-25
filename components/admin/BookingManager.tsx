"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type BookingStatus = "request" | "booked" | "cancelled";

type Booking = {
  id: string;
  car_name: string | null;
  client_name: string;
  client_phone: string | null;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  comment: string | null;
};

type FilterKey = "all" | BookingStatus;

type CarOption = { id: string; name: string };

const initialForm = {
  carId: "",
  clientName: "",
  clientPhone: "",
  startDate: "",
  endDate: "",
  status: "request" as BookingStatus,
  comment: "",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}.${month}.${year}`;
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "request":
      return "Заявка";
    case "booked":
      return "Занято / бронь";
    case "cancelled":
      return "Отменено";
    default:
      return status;
  }
}

function statusBadge(status: BookingStatus) {
  const base = {
    padding: "4px 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  } as const;

  if (status === "request") {
    return { ...base, background: "#fef3c7", color: "#92400e" };
  }

  if (status === "booked") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  return { ...base, background: "#e5e7eb", color: "#374151" };
}

function isValidDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return false;
  }

  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);

  if ([sy, sm, sd, ey, em, ed].some((value) => Number.isNaN(value))) {
    return false;
  }

  return sy * 10000 + sm * 100 + sd < ey * 10000 + em * 100 + ed;
}

export default function BookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const totals = useMemo(() => {
    const summary = { all: 0, request: 0, booked: 0, cancelled: 0 };
    for (const booking of bookings) {
      summary.all += 1;
      summary[booking.status] += 1;
    }
    return summary;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === "all") {
      return bookings;
    }
    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const isFormValid = useMemo(
    () =>
      Boolean(
        form.carId &&
          form.clientName.trim() &&
          form.startDate &&
          form.endDate &&
          isValidDateRange(form.startDate, form.endDate)
      ),
    [form]
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const bookingsResponse = await fetch("/api/admin/bookings");
    const bookingsJson = await bookingsResponse.json();
    setBookings(bookingsJson.bookings || []);

    const carsResponse = await fetch("/api/admin/cars");
    const carsJson = await carsResponse.json();
    setCars(carsJson.cars || []);
  }

  async function handleConfirm(id: string) {
    const response = await fetch(`/api/admin/bookings/${id}/confirm`, {
      method: "POST",
    });

    if (response.ok) {
      await loadData();
    }
  }

  async function handleCancel(id: string) {
    const response = await fetch(`/api/admin/bookings/${id}/cancel`, {
      method: "POST",
    });

    if (response.ok) {
      await loadData();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      const message = result?.message || "Ошибка при создании брони";
      setError(message === "На эти даты уже есть бронь" ? "На эти даты уже есть бронь или заявка" : message);
      return;
    }

    setForm(initialForm);
    setShowForm(false);
    await loadData();
  }

  async function handleSync() {
    setError(null);
    setSyncMessage(null);
    setSyncLoading(true);

    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
      });

      const result = await response.json();
      setSyncLoading(false);

      if (!response.ok) {
        setError(result?.message || "Ошибка синхронизации");
        return;
      }

      setSyncMessage(result?.message || "Синхронизация выполнена");
    } catch (e) {
      setSyncLoading(false);
      setError(e instanceof Error ? e.message : "Ошибка синхронизации");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, minHeight: "100%" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>Бронирования</h1>
          <p style={{ margin: "10px 0 0", color: "#475569" }}>
            Работайте с заявками и бронями. На сайт отправляются только даты и статус, без персональных данных.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
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
          {showForm ? "Скрыть форму" : "Добавить бронь"}
        </button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Всего броней</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.all}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Заявки</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.request}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Подтверждённые</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.booked}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <div style={{ color: "#475569", marginBottom: 8 }}>Отменённые</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.cancelled}</div>
        </div>
      </section>

      <section style={{ marginBottom: 24, padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["all", "request", "booked", "cancelled"] as FilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 9999,
                  border: key === filter ? "1px solid #2563eb" : "1px solid #d1d5db",
                  background: key === filter ? "#eff6ff" : "white",
                  color: "#0f172a",
                  cursor: "pointer",
                  fontWeight: key === filter ? 600 : 500,
                }}
              >
                {key === "all" ? "Все" : key === "request" ? "Заявки" : key === "booked" ? "Подтверждённые" : "Отменённые"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncLoading}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: syncLoading ? "#93c5fd" : "#2563eb",
                color: "white",
                cursor: syncLoading ? "not-allowed" : "pointer",
              }}
            >
              {syncLoading ? "Синхронизация..." : "Синхронизировать с сайтом"}
            </button>
            <span style={{ color: "#6b7280", fontSize: 14 }}>
              На сайт отправляются только даты и статус, без персональных данных.
            </span>
          </div>
          {syncMessage ? (
            <div style={{ marginTop: 12, color: "#166534", fontWeight: 600 }}>{syncMessage}</div>
          ) : null}
        </div>

        <p style={{ marginTop: 16, color: "#475569" }}>
          На сайт отправляются только даты и статус, без персональных данных.
        </p>
      </section>

      {showForm ? (
        <section style={{ marginBottom: 24, padding: 20, borderRadius: 18, background: "white", boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Добавление брони</h2>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                Автомобиль
                <select
                  value={form.carId}
                  onChange={(event) => setForm({ ...form, carId: event.target.value })}
                  required
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                >
                  <option value="">Выберите автомобиль</option>
                  {cars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                Статус
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as BookingStatus })}
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                >
                  <option value="request">Заявка</option>
                  <option value="booked">Бронь подтверждена</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                Дата начала
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  required
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                Дата возврата
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  required
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                Имя клиента
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(event) => setForm({ ...form, clientName: event.target.value })}
                  required
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                Телефон
                <input
                  type="tel"
                  value={form.clientPhone}
                  onChange={(event) => setForm({ ...form, clientPhone: event.target.value })}
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              Комментарий
              <textarea
                value={form.comment}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
                rows={4}
                style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
              />
            </label>

            {error ? (
              <div style={{ padding: 12, borderRadius: 12, background: "#fee2e2", color: "#831843" }}>{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                border: "none",
                background: "#2563eb",
                color: "white",
                cursor: isFormValid && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Сохраняем..." : "Сохранить бронь"}
            </button>
          </form>
        </section>
      ) : null}

      <section style={{ background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(15,23,42,0.08)", padding: 20 }}>
        <div style={{ display: "grid", gap: 16 }}>
          {filteredBookings.length === 0 ? (
            <div style={{ padding: 28, borderRadius: 16, background: "#f8fafc", color: "#475569" }}>
              Нет броней для выбранного фильтра.
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  display: "grid",
                  gap: 14,
                  padding: 20,
                  borderRadius: 18,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{booking.car_name || "Автомобиль"}</div>
                      <span style={statusBadge(booking.status)}>{statusLabel(booking.status)}</span>
                    </div>
                    <div style={{ color: "#475569", marginTop: 6 }}>
                      {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {booking.status === "request" ? (
                      <button
                        type="button"
                        onClick={() => handleConfirm(booking.id)}
                        style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#10b981", color: "white", cursor: "pointer" }}
                      >
                        Подтвердить бронь
                      </button>
                    ) : null}
                    {booking.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(booking.id)}
                        style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#ef4444", color: "white", cursor: "pointer" }}
                      >
                        Отменить
                      </button>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10, color: "#334155" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>Клиент:</span> {booking.client_name}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Телефон:</span> {booking.client_phone || "—"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Комментарий:</span> {booking.comment || "—"}
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
