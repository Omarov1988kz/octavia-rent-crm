"use client";

import { useEffect, useState, type FormEvent } from "react";

type OwnerSettingsForm = {
  full_name: string;
  inn: string;
  passport_series_number: string;
  passport_issued_by: string;
  passport_issued_date: string;
  passport_department_code: string;
  registration_address: string;
  phone: string;
  email: string;
};

const initialForm: OwnerSettingsForm = {
  full_name: "",
  inn: "",
  passport_series_number: "",
  passport_issued_by: "",
  passport_issued_date: "",
  passport_department_code: "",
  registration_address: "",
  phone: "",
  email: "",
};

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function SettingsManager() {
  const [form, setForm] = useState<OwnerSettingsForm>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const response = await fetch("/api/admin/settings/owner");
    const result = await parseJson(response);
    if (!response.ok) {
      setError(result?.message || "Ошибка загрузки настроек");
      return;
    }
    const settings = result?.settings;
    if (settings) {
      setForm({
        full_name: settings.full_name ?? "",
        inn: settings.inn ?? "",
        passport_series_number: settings.passport_series_number ?? "",
        passport_issued_by: settings.passport_issued_by ?? "",
        passport_issued_date: settings.passport_issued_date ?? "",
        passport_department_code: settings.passport_department_code ?? "",
        registration_address: settings.registration_address ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/settings/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await parseJson(response);
    if (!response.ok) {
      setError(result?.message || "Ошибка сохранения настроек");
      return;
    }
    setMessage("Реквизиты сохранены");
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Настройки</h1>
          <p className="admin-description">Реквизиты арендодателя используются только для локального договора.</p>
        </div>
      </header>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-card">
        <form className="admin-grid" onSubmit={handleSubmit}>
          <div className="admin-grid-2">
            <label className="admin-label">ФИО<input className="admin-input" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label className="admin-label">ИНН<input className="admin-input" value={form.inn} onChange={(event) => setForm({ ...form, inn: event.target.value })} /></label>
            <label className="admin-label">Паспорт<input className="admin-input" value={form.passport_series_number} onChange={(event) => setForm({ ...form, passport_series_number: event.target.value })} /></label>
            <label className="admin-label">Кем выдан<input className="admin-input" value={form.passport_issued_by} onChange={(event) => setForm({ ...form, passport_issued_by: event.target.value })} /></label>
            <label className="admin-label">Дата выдачи<input className="admin-input" type="date" value={form.passport_issued_date} onChange={(event) => setForm({ ...form, passport_issued_date: event.target.value })} /></label>
            <label className="admin-label">Код подразделения<input className="admin-input" value={form.passport_department_code} onChange={(event) => setForm({ ...form, passport_department_code: event.target.value })} /></label>
            <label className="admin-label">Телефон<input className="admin-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="admin-label">Email<input className="admin-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          </div>
          <label className="admin-label">Адрес регистрации<textarea className="admin-textarea" rows={3} value={form.registration_address} onChange={(event) => setForm({ ...form, registration_address: event.target.value })} /></label>
          <div className="admin-actions">
            <button type="submit" className="admin-button admin-button-primary">Сохранить</button>
          </div>
        </form>
      </section>
    </div>
  );
}
