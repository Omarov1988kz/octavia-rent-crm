import Link from "next/link";

const sections = [
  {
    href: "/admin/settings/owners",
    title: "Арендодатели",
    description: "Реквизиты и паспортные данные арендодателя для договора.",
  },
  {
    href: "/admin/settings/deposits",
    title: "Депозиты",
    description: "Суммы залога по классам автомобилей.",
  },
];

export default function SettingsManager() {
  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Настройки</h1>
          <p className="admin-description">Разделы настроек локальной CRM.</p>
        </div>
      </header>

      <section className="admin-grid-2">
        {sections.map((section) => (
          <Link key={section.href} className="admin-list-card" href={section.href} style={{ textDecoration: "none" }}>
            <div className="admin-list-title">{section.title}</div>
            <div className="admin-muted">{section.description}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
