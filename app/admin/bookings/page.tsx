import BookingManager from "@/components/admin/BookingManager";
import Link from "next/link";

export default function AdminBookingsPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Link
          href="/admin/clients"
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "white",
            textDecoration: "none",
          }}
        >
          Клиенты
        </Link>
      </div>
      <BookingManager />
    </main>
  );
}
