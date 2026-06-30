"use client";

import { useEffect, useState, type FormEvent } from "react";

type Template = {
  id: string;
  template_key: string;
  title: string;
  file_name: string;
  file_path: string;
  description: string | null;
  is_active: boolean;
};

const variables = [
  "contract_number",
  "contract_date",
  "owner_full_name",
  "owner_signature_name",
  "owner_inn",
  "owner_passport",
  "owner_passport_issued_by",
  "owner_passport_issued_date",
  "owner_passport_department_code",
  "owner_registration_address",
  "owner_phone",
  "owner_email",
  "client_full_name",
  "client_signature_name",
  "client_inn",
  "client_passport",
  "client_passport_issued_by",
  "client_passport_issued_date",
  "client_passport_department_code",
  "client_registration_address",
  "client_phone",
  "client_email",
  "client_email_line",
  "client_driver_license_number",
  "client_driver_license_issued_date",
  "client_driver_license_expiry_date",
  "client_driver_license_categories",
  "client_driver_license_country",
  "car_name",
  "car_brand",
  "car_model",
  "car_year",
  "car_vin",
  "car_plate_number",
  "car_color",
  "car_registration_certificate",
  "car_fuel_type",
  "car_class",
  "rental_start_date",
  "rental_start_time",
  "rental_end_date",
  "rental_end_time",
  "rental_period",
  "rental_term",
  "rental_days",
  "daily_price",
  "rent_amount",
  "rent_amount_words",
  "deposit_amount",
  "deposit_amount_words",
  "allowed_mileage",
  "total_amount",
];

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function DocumentTemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rentalTemplate = templates.find((template) => template.template_key === "rental_contract");

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setError(null);
    const response = await fetch("/api/admin/document-templates");
    const result = await parseJson(response);
    if (!response.ok) {
      setError(result?.message || "Ошибка загрузки шаблонов");
      return;
    }
    setTemplates(result?.templates || []);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Выберите DOCX-файл");
      return;
    }

    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/admin/document-templates", {
      method: "POST",
      body: formData,
    });
    const result = await parseJson(response);
    if (!response.ok) {
      setError(result?.message || "Ошибка загрузки шаблона");
      return;
    }

    setFile(null);
    setMessage("Шаблон обновлён");
    await loadTemplates();
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Шаблоны документов</h1>
          <p className="admin-description">Шаблоны хранятся локально. Персональные данные не отправляются на сайт.</p>
        </div>
      </header>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-card">
        <div className="admin-list-card-header">
          <div>
            <div className="admin-list-title">Договор аренды</div>
            <div className="admin-muted" style={{ marginTop: 6 }}>
              {rentalTemplate?.file_name || "rental-contract-template.docx"}
            </div>
            <div className="admin-muted" style={{ marginTop: 6 }}>
              {rentalTemplate?.description || "DOCX-шаблон договора аренды автомобиля без экипажа"}
            </div>
          </div>
          <a className="admin-button admin-button-secondary" href="/api/admin/document-templates/rental-contract/download">
            Скачать шаблон
          </a>
        </div>

        <form className="admin-row" style={{ marginTop: 18 }} onSubmit={handleUpload}>
          <input
            className="admin-input"
            style={{ maxWidth: 420 }}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button type="submit" className="admin-button admin-button-primary">
            Заменить шаблон
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 className="admin-form-section-title">Как редактировать шаблон</h2>
        <div className="admin-muted" style={{ display: "grid", gap: 8 }}>
          <div>Откройте DOCX в Word или LibreOffice и замените изменяемые данные на переменные вида {"{{client_full_name}}"}.</div>
          <div>Фигурные скобки должны остаться обычным текстом внутри документа. Не вставляйте переменные как изображения или поля Word.</div>
          <div>После сохранения загрузите файл через кнопку “Заменить шаблон”.</div>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-form-section-title">Доступные переменные</h2>
        <div className="admin-field-grid">
          {variables.map((variable) => (
            <div key={variable} className="admin-field">
              <span>{`{{${variable}}}`}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
