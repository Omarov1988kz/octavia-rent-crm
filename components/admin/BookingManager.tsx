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

type CarOption = { id: string; name: string };

export default function BookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    carId: "",
    clientName: "",
    clientPhone: "",
    startDate: "",
    endDate: "",
    status: "request",
    comment: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleConfirm(id: string) {
    const response = await fetch(`/api/admin/bookings/${id}/confirm`, {
      method: "POST",
    });

    if (response.ok) {
      await loadData();
    }
  }

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

  const isFormValid = useMemo(() => {
    return (
      form.carId && form.clientName.trim() && form.startDate && form.endDate && new Date(form.startDate) < new Date(form.endDate)
    );
  }, [form]);

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
      setError(result?.message || "Ошибка при создании брони");
      return;
    }

    setForm({ carId: "", clientName: "", clientPhone: "", startDate: "", endDate: "", status: "request", comment: "" });
    setShowForm(false);
    await loadData();
  }

  async function handleCancel(id: string) {
    const response = await fetch(`/api/admin/bookings/${id}/cancel`, {
      method: "POST",
    });

    if (response.ok) {
      await loadData();
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1>Бронирования</h1>
          <p>Здесь можно добавить новую бронь и отменить уже существующую.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "white", cursor: "pointer" }}
        >
          {showForm ? "Скрыть форму" : "Добавить бронь"}
        </button>
      </div>

      {showForm ? (
        <section style={{ marginBottom: 24, padding: 20, borderRadius: 16, background: "white", boxShadow: "0 1px 3px rgba(15,23,42,0.08)" }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 8 }}>
              Автомобиль
              <select
                value={form.carId}
                onChange={(event) => setForm({ ...form, carId: event.target.value })}
                required
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
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
              Клиент
              <input
                type="text"
                value={form.clientName}
                onChange={(event) => setForm({ ...form, clientName: event.target.value })}
                required
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              Телефон
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(event) => setForm({ ...form, clientPhone: event.target.value })}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                Дата начала
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  required
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                Дата возврата
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  required
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              Статус
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                <option value="request">Заявка</option>
                <option value="booked">Бронь подтверждена</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              Комментарий
              <textarea
                value={form.comment}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
                rows={4}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              style={{ padding: "12px 16px", borderRadius: 8, border: "none", background: "#10b981", color: "white", cursor: "pointer" }}
            >
              {loading ? "Сохраняем..." : "Сохранить"}
            </button>
          </form>
        </section>
      ) : null}

      <section style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.08)", padding: 20 }}>
        <h2>Список броней</h2>
        {bookings.length === 0 ? (
          <p>Пока нет броней.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {bookings.map((booking) => (
              <div
                key={booking.id}
                style={{ padding: 16, borderRadius: 14, border: "1px solid #e5e7eb", display: "grid", gap: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                    <strong>{booking.car_name || "Автомобиль"}</strong>
                    <div>{formatDate(booking.start_date)} — {formatDate(booking.end_date)}</div>
                  </div>
                  <div>
                    <div style={{ marginBottom: 6 }}>Статус: <strong>{statusLabel(booking.status)}</strong></div>
                    {booking.status === "request" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleConfirm(booking.id)}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#10b981", color: "white", cursor: "pointer" }}
                        >
                          Подтвердить бронь
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(booking.id)}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer" }}
                        >
                          Отменить
                        </button>
                      </div>
                    ) : booking.status === "booked" ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(booking.id)}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer" }}
                      >
                        Отменить
                      </button>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div>Клиент: {booking.client_name}</div>
                  <div>Телефон: {booking.client_phone || "—"}</div>
                  <div>Комментарий: {booking.comment || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
