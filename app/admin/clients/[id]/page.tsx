import Link from "next/link";
import { notFound } from "next/navigation";

async function getClient(id: string) {
  const response = await fetch(`/api/admin/clients/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data.client;
}

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) {
    notFound();
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>{`${client.last_name} ${client.first_name} ${client.middle_name ?? ""}`.trim()}</h1>
            <div style={{ marginTop: 8, color: "#475569" }}>{`Статус: ${client.client_status}`}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/admin/clients"
              style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#10b981", color: "white", textDecoration: "none", cursor: "pointer" }}
            >
              Редактировать
            </Link>
            <Link
              href="/admin/clients"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#0f172a", textDecoration: "none", cursor: "pointer" }}
            >
              Назад к списку
            </Link>
          </div>
        </div>

        <section style={{ marginTop: 24, display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Контакты</div>
            <div>Телефон: {client.phone || "—"}</div>
            <div>Email: {client.email || "—"}</div>
            <div>Соцсети: {client.social_links || "—"}</div>
            <div>Источник: {client.acquisition_source || "—"}</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Документ</div>
            <div>Тип: {client.document_type || "—"}</div>
            <div>Серия и номер: {client.document_series_number || "—"}</div>
            <div>Кем выдан: {client.document_issued_by || "—"}</div>
            <div>Дата выдачи: {formatDate(client.document_issued_date)}</div>
            <div>Дата окончания: {formatDate(client.document_expiry_date)}</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Водительское удостоверение</div>
            <div>Номер ВУ: {client.driver_license_number || "—"}</div>
            <div>Дата выдачи: {formatDate(client.driver_license_issued_date)}</div>
            <div>Дата окончания: {formatDate(client.driver_license_expiry_date)}</div>
            <div>Категории: {client.driver_license_categories || "—"}</div>
            <div>Страна: {client.driver_license_country || "—"}</div>
            <div>КБМ: {client.kbm || "—"}</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Адреса</div>
            <div>Проживание: {client.residential_address || "—"}</div>
            <div>Регистрация: {client.registration_address || "—"}</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Дополнительно</div>
            <div>Дата регистрации: {formatDate(client.client_registration_date)}</div>
            <div>Дата рождения: {formatDate(client.birth_date)}</div>
            <div>ИНН: {client.inn || "—"}</div>
            <div>Предпочтения: {client.preferences || "—"}</div>
            <div>Комментарий: {client.comments || "—"}</div>
            <div>Чёрный список: {client.is_blacklisted ? `Да (${client.blacklist_reason || "Причина не указана"})` : "Нет"}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

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
