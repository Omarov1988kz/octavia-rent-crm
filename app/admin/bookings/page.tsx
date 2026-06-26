import BookingManager from "@/components/admin/BookingManager";

export default function AdminBookingsPage({ searchParams }: { searchParams?: { clientId?: string } }) {
  return <BookingManager initialClientId={searchParams?.clientId} />;
}
