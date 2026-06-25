"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/clients", label: "Клиенты" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">Octavia Rent CRM</div>
          <nav className="admin-nav" aria-label="Разделы CRM">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`admin-nav-link${isActive ? " active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <div style={{ marginBottom: 12, color: "#94a3b8", fontSize: 13 }}>
            Локальная CRM. Клиентские данные не отправляются на сайт.
          </div>
          <button type="button" className="admin-button admin-button-secondary" disabled>
            Выйти
          </button>
        </div>
      </aside>

      <main className="admin-page">{children}</main>
    </div>
  );
}
