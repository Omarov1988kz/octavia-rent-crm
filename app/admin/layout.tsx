import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import "@/components/admin/admin.css";

export const metadata: Metadata = {
  title: "Octavia Rent CRM",
  description: "Административная панель Octavia Rent CRM",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
