"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type ClientStatus = "new" | "checked" | "active" | "problem" | "archived";
type ClientGender = "male" | "female" | "other" | "unknown";
type BookingStatus = "request" | "booked" | "cancelled";
type SocialProfileType = "instagram" | "telegram" | "whatsapp" | "vk" | "avito" | "other";
type LeadSource = "avito" | "site" | "yandex_maps" | "2gis" | "referral" | "other" | "";

type AdditionalPhone = {
  phone: string;
  comment: string;
};

type SocialProfile = {
  type: SocialProfileType;
  value: string;
  comment: string;
};

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
  additional_phones?: AdditionalPhone[] | null;
  social_profiles?: SocialProfile[] | null;
  acquisition_source?: string | null;
  lead_source?: LeadSource | null;
  lead_source_comment?: string | null;
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
  additional_phones: AdditionalPhone[];
  social_profiles: SocialProfile[];
  acquisition_source: string;
  lead_source: LeadSource;
  lead_source_comment: string;
  is_blacklisted: boolean;
  blacklist_reason: string;
};

type InnLookupState =
  | { status: "idle"; message: string | null; inn: string | null }
  | { status: "loading"; message: string | null; inn: string | null }
  | { status: "found"; message: string; inn: string }
  | { status: "error"; message: string; inn: string | null };

type AddressFieldName = "registration_address" | "residential_address";

type AddressSuggestion = {
  value: string;
  unrestrictedValue?: string;
};

type AddressSuggestState = {
  field: AddressFieldName | null;
  suggestions: AddressSuggestion[];
  message: string | null;
  loading: boolean;
};

type FmsSuggestion = {
  value: string;
  code: string;
  name: string;
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
  document_type: "Паспорт",
  document_series_number: "",
  document_issued_by: "",
  document_issued_date: "",
  passport_department_code: "",
  document_expiry_date: "",
  driver_license_number: "",
  driver_license_issued_date: "",
  driver_license_expiry_date: "",
  driver_license_categories: "",
  driver_license_country: "РФ",
  kbm: "",
  inn: "",
  client_registration_date: new Date().toISOString().slice(0, 10),
  client_status: "new",
  preferences: "",
  comments: "",
  social_links: "",
  additional_phones: [],
  social_profiles: [],
  acquisition_source: "",
  lead_source: "",
  lead_source_comment: "",
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

const socialProfileTypes: { type: SocialProfileType; label: string }[] = [
  { type: "instagram", label: "Instagram" },
  { type: "telegram", label: "Telegram" },
  { type: "whatsapp", label: "WhatsApp" },
  { type: "vk", label: "VK" },
  { type: "avito", label: "Avito" },
  { type: "other", label: "Другое" },
];

const leadSourceOptions: { value: LeadSource; label: string }[] = [
  { value: "", label: "Не указано" },
  { value: "avito", label: "Avito" },
  { value: "site", label: "сайт" },
  { value: "yandex_maps", label: "Яндекс Карты" },
  { value: "2gis", label: "2ГИС" },
  { value: "referral", label: "сарафан" },
  { value: "other", label: "другое" },
];

const driverLicenseCategoryOptions = ["A", "B", "C", "D", "E"];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatRussianPhone(value: string) {
  let digits = onlyDigits(value);
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const local = digits.slice(1);
  const p1 = local.slice(0, 3);
  const p2 = local.slice(3, 6);
  const p3 = local.slice(6, 8);
  const p4 = local.slice(8, 10);

  let formatted = "+7";
  if (p1) formatted += ` (${p1}`;
  if (p1.length === 3) formatted += ")";
  if (p2) formatted += ` ${p2}`;
  if (p3) formatted += `-${p3}`;
  if (p4) formatted += `-${p4}`;
  return formatted;
}

function isCompleteRussianPhone(value: string) {
  return onlyDigits(value).length === 11;
}

function formatTenDigitDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 10);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

