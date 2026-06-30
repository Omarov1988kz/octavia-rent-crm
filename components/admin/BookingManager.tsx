"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type BookingStatus = "request" | "booked" | "cancelled";
type ClientStatus = "new" | "checked" | "active" | "problem" | "archived";

type Booking = {
  id: string;
  car_id: string;
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
  client_status: ClientStatus;
  is_blacklisted: boolean;
};

type SelectedClient = {
  id: string;
  label: string;
  phone: string;
  client_status?: ClientStatus;
  is_blacklisted?: boolean;
};

type BookingForm = {
  carId: string;
  clientId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: BookingStatus;
  comment: string;
};

type QuickClientForm = {
  last_name: string;
  first_name: string;
  middle_name: string;
  phone: string;
  email: string;
  comments: string;
  acquisition_source: string;
  client_status: ClientStatus;
};

type ContractPreview = {
  contractNumber: number | null;
  client: string;
  car: string;
  rentalPeriod: string;
  rentalDays: number;
  carClass: string;
  dailyPrice: number | null;
  allowedMileage: number;
  depositAmount: number;
  discountPercent: number;
  rentAmountBeforeDiscount: number | null;
  discountAmount: number | null;
  rentAmount: number | null;
  totalAmountWithDeposit: number | null;
};

type ContractParamsForm = {
  daily_price: string;
  allowed_mileage: string;
  deposit_amount: string;
  discount_percent: string;
};

const initialForm: BookingForm = {
  carId: "",
  clientId: "",
  startDate: "",
  startTime: "12:00",
  endDate: "",
  endTime: "12:00",
  status: "request",
  comment: "",
};

