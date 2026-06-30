"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type CarOwnershipType = "own" | "partner" | "leased";
type CarStatus = "active" | "service" | "repair" | "inactive";
type FilterKey = CarStatus | "all";
type OwnershipFilterKey = CarOwnershipType | "all";

type Car = {
  id: string;
  name: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  color: string | null;
  body_type: string | null;
  transmission: string | null;
  engine: string | null;
  fuel_type: string | null;
  mileage: number | null;
  car_class: string | null;
  registration_certificate: string | null;
  price_1_2_days: string | null;
  price_3_6_days: string | null;
  price_7_14_days: string | null;
  price_15_30_days: string | null;
  price_30_plus_days: string | null;
  deposit_amount: string | null;
  ownership_type: CarOwnershipType;
  status: CarStatus;
  comment: string | null;
};

type CarForm = {
  name: string;
  brand: string;
  model: string;
  year: string;
  plate_number: string;
  vin: string;
  color: string;
  body_type: string;
  transmission: string;
  engine: string;
  fuel_type: string;
  mileage: string;
  car_class: string;
  registration_certificate: string;
  price_1_2_days: string;
  price_3_6_days: string;
  price_7_14_days: string;
  price_15_30_days: string;
  price_30_plus_days: string;
  deposit_amount: string;
  ownership_type: CarOwnershipType;
  status: CarStatus;
  comment: string;
};

const initialForm: CarForm = {
  name: "",
  brand: "",
  model: "",
  year: "",
  plate_number: "",
  vin: "",
  color: "",
  body_type: "",
  transmission: "",
  engine: "",
  fuel_type: "",
  mileage: "",
  car_class: "",
  registration_certificate: "",
  price_1_2_days: "",
  price_3_6_days: "",
  price_7_14_days: "",
  price_15_30_days: "",
  price_30_plus_days: "",
  deposit_amount: "",
  ownership_type: "own",
  status: "active",
  comment: "",
};

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function statusLabel(status: CarStatus) {
  switch (status) {
    case "active":
      return "Доступна";
    case "service":
      return "Обслуживание";
    case "repair":
      return "Ремонт";
    case "inactive":
      return "Не используется";
    default:
      return status;
  }
}

function ownershipLabel(type: CarOwnershipType) {
  switch (type) {
    case "own":
      return "Своя";
    case "partner":
      return "Партнёрская";
    case "leased":
      return "Арендованная";
    default:
      return type;
  }
}

function carTitle(car: Car) {
  if (car.brand || car.model || car.year) {
    return `${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}`.trim() || car.name;
  }
  return car.name;
}

function emptyToDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function carToForm(car: Car): CarForm {
  return {
    name: car.name,
    brand: car.brand ?? "",
    model: car.model ?? "",
    year: car.year ? String(car.year) : "",
    plate_number: car.plate_number ?? "",
    vin: car.vin ?? "",
    color: car.color ?? "",
    body_type: car.body_type ?? "",
    transmission: car.transmission ?? "",
    engine: car.engine ?? "",
    fuel_type: car.fuel_type ?? "",
    mileage: car.mileage ? String(car.mileage) : "",
    car_class: car.car_class ?? "",
    registration_certificate: car.registration_certificate ?? "",
    price_1_2_days: car.price_1_2_days ?? "",
    price_3_6_days: car.price_3_6_days ?? "",
    price_7_14_days: car.price_7_14_days ?? "",
    price_15_30_days: car.price_15_30_days ?? "",
    price_30_plus_days: car.price_30_plus_days ?? "",
    deposit_amount: car.deposit_amount ?? "",
    ownership_type: car.ownership_type,
    status: car.status,
    comment: car.comment ?? "",
  };
}