function formatDepartmentCode(value: string) {
  const digits = onlyDigits(value).slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeAdditionalPhones(value: unknown): AdditionalPhone[] {
  return parseJsonArray<Partial<AdditionalPhone>>(value).map((item) => ({
    phone: item.phone ? formatRussianPhone(item.phone) : "",
    comment: item.comment ?? "",
  }));
}

function normalizeSocialProfiles(value: unknown): SocialProfile[] {
  return parseJsonArray<Partial<SocialProfile>>(value).map((item) => ({
    type: socialProfileTypes.some((profileType) => profileType.type === item.type) ? (item.type as SocialProfileType) : "other",
    value: item.value ?? "",
    comment: item.comment ?? "",
  }));
}

function socialProfileLabel(type: SocialProfileType) {
  return socialProfileTypes.find((item) => item.type === type)?.label ?? "Другое";
}

function leadSourceLabel(value?: LeadSource | null) {
  return leadSourceOptions.find((item) => item.value === value)?.label ?? value ?? "";
}

function ageAtDate(birthDate: string, checkDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const check = new Date(`${checkDate}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(check.getTime())) return null;

  let age = check.getFullYear() - birth.getFullYear();
  const monthDiff = check.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && check.getDate() < birth.getDate())) age -= 1;
  return age;
}

function passportIssueHint(form: ClientForm) {
  if (!form.birth_date || !form.document_issued_date) return null;
  const age = ageAtDate(form.birth_date, form.document_issued_date);
  if (age === null) return null;

  const isPlanned = [14, 20, 45].some((targetAge) => Math.abs(age - targetAge) <= 1);
  if (isPlanned) {
    return { tone: "success" as const, text: "Дата выдачи выглядит корректно" };
  }

  const genderText =
    form.gender === "female"
      ? "Это может быть связано со сменой фамилии или заменой документа."
      : form.gender === "male"
        ? "Обратите внимание на причину замены документа."
        : "";

  return {
    tone: "warning" as const,
    text: `Проверьте дату выдачи паспорта: выдача не похожа на плановую замену в 14, 20 или 45 лет. ${genderText}`.trim(),
  };
}

function isKbmValid(value: string) {
  if (!value.trim()) return true;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) && normalized >= 0.4 && normalized <= 3;
}

function canFindInn(form: ClientForm) {
  return Boolean(
    form.last_name.trim() &&
      form.first_name.trim() &&
      form.birth_date.trim() &&
      onlyDigits(form.document_series_number).length === 10 &&
      form.document_issued_date.trim()
  );
}

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
  const payload: Record<string, string | boolean | null | AdditionalPhone[] | SocialProfile[]> = {
    ...form,
    phone: form.phone.trim() ? formatRussianPhone(form.phone) : "",
    document_series_number: formatTenDigitDocument(form.document_series_number),
    passport_department_code: formatDepartmentCode(form.passport_department_code),
    driver_license_number: formatTenDigitDocument(form.driver_license_number),
    additional_phones: form.additional_phones
      .map((item) => ({ phone: item.phone.trim() ? formatRussianPhone(item.phone) : "", comment: item.comment.trim() }))
      .filter((item) => item.phone),
    social_profiles: form.social_profiles
      .map((item) => ({ type: item.type, value: item.value.trim(), comment: item.comment.trim() }))
      .filter((item) => item.value),
    acquisition_source: leadSourceOptions.find((item) => item.value === form.lead_source)?.label ?? form.acquisition_source,
  };
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
    phone: client.phone ? formatRussianPhone(client.phone) : "",
    email: client.email ?? "",
    residential_address: client.residential_address ?? "",
    registration_address: client.registration_address ?? "",
    document_type: client.document_type ?? "Паспорт",
    document_series_number: formatTenDigitDocument(client.document_series_number ?? ""),
    document_issued_by: client.document_issued_by ?? "",
    document_issued_date: client.document_issued_date ?? "",
    passport_department_code: formatDepartmentCode(client.passport_department_code ?? ""),
    document_expiry_date: client.document_expiry_date ?? "",
    driver_license_number: formatTenDigitDocument(client.driver_license_number ?? ""),
    driver_license_issued_date: client.driver_license_issued_date ?? "",
    driver_license_expiry_date: client.driver_license_expiry_date ?? "",
    driver_license_categories: client.driver_license_categories ?? "",
    driver_license_country: client.driver_license_country ?? "РФ",
    kbm: client.kbm ?? "",
    inn: client.inn ?? "",
    client_registration_date: client.client_registration_date ?? "",
    client_status: client.client_status,
    preferences: client.preferences ?? "",
    comments: client.comments ?? "",
    social_links: client.social_links ?? "",
    additional_phones: normalizeAdditionalPhones(client.additional_phones),
    social_profiles: normalizeSocialProfiles(client.social_profiles),
    acquisition_source: client.acquisition_source ?? "",
    lead_source: client.lead_source ?? "",
    lead_source_comment: client.lead_source_comment ?? "",
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
        <Link className="admin-button admin-button-secondary" href="/admin/bookings">
          Открыть в бронированиях
        </Link>
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
  const [innLookup, setInnLookup] = useState<InnLookupState>({ status: "idle", message: null, inn: null });
  const [addressSuggest, setAddressSuggest] = useState<AddressSuggestState>({ field: null, suggestions: [], message: null, loading: false });
  const [fmsSuggestions, setFmsSuggestions] = useState<FmsSuggestion[]>([]);
  const [fmsMessage, setFmsMessage] = useState<string | null>(null);
  const [fmsLoading, setFmsLoading] = useState(false);

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

  const passportHint = useMemo(() => passportIssueHint(form), [form]);
  const kbmValid = useMemo(() => isKbmValid(form.kbm), [form.kbm]);
  const innLookupReady = useMemo(() => canFindInn(form), [form]);

  useEffect(() => {
    loadClients();
  }, [filter, search, blacklistOnly]);

  useEffect(() => {
    const field = addressSuggest.field;
    if (!field) return;

    const query = form[field].trim();
    if (query.length < 3) {
      setAddressSuggest((state) => ({ ...state, suggestions: [], message: null, loading: false }));
      return;
    }

    const timeout = window.setTimeout(async () => {
      setAddressSuggest((state) => ({ ...state, loading: true }));
      try {
        const response = await fetch("/api/admin/dadata/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await parseJson(response);
        setAddressSuggest((state) => ({
          ...state,
          suggestions: Array.isArray(result?.suggestions) ? result.suggestions : [],
          message: result?.message ?? null,
          loading: false,
        }));
      } catch {
        setAddressSuggest((state) => ({
          ...state,
          suggestions: [],
          message: "Подсказки временно недоступны",
          loading: false,
        }));
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [addressSuggest.field, form.registration_address, form.residential_address]);

  useEffect(() => {
    const code = onlyDigits(form.passport_department_code);
    if (code.length !== 6) {
      setFmsSuggestions([]);
      setFmsMessage(null);
      setFmsLoading(false);
      return;
    }

    let cancelled = false;
    async function loadFmsSuggestions() {
      setFmsLoading(true);
      try {
        const response = await fetch("/api/admin/dadata/fms-unit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: formatDepartmentCode(code) }),
        });
        const result = await parseJson(response);
        if (cancelled) return;

        const suggestions = Array.isArray(result?.suggestions) ? result.suggestions as FmsSuggestion[] : [];
        setFmsSuggestions(suggestions);
        setFmsMessage(result?.message ?? null);
        if (!form.document_issued_by.trim() && suggestions.length === 1) {
          const suggestion = suggestions[0];
          setForm((current) => current.document_issued_by.trim() ? current : { ...current, document_issued_by: suggestion.name || suggestion.value });
        }
      } catch {
        if (!cancelled) {
          setFmsSuggestions([]);
          setFmsMessage("Подсказки временно недоступны");
        }
      } finally {
        if (!cancelled) setFmsLoading(false);
      }
    }

    loadFmsSuggestions();
    return () => {
      cancelled = true;
    };
  }, [form.passport_department_code]);

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
    setInnLookup({ status: "idle", message: null, inn: null });
    setAddressSuggest({ field: null, suggestions: [], message: null, loading: false });
    setFmsSuggestions([]);
    setFmsMessage(null);
    setFmsLoading(false);
    setError(null);
    setMessage(null);
  }

  function startEdit(client: Client) {
    setSelectedClient(null);
    setClientBookings(null);
    setInnLookup({ status: "idle", message: null, inn: null });
    setAddressSuggest({ field: null, suggestions: [], message: null, loading: false });
    setFmsSuggestions([]);
    setFmsMessage(null);
    setFmsLoading(false);
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

    if (!kbmValid) {
      setError("КБМ должен быть числом от 0.4 до 3");
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

  async function handleFindInn() {
    if (!innLookupReady) {
      setInnLookup({
        status: "error",
        message: "Для поиска ИНН заполните ФИО, дату рождения, паспорт и дату выдачи.",
        inn: null,
      });
      return;
    }

    setInnLookup({ status: "loading", message: "Ищем ИНН...", inn: null });
    try {
      const response = await fetch("/api/admin/clients/find-inn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName: form.last_name,
          firstName: form.first_name,
          patronymic: form.middle_name,
          birthDate: form.birth_date,
          passportNumber: formatTenDigitDocument(form.document_series_number),
          passportIssuedDate: form.document_issued_date,
        }),
      });
      const result = await parseJson(response);

      if (!response.ok || !result?.ok) {
        setInnLookup({
          status: "error",
          message: result?.message || "ИНН не найден по указанным данным",
          inn: null,
        });
        return;
      }

      setInnLookup({ status: "found", message: `Найден ИНН: ${result.inn}`, inn: result.inn });
    } catch {
      setInnLookup({
        status: "error",
        message: "Сервис ФНС временно недоступен. ИНН можно указать вручную.",
        inn: null,
      });
    }
  }

  function updateAdditionalPhone(index: number, patch: Partial<AdditionalPhone>) {
    setForm({
      ...form,
      additional_phones: form.additional_phones.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  }

  function removeAdditionalPhone(index: number) {
    setForm({ ...form, additional_phones: form.additional_phones.filter((_, itemIndex) => itemIndex !== index) });
  }

  function updateSocialProfile(index: number, patch: Partial<SocialProfile>) {
    setForm({
      ...form,
      social_profiles: form.social_profiles.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  }

  function removeSocialProfile(index: number) {
    setForm({ ...form, social_profiles: form.social_profiles.filter((_, itemIndex) => itemIndex !== index) });
  }

  function toggleDriverLicenseCategory(category: string) {
    const categories = form.driver_license_categories
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const nextCategories = categories.includes(category)
      ? categories.filter((item) => item !== category)
      : [...categories, category];
    setForm({ ...form, driver_license_categories: nextCategories.join(", ") });
  }

  function chooseAddressSuggestion(field: AddressFieldName, suggestion: AddressSuggestion) {
    setForm({ ...form, [field]: suggestion.unrestrictedValue || suggestion.value });
    setAddressSuggest({ field: null, suggestions: [], message: null, loading: false });
  }

  function chooseFmsSuggestion(suggestion: FmsSuggestion) {
    setForm({ ...form, document_issued_by: suggestion.name || suggestion.value });
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
              <div className="admin-details-body admin-grid">
                <div className="admin-grid-2">
                  <label className="admin-label">
                    Телефон
                    <input className="admin-input" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: formatRussianPhone(event.target.value) })} placeholder="+7 (912) 345-67-89" />
                    {form.phone && !isCompleteRussianPhone(form.phone) ? <span className="admin-muted">Номер выглядит неполным</span> : null}
                  </label>
                <label className="admin-label">Email<input className="admin-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                </div>

                <div className="admin-grid">
                  <div className="admin-row" style={{ justifyContent: "space-between" }}>
                    <strong>Дополнительные телефоны</strong>
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => setForm({ ...form, additional_phones: [...form.additional_phones, { phone: "", comment: "" }] })}>
                      + Добавить телефон
                    </button>
                  </div>
                  {form.additional_phones.map((item, index) => (
                    <div key={index} className="admin-grid-4">
                      <label className="admin-label">Телефон<input className="admin-input" type="tel" value={item.phone} onChange={(event) => updateAdditionalPhone(index, { phone: formatRussianPhone(event.target.value) })} placeholder="+7 (912) 345-67-89" /></label>
                      <label className="admin-label">Комментарий<input className="admin-input" value={item.comment} onChange={(event) => updateAdditionalPhone(index, { comment: event.target.value })} placeholder="WhatsApp, рабочий, жена" /></label>
                      <div className="admin-label"><span>&nbsp;</span><button type="button" className="admin-button admin-button-danger" onClick={() => removeAdditionalPhone(index)}>Удалить</button></div>
                    </div>
                  ))}
                </div>

                <div className="admin-grid">
                  <strong>Соцсети и профили</strong>
                  <div className="admin-row">
                    {socialProfileTypes.map((item) => (
                      <button key={item.type} type="button" className="admin-button admin-button-secondary" onClick={() => setForm({ ...form, social_profiles: [...form.social_profiles, { type: item.type, value: "", comment: "" }] })}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {form.social_profiles.map((profile, index) => (
                    <div key={index} className="admin-grid-4">
                      <label className="admin-label">
                        Тип
                        <select className="admin-select" value={profile.type} onChange={(event) => updateSocialProfile(index, { type: event.target.value as SocialProfileType })}>
                          {socialProfileTypes.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
                        </select>
                      </label>
                      <label className="admin-label">Ссылка / username / номер<input className="admin-input" value={profile.value} onChange={(event) => updateSocialProfile(index, { value: event.target.value })} /></label>
                      <label className="admin-label">Комментарий<input className="admin-input" value={profile.comment} onChange={(event) => updateSocialProfile(index, { comment: event.target.value })} /></label>
                      <div className="admin-label"><span>&nbsp;</span><button type="button" className="admin-button admin-button-danger" onClick={() => removeSocialProfile(index)}>Удалить</button></div>
                    </div>
                  ))}
                  <label className="admin-label">Старое поле соцсетей<input className="admin-input" value={form.social_links} onChange={(event) => setForm({ ...form, social_links: event.target.value })} /></label>
                </div>

                <div className="admin-grid-2">
                  <label className="admin-label">
                    Источник привлечения
                    <select className="admin-select" value={form.lead_source} onChange={(event) => setForm({ ...form, lead_source: event.target.value as LeadSource })}>
                      {leadSourceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  {form.lead_source === "other" ? (
                    <label className="admin-label">Уточнение<input className="admin-input" value={form.lead_source_comment} onChange={(event) => setForm({ ...form, lead_source_comment: event.target.value })} /></label>
                  ) : null}
                </div>
              </div>
            </details>

            <details className="admin-details">
              <summary>Адреса</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">
                  Адрес проживания
                  <div className="admin-autocomplete">
                    <textarea
                      className="admin-textarea"
                      value={form.residential_address}
                      onFocus={() => setAddressSuggest((state) => ({ ...state, field: "residential_address" }))}
                      onChange={(event) => {
                        setForm({ ...form, residential_address: event.target.value });
                        setAddressSuggest((state) => ({ ...state, field: "residential_address" }));
                      }}
                      rows={3}
                    />
                    {addressSuggest.field === "residential_address" && addressSuggest.suggestions.length ? (
                      <div className="admin-autocomplete-list">
                        {addressSuggest.suggestions.map((suggestion, index) => (
                          <button key={`${suggestion.value}-${index}`} type="button" className="admin-autocomplete-option" onClick={() => chooseAddressSuggestion("residential_address", suggestion)}>
                            {suggestion.value}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {addressSuggest.field === "residential_address" && addressSuggest.loading ? <span className="admin-muted">Ищем подсказки...</span> : null}
                  {addressSuggest.field === "residential_address" && addressSuggest.message ? <span className="admin-muted">{addressSuggest.message}</span> : null}
                </label>
                <label className="admin-label">
                  Адрес регистрации
                  <div className="admin-autocomplete">
                    <textarea
                      className="admin-textarea"
                      value={form.registration_address}
                      onFocus={() => setAddressSuggest((state) => ({ ...state, field: "registration_address" }))}
                      onChange={(event) => {
                        setForm({ ...form, registration_address: event.target.value });
                        setAddressSuggest((state) => ({ ...state, field: "registration_address" }));
                      }}
                      rows={3}
                    />
                    {addressSuggest.field === "registration_address" && addressSuggest.suggestions.length ? (
                      <div className="admin-autocomplete-list">
                        {addressSuggest.suggestions.map((suggestion, index) => (
                          <button key={`${suggestion.value}-${index}`} type="button" className="admin-autocomplete-option" onClick={() => chooseAddressSuggestion("registration_address", suggestion)}>
                            {suggestion.value}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {addressSuggest.field === "registration_address" && addressSuggest.loading ? <span className="admin-muted">Ищем подсказки...</span> : null}
                  {addressSuggest.field === "registration_address" && addressSuggest.message ? <span className="admin-muted">{addressSuggest.message}</span> : null}
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Документ</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">Тип документа<input className="admin-input" value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })} /></label>
                <label className="admin-label">Серия и номер<input className="admin-input" inputMode="numeric" value={form.document_series_number} onChange={(event) => setForm({ ...form, document_series_number: formatTenDigitDocument(event.target.value) })} placeholder="5432 345345" /></label>
                <label className="admin-label">Кем выдан<input className="admin-input" value={form.document_issued_by} onChange={(event) => setForm({ ...form, document_issued_by: event.target.value })} /></label>
                <label className="admin-label">
                  Дата выдачи
                  <input className="admin-input" type="date" value={form.document_issued_date} onChange={(event) => setForm({ ...form, document_issued_date: event.target.value })} />
                  {passportHint ? <span className={passportHint.tone === "success" ? "admin-message success" : "admin-message error"} style={{ marginTop: 8 }}>{passportHint.text}</span> : null}
                </label>
                <label className="admin-label">
                  Код подразделения
                  <input className="admin-input" inputMode="numeric" placeholder="123-456" value={form.passport_department_code} onChange={(event) => setForm({ ...form, passport_department_code: formatDepartmentCode(event.target.value) })} />
                  {fmsLoading ? <span className="admin-muted">Ищем подразделение...</span> : null}
                  {fmsMessage ? <span className="admin-muted">{fmsMessage}</span> : null}
                  {fmsSuggestions.length ? (
                    <div className="admin-grid" style={{ marginTop: 8 }}>
                      {fmsSuggestions.map((suggestion, index) => (
                        <div key={`${suggestion.code}-${index}`} className="admin-message success">
                          Найдено: {suggestion.name || suggestion.value}
                          {suggestion.code ? ` (${suggestion.code})` : ""}
                          <button type="button" className="admin-button admin-button-secondary" style={{ marginLeft: 8 }} onClick={() => chooseFmsSuggestion(suggestion)}>
                            Подставить
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label className="admin-label">Дата окончания<input className="admin-input" type="date" value={form.document_expiry_date} onChange={(event) => setForm({ ...form, document_expiry_date: event.target.value })} /></label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Водительское удостоверение</summary>
              <div className="admin-details-body admin-grid-2">
                <label className="admin-label">Номер ВУ<input className="admin-input" inputMode="numeric" value={form.driver_license_number} onChange={(event) => setForm({ ...form, driver_license_number: formatTenDigitDocument(event.target.value) })} placeholder="6543 674566" /></label>
                <label className="admin-label">Дата выдачи ВУ<input className="admin-input" type="date" value={form.driver_license_issued_date} onChange={(event) => setForm({ ...form, driver_license_issued_date: event.target.value })} /></label>
                <label className="admin-label">Дата окончания ВУ<input className="admin-input" type="date" value={form.driver_license_expiry_date} onChange={(event) => setForm({ ...form, driver_license_expiry_date: event.target.value })} /></label>
                <div className="admin-label">
                  Категории
                  <div className="admin-row">
                    {driverLicenseCategoryOptions.map((category) => {
                      const active = form.driver_license_categories.split(",").map((item) => item.trim()).includes(category);
                      return (
                        <button key={category} type="button" className={`admin-button ${active ? "admin-button-primary" : "admin-button-secondary"}`} onClick={() => toggleDriverLicenseCategory(category)}>
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="admin-label">Страна выдачи<input className="admin-input" value={form.driver_license_country} onChange={(event) => setForm({ ...form, driver_license_country: event.target.value })} /></label>
                <label className="admin-label">
                  КБМ
                  <input className="admin-input" inputMode="decimal" value={form.kbm} onChange={(event) => setForm({ ...form, kbm: event.target.value.replace(/[^\d.,]/g, "") })} placeholder="0.4–3" />
                  {!kbmValid ? <span className="admin-message error" style={{ marginTop: 8 }}>КБМ должен быть числом от 0.4 до 3</span> : null}
                </label>
              </div>
            </details>

            <details className="admin-details">
              <summary>Дополнительно</summary>
              <div className="admin-details-body admin-grid-2">
                <div className="admin-label">
                  ИНН
                  <div className="admin-row">
                    <input className="admin-input" value={form.inn} onChange={(event) => setForm({ ...form, inn: event.target.value.replace(/\D/g, "").slice(0, 12) })} />
                    <button type="button" className="admin-button admin-button-secondary" disabled={innLookup.status === "loading" || !innLookupReady} onClick={handleFindInn}>
                      {innLookup.status === "loading" ? "Ищем..." : "Найти ИНН"}
                    </button>
                  </div>
                  {!innLookupReady ? <span className="admin-muted">Для поиска ИНН заполните ФИО, дату рождения, паспорт и дату выдачи.</span> : null}
                  {innLookup.message ? (
                    <div className={innLookup.status === "found" ? "admin-message success" : "admin-message error"} style={{ marginTop: 8 }}>
                      {innLookup.message}
                      {innLookup.status === "found" && innLookup.inn ? (
                        <button type="button" className="admin-button admin-button-secondary" style={{ marginLeft: 8 }} onClick={() => setForm({ ...form, inn: innLookup.inn })}>
                          Подставить
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
                  <span className="admin-muted">Источник: {emptyToDash(leadSourceLabel(selectedClient.lead_source) || selectedClient.acquisition_source)}</span>
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
                  <InfoItem label="Источник привлечения" value={leadSourceLabel(selectedClient.lead_source) || selectedClient.acquisition_source} />
                  <InfoItem label="Уточнение источника" value={selectedClient.lead_source_comment} />
                  <InfoItem label="Старое поле соцсетей" value={selectedClient.social_links} />
                </div>
                {normalizeAdditionalPhones(selectedClient.additional_phones).length ? (
                  <div className="admin-grid" style={{ marginTop: 12 }}>
                    {normalizeAdditionalPhones(selectedClient.additional_phones).map((item, index) => (
                      <div key={index} className="admin-info-item">
                        <span>{item.comment || "Дополнительный телефон"}</span>
                        {item.phone}
                      </div>
                    ))}
                  </div>
                ) : null}
                {normalizeSocialProfiles(selectedClient.social_profiles).length ? (
                  <div className="admin-grid" style={{ marginTop: 12 }}>
                    {normalizeSocialProfiles(selectedClient.social_profiles).map((item, index) => (
                      <div key={index} className="admin-info-item">
                        <span>{socialProfileLabel(item.type)}{item.comment ? ` · ${item.comment}` : ""}</span>
                        {item.value}
                      </div>
                    ))}
                  </div>
                ) : null}
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
