import type { Metadata } from "next";
import "./globals.css";

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
