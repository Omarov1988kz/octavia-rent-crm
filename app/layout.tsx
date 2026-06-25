import type { Metadata } from "next";
import "./globals.css";
import "@/components/admin/admin.css";

export const metadata: Metadata = {
  title: "Octavia Rent CRM",
  description: "Управление бронированиями для Octavia Rent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