function buildPayload(form: CarForm) {
  return {
    ...form,
    year: form.year.trim() ? Number(form.year) : null,
    mileage: form.mileage.trim() ? Number(form.mileage) : null,
    plate_number: form.plate_number.trim() || null,
    car_class: form.car_class.trim() || null,
    registration_certificate: form.registration_certificate.trim() || null,
    price_1_2_days: form.price_1_2_days.trim() ? Number(form.price_1_2_days.replace(",", ".")) : null,
    price_3_6_days: form.price_3_6_days.trim() ? Number(form.price_3_6_days.replace(",", ".")) : null,
    price_7_14_days: form.price_7_14_days.trim() ? Number(form.price_7_14_days.replace(",", ".")) : null,
    price_15_30_days: form.price_15_30_days.trim() ? Number(form.price_15_30_days.replace(",", ".")) : null,
    price_30_plus_days: form.price_30_plus_days.trim() ? Number(form.price_30_plus_days.replace(",", ".")) : null,
    deposit_amount: form.deposit_amount.trim() ? Number(form.deposit_amount.replace(",", ".")) : null,
  };
}

export default function CarManager() {
  const [cars, setCars] = useState<Car[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterKey>("all");
  const [ownershipType, setOwnershipType] = useState<OwnershipFilterKey>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [form, setForm] = useState<CarForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const summary = { all: 0, active: 0, maintenance: 0, inactive: 0 };
    for (const car of cars) {
      summary.all += 1;
      if (car.status === "active") summary.active += 1;
      if (car.status === "service" || car.status === "repair") summary.maintenance += 1;
      if (car.status === "inactive") summary.inactive += 1;
    }
    return summary;
  }, [cars]);

  useEffect(() => {
    loadCars();
  }, [search, status, ownershipType]);

  async function loadCars() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/cars", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (status !== "all") url.searchParams.set("status", status);
      if (ownershipType !== "all") url.searchParams.set("ownershipType", ownershipType);

      const response = await fetch(url.toString());
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка загрузки автомобилей");
        setCars([]);
      } else {
        setCars(result?.cars || []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка сети при загрузке автомобилей");
      setCars([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingCarId(null);
    setForm(initialForm);
    setMessage(null);
    setError(null);
  }

  function editCar(car: Car) {
    setEditingCarId(car.id);
    setForm(carToForm(car));
    setShowForm(true);
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const url = editingCarId ? `/api/admin/cars/${editingCarId}` : "/api/admin/cars";
      const response = await fetch(url, {
        method: editingCarId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });

      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка сохранения автомобиля");
        return;
      }

      setMessage(editingCarId ? "Автомобиль обновлён" : "Автомобиль добавлен");
      resetForm();
      setShowForm(false);
      await loadCars();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ошибка сохранения автомобиля");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(car: Car) {
    const confirmed = window.confirm(
      car.status === "inactive"
        ? "Удалить автомобиль? Если он связан с бронями, он останется отключённым."
        : "Удалить или отключить автомобиль? Если он связан с бронями, он будет переведён в неактивные."
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/cars/${car.id}`, { method: "DELETE" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка удаления автомобиля");
        return;
      }

      setMessage(result?.deleted ? "Автомобиль удалён" : "Автомобиль отключён, потому что используется в бронях");
      await loadCars();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка удаления автомобиля");
    }
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Автомобили</h1>
          <p className="admin-description">Локальный справочник автомобилей. На сайт передаются только даты занятости.</p>
        </div>
        <button
          type="button"
          className="admin-button admin-button-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Добавить автомобиль
        </button>
      </header>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Всего автомобилей</div>
          <div className="admin-stat-value">{totals.all}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Активные</div>
          <div className="admin-stat-value">{totals.active}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Ремонт/обслуживание</div>
          <div className="admin-stat-value">{totals.maintenance}</div>
        </div>
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Неактивные</div>
          <div className="admin-stat-value">{totals.inactive}</div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            className="admin-input"
            type="search"
            placeholder="Поиск по названию, госномеру или VIN"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value as FilterKey)}>
            <option value="all">Все статусы</option>
            <option value="active">Доступна</option>
            <option value="service">Обслуживание</option>
            <option value="repair">Ремонт</option>
            <option value="inactive">Не используется</option>
          </select>
          <select className="admin-select" value={ownershipType} onChange={(event) => setOwnershipType(event.target.value as OwnershipFilterKey)}>
            <option value="all">Все типы</option>
            <option value="own">Своя</option>
            <option value="partner">Партнёрская</option>
            <option value="leased">Арендованная</option>
          </select>
          <button type="button" className="admin-button admin-button-secondary" onClick={loadCars}>
            Обновить
          </button>
        </div>
        {loading ? <div className="admin-muted" style={{ marginTop: 12 }}>Загрузка...</div> : null}
      </section>

      {showForm ? (
        <section className="admin-card">
          <h2 className="admin-form-section-title">{editingCarId ? "Редактирование автомобиля" : "Добавление автомобиля"}</h2>
          <form className="admin-grid" onSubmit={handleSubmit}>
            <div className="admin-form-section">
              <h3 className="admin-form-section-title">Основное</h3>
              <div className="admin-grid-4">
                <label className="admin-label">
                  Название
                  <input className="admin-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </label>
                <label className="admin-label">
                  Марка
                  <input className="admin-input" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
                </label>
                <label className="admin-label">
                  Модель
                  <input className="admin-input" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
                </label>
                <label className="admin-label">
                  Год
                  <input className="admin-input" type="number" min="1950" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
                </label>
                <label className="admin-label">
                  Госномер
                  <input className="admin-input" value={form.plate_number} onChange={(event) => setForm({ ...form, plate_number: event.target.value })} />
                </label>
                <label className="admin-label">
                  VIN
                  <input className="admin-input" value={form.vin} onChange={(event) => setForm({ ...form, vin: event.target.value })} />
                </label>
                <label className="admin-label">
                  Класс автомобиля
                  <input className="admin-input" list="car-class-options" value={form.car_class} onChange={(event) => setForm({ ...form, car_class: event.target.value })} />
                  <datalist id="car-class-options">
                    <option value="эконом" />
                    <option value="комфорт" />
                    <option value="бизнес" />
                    <option value="люкс" />
                    <option value="SUV" />
                  </datalist>
                </label>
                <label className="admin-label">
                  Свидетельство о регистрации
                  <input className="admin-input" placeholder="2354 456356" value={form.registration_certificate} onChange={(event) => setForm({ ...form, registration_certificate: event.target.value })} />
                </label>
                <label className="admin-label">
                  Цвет
                  <input className="admin-input" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
                </label>
                <label className="admin-label">
                  Кузов
                  <input className="admin-input" value={form.body_type} onChange={(event) => setForm({ ...form, body_type: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">Цены по срокам аренды</h3>
              <div className="admin-grid-4">
                <label className="admin-label">1-2 дня<input className="admin-input" type="number" min="0" step="1" value={form.price_1_2_days} onChange={(event) => setForm({ ...form, price_1_2_days: event.target.value })} /></label>
                <label className="admin-label">3-6 дней<input className="admin-input" type="number" min="0" step="1" value={form.price_3_6_days} onChange={(event) => setForm({ ...form, price_3_6_days: event.target.value })} /></label>
                <label className="admin-label">7-14 дней<input className="admin-input" type="number" min="0" step="1" value={form.price_7_14_days} onChange={(event) => setForm({ ...form, price_7_14_days: event.target.value })} /></label>
                <label className="admin-label">15-30 дней<input className="admin-input" type="number" min="0" step="1" value={form.price_15_30_days} onChange={(event) => setForm({ ...form, price_15_30_days: event.target.value })} /></label>
                <label className="admin-label">31+ дней<input className="admin-input" type="number" min="0" step="1" value={form.price_30_plus_days} onChange={(event) => setForm({ ...form, price_30_plus_days: event.target.value })} /></label>
                <label className="admin-label">Залог<input className="admin-input" type="number" min="0" step="1" value={form.deposit_amount} onChange={(event) => setForm({ ...form, deposit_amount: event.target.value })} /></label>
              </div>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">Техника</h3>
              <div className="admin-grid-4">
                <label className="admin-label">
                  КПП
                  <input className="admin-input" value={form.transmission} onChange={(event) => setForm({ ...form, transmission: event.target.value })} />
                </label>
                <label className="admin-label">
                  Двигатель
                  <input className="admin-input" value={form.engine} onChange={(event) => setForm({ ...form, engine: event.target.value })} />
                </label>
                <label className="admin-label">
                  Топливо
                  <input className="admin-input" value={form.fuel_type} onChange={(event) => setForm({ ...form, fuel_type: event.target.value })} />
                </label>
                <label className="admin-label">
                  Пробег
                  <input className="admin-input" type="number" min="0" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">Управление</h3>
              <div className="admin-grid-2">
                <label className="admin-label">
                  Тип владения
                  <select className="admin-select" value={form.ownership_type} onChange={(event) => setForm({ ...form, ownership_type: event.target.value as CarOwnershipType })}>
                    <option value="own">Своя</option>
                    <option value="partner">Партнёрская / в управлении</option>
                    <option value="leased">Арендованная / привлечённая</option>
                  </select>
                </label>
                <label className="admin-label">
                  Статус
                  <select className="admin-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CarStatus })}>
                    <option value="active">Доступна</option>
                    <option value="service">Обслуживание</option>
                    <option value="repair">Ремонт</option>
                    <option value="inactive">Не используется</option>
                  </select>
                </label>
                <label className="admin-label" style={{ gridColumn: "1 / -1" }}>
                  Комментарий
                  <textarea className="admin-textarea" rows={4} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="admin-actions">
              <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить автомобиль"}
              </button>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                disabled={saving}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-card">
        <div className="admin-grid">
          {cars.length === 0 ? (
            <div className="admin-empty">Нет автомобилей для выбранного фильтра.</div>
          ) : (
            cars.map((car) => (
              <article key={car.id} className="admin-list-card">
                <div className="admin-list-card-header">
                  <div>
                    <div className="admin-row">
                      <div className="admin-list-title">
                        {carTitle(car)}
                        {car.plate_number ? <span className="admin-muted"> · {car.plate_number}</span> : null}
                      </div>
                      <span className={`admin-badge ${car.status === "active" ? "success" : car.status === "inactive" ? "neutral" : "warning"}`}>
                        {statusLabel(car.status)}
                      </span>
                      <span className="admin-badge info">{ownershipLabel(car.ownership_type)}</span>
                    </div>
                    {car.name !== carTitle(car) ? <div className="admin-muted" style={{ marginTop: 6 }}>{car.name}</div> : null}
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="admin-button admin-button-success" onClick={() => editCar(car)}>
                      Редактировать
                    </button>
                    <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(car)}>
                      {car.status === "inactive" ? "Удалить" : "Удалить / отключить"}
                    </button>
                  </div>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field">
                    <span>Год</span>
                    {emptyToDash(car.year)}
                  </div>
                  <div className="admin-field">
                    <span>Класс</span>
                    {emptyToDash(car.car_class)}
                  </div>
                  <div className="admin-field">
                    <span>Свидетельство о регистрации</span>
                    {emptyToDash(car.registration_certificate)}
                  </div>
                  <div className="admin-field">
                    <span>Пробег</span>
                    {car.mileage === null ? "—" : `${car.mileage.toLocaleString("ru-RU")} км`}
                  </div>
                  <div className="admin-field">
                    <span>Тарифы</span>
                    {[
                      car.price_1_2_days ? `1-2: ${Number(car.price_1_2_days).toLocaleString("ru-RU")} ₽` : null,
                      car.price_3_6_days ? `3-6: ${Number(car.price_3_6_days).toLocaleString("ru-RU")} ₽` : null,
                      car.price_7_14_days ? `7-14: ${Number(car.price_7_14_days).toLocaleString("ru-RU")} ₽` : null,
                      car.price_15_30_days ? `15-30: ${Number(car.price_15_30_days).toLocaleString("ru-RU")} ₽` : null,
                      car.price_30_plus_days ? `31+: ${Number(car.price_30_plus_days).toLocaleString("ru-RU")} ₽` : null,
                    ].filter(Boolean).join("; ") || "—"}
                  </div>
                  <div className="admin-field">
                    <span>Залог</span>
                    {car.deposit_amount ? `${Number(car.deposit_amount).toLocaleString("ru-RU")} ₽` : "—"}
                  </div>
                  <div className="admin-field">
                    <span>Комментарий</span>
                    {emptyToDash(car.comment)}
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