const initialQuickClientForm: QuickClientForm = {
  last_name: "",
  first_name: "",
  middle_name: "",
  phone: "",
  email: "",
  comments: "",
  acquisition_source: "",
  client_status: "new",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatTime(value?: string) {
  return value ? value.slice(0, 5) : "12:00";
}

function normalizeTime(value?: string | null) {
  if (!value) return "12:00";
  return value.slice(0, 5);
}

function formatDateTime(date: string, time?: string) {
  return `${formatDate(date)} ${formatTime(time)}`;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNumberString(value: string, fallback = 0) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
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

function clientStatusLabel(status?: ClientStatus) {
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
      return "Клиент";
  }
}

function isValidDate(startDate: string, endDate: string, startTime: string, endTime: string) {
  if (!startDate || !endDate || !startTime || !endTime) return false;

  const start = new Date(`${startDate}T${normalizeTime(startTime)}:00`);
  const end = new Date(`${endDate}T${normalizeTime(endTime)}:00`);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
}

function fullClientName(client: ClientSearchResult | { last_name: string; first_name: string; middle_name?: string | null }) {
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

function bookingToForm(booking: Booking): BookingForm {
  return {
    carId: booking.car_id,
    clientId: booking.client_id ?? "",
    startDate: booking.start_date,
    startTime: normalizeTime(booking.start_time),
    endDate: booking.end_date,
    endTime: normalizeTime(booking.end_time),
    status: booking.status,
    comment: booking.comment ?? "",
  };
}

export default function BookingManager({ initialClientId }: { initialClientId?: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [initialEditForm, setInitialEditForm] = useState<BookingForm | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientSearchResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [clientWarning, setClientWarning] = useState<string | null>(null);
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState<QuickClientForm>(initialQuickClientForm);
  const [quickClientLoading, setQuickClientLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [contractBookingId, setContractBookingId] = useState<string | null>(null);
  const [contractPreview, setContractPreview] = useState<ContractPreview | null>(null);
  const [contractForm, setContractForm] = useState<ContractParamsForm>({ daily_price: "", allowed_mileage: "250", deposit_amount: "10000", discount_percent: "0" });
  const [contractLoading, setContractLoading] = useState(false);

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
    return bookings.filter((booking) => {
      if (initialClientId && booking.client_id !== initialClientId) return false;
      if (filter !== "all" && booking.status !== filter) return false;
      return true;
    });
  }, [bookings, filter, initialClientId]);

  const filteredClientName = useMemo(() => {
    if (!initialClientId) return null;
    return bookings.find((booking) => booking.client_id === initialClientId)?.client_name ?? null;
  }, [bookings, initialClientId]);

  const isFormValid = useMemo(
    () =>
      Boolean(
        form.carId &&
          form.clientId &&
          form.startDate &&
          form.startTime &&
          form.endDate &&
          form.endTime &&
          form.status &&
          isValidDate(form.startDate, form.endDate, form.startTime, form.endTime)
      ),
    [form]
  );

  const hasFormChanges = useMemo(() => {
    if (!editingBookingId) return true;
    if (!initialEditForm) return false;

    return (
      form.carId !== initialEditForm.carId ||
      form.clientId !== initialEditForm.clientId ||
      form.startDate !== initialEditForm.startDate ||
      normalizeTime(form.startTime) !== normalizeTime(initialEditForm.startTime) ||
      form.endDate !== initialEditForm.endDate ||
      normalizeTime(form.endTime) !== normalizeTime(initialEditForm.endTime) ||
      form.status !== initialEditForm.status ||
      form.comment !== initialEditForm.comment
    );
  }, [editingBookingId, form, initialEditForm]);

  const canSubmitForm = isFormValid && hasFormChanges;

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

  function resetForm() {
    setForm(initialForm);
    setEditingBookingId(null);
    setInitialEditForm(null);
    setClientSearch("");
    setSelectedClient(null);
    setClientOptions([]);
    setClientWarning(null);
    setError(null);
    setDateError(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
    setSuccessMessage(null);
  }

  function startEdit(booking: Booking) {
    const nextForm = bookingToForm(booking);
    setForm(nextForm);
    setInitialEditForm(nextForm);
    setEditingBookingId(booking.id);
    setSelectedClient(
      booking.client_id
        ? {
            id: booking.client_id,
            label: booking.client_name,
            phone: booking.client_phone ?? "",
          }
        : null
    );
    setClientSearch("");
    setClientOptions([]);
    setClientWarning(booking.client_id ? null : "Для сохранения выберите клиента из базы.");
    setDateError(null);
    setSuccessMessage(null);
    setShowForm(true);
  }

  function selectClient(client: ClientSearchResult) {
    const label = fullClientName(client);
    setSelectedClient({
      id: client.id,
      label,
      phone: client.phone ?? "",
      client_status: client.client_status,
      is_blacklisted: client.is_blacklisted,
    });
    setClientSearch("");
    setClientOptions([]);
    setClientWarning(client.is_blacklisted ? "Клиент в чёрном списке" : null);
    setForm({
      ...form,
      clientId: client.id,
    });
  }

  function clearSelectedClient() {
    setSelectedClient(null);
    setClientWarning("Выберите клиента из базы или создайте нового клиента.");
    setForm({ ...form, clientId: "" });
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDateError(null);

    if (!isValidDate(form.startDate, form.endDate, form.startTime, form.endTime)) {
      setDateError("Дата и время возврата должны быть позже даты и времени начала");
      return;
    }

    if (!form.clientId) {
      setClientWarning("Выберите клиента из базы или создайте нового клиента.");
      return;
    }

    setLoading(true);
    try {
      const startTime = normalizeTime(form.startTime);
      const endTime = normalizeTime(form.endTime);
      const response = await fetch(editingBookingId ? `/api/admin/bookings/${editingBookingId}` : "/api/admin/bookings", {
        method: editingBookingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: form.carId,
          clientId: form.clientId,
          startDate: form.startDate,
          startTime,
          endDate: form.endDate,
          endTime,
          status: form.status,
          comment: form.comment,
        }),
      });

      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || (editingBookingId ? "Ошибка при обновлении брони" : "Ошибка при создании брони"));
        return;
      }

      setSuccessMessage(editingBookingId ? "Бронь обновлена" : "Бронь добавлена");
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : editingBookingId ? "Ошибка при обновлении брони" : "Ошибка при создании брони");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuickClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuickClientLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_name: quickClientForm.last_name,
          first_name: quickClientForm.first_name,
          middle_name: quickClientForm.middle_name,
          phone: quickClientForm.phone,
          email: quickClientForm.email,
          comments: quickClientForm.comments,
          acquisition_source: quickClientForm.acquisition_source,
          client_status: quickClientForm.client_status,
        }),
      });

      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка создания клиента");
        return;
      }

      const client = result.client as ClientSearchResult;
      selectClient(client);
      setQuickClientForm(initialQuickClientForm);
      setShowQuickClientModal(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Ошибка создания клиента");
    } finally {
      setQuickClientLoading(false);
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

  async function openContractModal(bookingId: string) {
    setContractBookingId(bookingId);
    setContractPreview(null);
    setContractLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/contracts/rental/${bookingId}/preview`);
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка подготовки договора");
        setContractBookingId(null);
        return;
      }
      const preview = result.preview as ContractPreview;
      setContractPreview(preview);
      setContractForm({
        daily_price: preview.dailyPrice === null ? "" : String(preview.dailyPrice),
        allowed_mileage: String(preview.allowedMileage ?? 250),
        deposit_amount: String(preview.depositAmount ?? 10000),
        discount_percent: String(preview.discountPercent ?? 0),
      });
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Ошибка подготовки договора");
      setContractBookingId(null);
    } finally {
      setContractLoading(false);
    }
  }

  async function generateContractFromModal() {
    if (!contractBookingId) return;
    setContractLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/contracts/rental/${contractBookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_price: normalizeNumberString(contractForm.daily_price, 0),
          allowed_mileage: normalizeNumberString(contractForm.allowed_mileage, 250),
          deposit_amount: normalizeNumberString(contractForm.deposit_amount, 10000),
          discount_percent: normalizeNumberString(contractForm.discount_percent, 0),
        }),
      });
      if (!response.ok) {
        const result = await parseJson(response);
        setError(result?.message || "Ошибка формирования договора");
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match ? decodeURIComponent(match[1]) : "dogovor-arendy.docx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setContractBookingId(null);
      setContractPreview(null);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Ошибка формирования договора");
    } finally {
      setContractLoading(false);
    }
  }

  const contractCalculated = useMemo(() => {
    if (!contractPreview) return null;
    const dailyPrice = parseNumber(contractForm.daily_price);
    const rentalDays = contractPreview.rentalDays;
    const depositAmount = parseNumber(contractForm.deposit_amount);
    const discountPercent = Math.min(Math.max(parseNumber(contractForm.discount_percent), 0), 100);
    const rentAmountBeforeDiscount = dailyPrice * rentalDays;
    const discountAmount = Math.round((rentAmountBeforeDiscount * discountPercent) / 100);
    const rentAmount = rentAmountBeforeDiscount - discountAmount;
    return {
      rentAmountBeforeDiscount,
      discountAmount,
      rentAmount,
      totalAmountWithDeposit: rentAmount + depositAmount,
    };
  }, [contractForm, contractPreview]);

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Бронирования</h1>
          <p className="admin-description">Локальная работа с заявками и бронями. На сайт уходят только даты и статус.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-button admin-button-secondary" onClick={handleSync} disabled={syncLoading}>
            {syncLoading ? "Синхронизация..." : "Синхронизировать"}
          </button>
          <button type="button" className="admin-button admin-button-primary" onClick={openCreateForm}>
            Добавить бронь
          </button>
        </div>
      </header>

      {successMessage ? <div className="admin-message success">{successMessage}</div> : null}
      {syncMessage ? <div className="admin-message success">{syncMessage}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}
      {initialClientId ? (
        <div className="admin-card admin-row" style={{ justifyContent: "space-between" }}>
          <div>
            <strong>Бронирования клиента:</strong> {filteredClientName || initialClientId}
          </div>
          <Link className="admin-button admin-button-secondary" href="/admin/bookings">
            Сбросить фильтр
          </Link>
        </div>
      ) : null}

      <section className="admin-grid-4">
        <div className="admin-card admin-stat"><div className="admin-stat-label">Всего броней</div><div className="admin-stat-value">{totals.all}</div></div>
        <div className="admin-card admin-stat"><div className="admin-stat-label">Заявки</div><div className="admin-stat-value">{totals.request}</div></div>
        <div className="admin-card admin-stat"><div className="admin-stat-label">Подтверждено</div><div className="admin-stat-value">{totals.booked}</div></div>
        <div className="admin-card admin-stat"><div className="admin-stat-label">Отменено</div><div className="admin-stat-value">{totals.cancelled}</div></div>
      </section>

      <section className="admin-card">
        <div className="admin-row">
          {(["all", "request", "booked", "cancelled"] as FilterKey[]).map((key) => (
            <button key={key} type="button" className={`admin-button ${filter === key ? "admin-button-primary" : "admin-button-secondary"}`} onClick={() => setFilter(key)}>
              {key === "all" ? "Все" : statusLabel(key)}
            </button>
          ))}
        </div>
      </section>

      {showForm ? (
        <section className="admin-card">
          <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h2 className="admin-form-section-title" style={{ margin: 0 }}>{editingBookingId ? "Редактирование брони" : "Новая бронь"}</h2>
            <button type="button" className="admin-button admin-button-secondary" onClick={() => { resetForm(); setShowForm(false); }}>
              Закрыть форму
            </button>
          </div>
          <form onSubmit={handleSubmit} className="admin-grid">
            <div className="admin-form-section">
              <h3 className="admin-form-section-title">1. Автомобиль</h3>
              <label className="admin-label">
                Автомобиль
                <select className="admin-select" value={form.carId} onChange={(event) => setForm({ ...form, carId: event.target.value })} required>
                  <option value="">Выберите автомобиль</option>
                  {uniqueCars.map((car) => (
                    <option key={car.id} value={car.id}>{carLabel(car)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">2. Период аренды</h3>
              <div className="admin-grid-4">
                <label className="admin-label">Дата начала<input className="admin-input" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
                <label className="admin-label">Время начала<input className="admin-input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /></label>
                <label className="admin-label">Дата возврата<input className="admin-input" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label>
                <label className="admin-label">Время возврата<input className="admin-input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></label>
              </div>
              {dateError ? <div className="admin-message error" style={{ marginTop: 12 }}>{dateError}</div> : null}
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">3. Клиент</h3>
              <div className="admin-grid">
                <div>
                  <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                    <div className="admin-muted" style={{ fontWeight: 700 }}>Выбрать клиента из базы</div>
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowQuickClientModal(true)}>
                      + Создать нового клиента
                    </button>
                  </div>
                  {selectedClient ? (
                    <div className="admin-selected-client">
                      <div>
                        <strong>Выбран:</strong> {selectedClient.label}
                        {selectedClient.phone ? ` · ${selectedClient.phone}` : ""}
                        <div style={{ marginTop: 6 }}>
                          <span className="admin-badge info">{clientStatusLabel(selectedClient.client_status)}</span>{" "}
                          {selectedClient.is_blacklisted ? <span className="admin-badge danger">Чёрный список</span> : null}
                        </div>
                      </div>
                      <button type="button" className="admin-button admin-button-secondary" onClick={clearSelectedClient}>Сменить</button>
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

              </div>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">4. Статус</h3>
              <label className="admin-label">
                Статус
                <select className="admin-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BookingStatus })}>
                  <option value="request">Заявка</option>
                  <option value="booked">Бронь подтверждена</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </label>
            </div>

            <div className="admin-form-section">
              <h3 className="admin-form-section-title">5. Комментарий</h3>
              <textarea className="admin-textarea" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} rows={4} />
            </div>

            <div className="admin-actions">
              <button type="submit" className="admin-button admin-button-primary" disabled={!canSubmitForm || loading}>
                {loading ? "Сохраняем..." : editingBookingId ? "Сохранить изменения" : "Сохранить бронь"}
              </button>
              <button type="button" className="admin-button admin-button-secondary" onClick={resetForm} disabled={loading}>Очистить форму</button>
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
                    <div className="admin-muted" style={{ marginTop: 6 }}>{formatDateTime(booking.start_date, booking.start_time)} — {formatDateTime(booking.end_date, booking.end_time)}</div>
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="admin-button admin-button-primary" onClick={() => openContractModal(booking.id)}>
                      Сформировать договор
                    </button>
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => startEdit(booking)}>Редактировать</button>
                    {booking.status === "request" ? (
                      <button type="button" className="admin-button admin-button-success" onClick={() => handleConfirm(booking.id)}>Подтвердить бронь</button>
                    ) : null}
                    {booking.status !== "cancelled" ? (
                      <button type="button" className="admin-button admin-button-secondary" onClick={() => handleCancel(booking.id)}>Отменить</button>
                    ) : null}
                    <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(booking.id)}>Удалить</button>
                  </div>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field">
                    <span>Клиент</span>
                    {booking.client_id ? (
                      <Link href={`/admin/clients/${booking.client_id}`}>{booking.client_name}</Link>
                    ) : (
                      <div>{booking.client_name} <span className="admin-badge neutral">Клиент не из базы</span></div>
                    )}
                  </div>
                  <div className="admin-field"><span>Телефон</span>{booking.client_phone || "—"}</div>
                  <div className="admin-field"><span>Комментарий</span>{booking.comment || "—"}</div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {showQuickClientModal ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowQuickClientModal(false);
        }}>
          <div className="admin-modal-panel" style={{ width: "min(720px, 100%)" }}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-title" style={{ margin: 0 }}>Новый клиент</h2>
                <p className="admin-description">Короткая карточка для выбора в бронь.</p>
              </div>
              <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowQuickClientModal(false)}>Закрыть</button>
            </div>
            <form className="admin-modal-body" onSubmit={handleCreateQuickClient}>
              <div className="admin-grid-2">
                <label className="admin-label">Фамилия<input className="admin-input" value={quickClientForm.last_name} onChange={(event) => setQuickClientForm({ ...quickClientForm, last_name: event.target.value })} required /></label>
                <label className="admin-label">Имя<input className="admin-input" value={quickClientForm.first_name} onChange={(event) => setQuickClientForm({ ...quickClientForm, first_name: event.target.value })} required /></label>
                <label className="admin-label">Отчество<input className="admin-input" value={quickClientForm.middle_name} onChange={(event) => setQuickClientForm({ ...quickClientForm, middle_name: event.target.value })} /></label>
                <label className="admin-label">Телефон<input className="admin-input" type="tel" value={quickClientForm.phone} onChange={(event) => setQuickClientForm({ ...quickClientForm, phone: event.target.value })} /></label>
                <label className="admin-label">Email<input className="admin-input" type="email" value={quickClientForm.email} onChange={(event) => setQuickClientForm({ ...quickClientForm, email: event.target.value })} /></label>
                <label className="admin-label">Источник привлечения<input className="admin-input" value={quickClientForm.acquisition_source} onChange={(event) => setQuickClientForm({ ...quickClientForm, acquisition_source: event.target.value })} /></label>
                <label className="admin-label">
                  Статус клиента
                  <select className="admin-select" value={quickClientForm.client_status} onChange={(event) => setQuickClientForm({ ...quickClientForm, client_status: event.target.value as ClientStatus })}>
                    <option value="new">Новый</option>
                    <option value="checked">Проверен</option>
                    <option value="active">Активный</option>
                    <option value="problem">Проблемный</option>
                    <option value="archived">Архивный</option>
                  </select>
                </label>
              </div>
              <label className="admin-label">Комментарий<textarea className="admin-textarea" rows={3} value={quickClientForm.comments} onChange={(event) => setQuickClientForm({ ...quickClientForm, comments: event.target.value })} /></label>
              <div className="admin-actions">
                <button type="submit" className="admin-button admin-button-primary" disabled={quickClientLoading}>{quickClientLoading ? "Создаём..." : "Создать и выбрать"}</button>
                <button type="button" className="admin-button admin-button-secondary" disabled={quickClientLoading} onClick={() => setShowQuickClientModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {contractBookingId ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !contractLoading) setContractBookingId(null);
        }}>
          <div className="admin-modal-panel" style={{ width: "min(900px, 100%)" }}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-title" style={{ margin: 0 }}>Параметры договора</h2>
                <p className="admin-description">Проверьте расчёты перед формированием.</p>
              </div>
              <button type="button" className="admin-button admin-button-secondary" disabled={contractLoading} onClick={() => setContractBookingId(null)}>Закрыть</button>
            </div>
            <div className="admin-modal-body">
              {contractLoading && !contractPreview ? <div className="admin-muted">Загрузка...</div> : null}
              {contractPreview ? (
                <>
                  <section className="admin-info-section">
                    <div className="admin-info-grid">
                      <div className="admin-info-item"><span>Номер договора</span>{contractPreview.contractNumber ?? "будет присвоен при формировании"}</div>
                      <div className="admin-info-item"><span>Клиент</span>{contractPreview.client}</div>
                      <div className="admin-info-item"><span>Автомобиль</span>{contractPreview.car}</div>
                      <div className="admin-info-item"><span>Период аренды</span>{contractPreview.rentalPeriod}</div>
                      <div className="admin-info-item"><span>Срок</span>{contractPreview.rentalDays} сут.</div>
                      <div className="admin-info-item"><span>Класс</span>{contractPreview.carClass}</div>
                    </div>
                  </section>

                  <section className="admin-info-section">
                    <h3 className="admin-info-title">Редактируемые параметры</h3>
                    <div className="admin-grid-4">
                      <label className="admin-label">Километраж в сутки<input className="admin-input" type="number" min="0" step="1" value={contractForm.allowed_mileage} onChange={(event) => setContractForm({ ...contractForm, allowed_mileage: event.target.value })} /></label>
                      <label className="admin-label">Депозит, ₽<input className="admin-input" type="number" min="0" step="1" value={contractForm.deposit_amount} onChange={(event) => setContractForm({ ...contractForm, deposit_amount: event.target.value })} /></label>
                      <label className="admin-label">Тариф за сутки, ₽<input className="admin-input" type="number" min="0" step="1" value={contractForm.daily_price} onChange={(event) => setContractForm({ ...contractForm, daily_price: event.target.value })} /></label>
                      <label className="admin-label">Скидка, %<input className="admin-input" type="number" min="0" max="100" step="0.01" value={contractForm.discount_percent} onChange={(event) => setContractForm({ ...contractForm, discount_percent: event.target.value })} /></label>
                    </div>
                  </section>

                  <section className="admin-info-section">
                    <h3 className="admin-info-title">Итог</h3>
                    <div className="admin-info-grid">
                      <div className="admin-info-item"><span>Аренда без скидки</span>{formatMoney(contractCalculated?.rentAmountBeforeDiscount)}</div>
                      <div className="admin-info-item"><span>Скидка</span>{parseNumber(contractForm.discount_percent) > 0 ? `${contractForm.discount_percent}% / ${formatMoney(contractCalculated?.discountAmount)}` : "—"}</div>
                      <div className="admin-info-item"><span>Сумма аренды</span>{formatMoney(contractCalculated?.rentAmount)}</div>
                      <div className="admin-info-item"><span>Аренда + депозит</span>{formatMoney(contractCalculated?.totalAmountWithDeposit)}</div>
                    </div>
                  </section>

                  <div className="admin-actions">
                    <button type="button" className="admin-button admin-button-primary" disabled={contractLoading} onClick={generateContractFromModal}>
                      {contractLoading ? "Формируем..." : "Сформировать договор"}
                    </button>
                    <button type="button" className="admin-button admin-button-secondary" disabled={contractLoading} onClick={() => setContractBookingId(null)}>
                      Отмена
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
