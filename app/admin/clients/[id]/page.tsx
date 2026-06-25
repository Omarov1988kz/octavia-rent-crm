import Link from "next/link";
import { getClient } from "@/server/services/clients";

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>Клиент не найден</h1>
          <p style={{ marginTop: 16, color: "#475569" }}>Пожалуйста, проверьте URL или вернитесь к списку клиентов.</p>
          <Link
            href="/admin/clients"
            style={{ display: "inline-block", marginTop: 16, padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#0f172a", textDecoration: "none", cursor: "pointer" }}
          >
            Назад к списку
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Link
              href="/admin/clients"
              style={{ color: "#2563eb", textDecoration: "none", fontSize: 14 }}
            >
              ← К списку клиентов
            </Link>
            <Link
              href="/admin/bookings"
              style={{ color: "#475569", textDecoration: "none", fontSize: 14 }}
            >
              Бронирования
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>{`${client.last_name} ${client.first_name} ${client.middle_name ?? ""}`.trim()}</h1>
            <p style={{ margin: "10px 0 0", color: "#475569" }}>Локальная карточка клиента CRM.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/admin/clients"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#0f172a", textDecoration: "none", cursor: "pointer" }}
            >
              К списку клиентов
            </Link>
            <Link
              href="/admin/bookings"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#0f172a", textDecoration: "none", cursor: "pointer" }}
            >
              Бронирования
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Основное</div>
            <div>ФИО: {`${client.last_name} ${client.first_name} ${client.middle_name ?? ""}`.trim()}</div>
            <div>Статус: {client.client_status}</div>
            <div>Дата регистрации: {formatDate(client.client_registration_date)}</div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Контакты</div>
            <div>Телефон: {client.phone || "—"}</div>
            <div>Email: {client.email || "—"}</div>
            <div>Соцсети: {client.social_links || "—"}</div>
            <div>Источник: {client.acquisition_source || "—"}</div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Документ</div>
            <div>Тип: {client.document_type || "—"}</div>
            <div>Серия и номер: {client.document_series_number || "—"}</div>
            <div>Кем выдан: {client.document_issued_by || "—"}</div>
            <div>Дата выдачи: {formatDate(client.document_issued_date)}</div>
            <div>Дата окончания: {formatDate(client.document_expiry_date)}</div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Водительское удостоверение</div>
            <div>Номер ВУ: {client.driver_license_number || "—"}</div>
            <div>Дата выдачи: {formatDate(client.driver_license_issued_date)}</div>
            <div>Дата окончания: {formatDate(client.driver_license_expiry_date)}</div>
            <div>Категории: {client.driver_license_categories || "—"}</div>
            <div>Страна: {client.driver_license_country || "—"}</div>
            <div>КБМ: {client.kbm || "—"}</div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Адреса</div>
            <div>Проживание: {client.residential_address || "—"}</div>
            <div>Регистрация: {client.registration_address || "—"}</div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Дополнительно</div>
            <div>Дата рождения: {formatDate(client.birth_date)}</div>
            <div>ИНН: {client.inn || "—"}</div>
            <div>Предпочтения: {client.preferences || "—"}</div>
            <div>Комментарий: {client.comments || "—"}</div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 18 }}>Чёрный список</div>
            <div>{client.is_blacklisted ? `Да (${client.blacklist_reason || "Причина не указана"})` : "Нет"}</div>
          </section>
        </div>
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
