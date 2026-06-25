import { query } from "@/server/db";

export type BookingStatus = "request" | "booked" | "cancelled";

const activeStatuses: BookingStatus[] = ["request", "booked"];

function formatPgDate(value: string | Date) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface BookingRow {
  id: string;
  car_id: string;
  car_name: string | null;
  client_name: string;
  client_phone: string | null;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingInput {
  carId: string;
  clientName: string;
  clientPhone?: string;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
  comment?: string;
}

export async function listBookings() {
  const result = await query<BookingRow>(
    `SELECT b.id,
            b.car_id,
            c.name AS car_name,
            b.client_name,
            b.client_phone,
            b.start_date,
            b.end_date,
            b.status,
            b.comment,
            b.created_at,
            b.updated_at
     FROM bookings b
     LEFT JOIN cars c ON c.id = b.car_id
     ORDER BY b.start_date DESC, b.created_at DESC`,
    []
  );

  return result.rows.map((row) => ({
    ...row,
    start_date: formatPgDate(row.start_date),
    end_date: formatPgDate(row.end_date),
  }));
}

export async function getActiveCars() {
  const result = await query<{ id: string; name: string }>(
    `SELECT id, name FROM cars WHERE is_active = true ORDER BY name`,
    []
  );
  return result.rows;
}

export async function createBooking(input: BookingInput) {
  const { carId, clientName, clientPhone = null, startDate, endDate, comment = null } = input;
  const startParts = startDate.split("-").map(Number);
  const endParts = endDate.split("-").map(Number);

  if (startParts.length !== 3 || endParts.length !== 3 || startParts.some(Number.isNaN) || endParts.some(Number.isNaN)) {
    throw new Error("Неверный формат дат");
  }

  const [startYear, startMonth, startDay] = startParts;
  const [endYear, endMonth, endDay] = endParts;

  const startValue = startYear * 10000 + startMonth * 100 + startDay;
  const endValue = endYear * 10000 + endMonth * 100 + endDay;

  if (!(startValue < endValue)) {
    throw new Error("Дата возврата должна быть позже даты начала");
  }

  const overlap = await query(
    `SELECT 1
     FROM bookings
     WHERE car_id = $1
       AND status IN ('request', 'booked')
       AND start_date < $3
       AND end_date > $2
     LIMIT 1`,
    [carId, startDate, endDate]
  );

  if ((overlap.rowCount ?? 0) > 0) {
    throw new Error("На эти даты уже есть бронь");
  }

  const status = input.status ?? "request";
  if (!activeStatuses.includes(status) && status !== "cancelled") {
    throw new Error("Неверный статус бронирования");
  }

  const result = await query<BookingRow>(
    `INSERT INTO bookings (car_id, client_name, client_phone, start_date, end_date, status, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, car_id, client_name, client_phone, start_date, end_date, status, comment, created_at, updated_at`,
    [carId, clientName, clientPhone, startDate, endDate, status, comment]
  );

  return result.rows[0];
}

export async function cancelBooking(id: string) {
  const result = await query(
    `UPDATE bookings
     SET status = 'cancelled', updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function confirmBooking(id: string) {
  const result = await query(
    `UPDATE bookings
     SET status = 'booked', updated_at = now()
     WHERE id = $1 AND status = 'request'
     RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getBookedDateRanges(carId?: string) {
  const params: unknown[] = [];
  let filter = "";

  if (carId) {
    filter = "AND car_id = $1";
    params.push(carId);
  }

  const result = await query<{ start_date: string | Date; end_date: string | Date; status: BookingStatus }>(
    `SELECT start_date, end_date, status
     FROM bookings
     WHERE status IN ('request', 'booked')
     ${filter}
     ORDER BY start_date`,
    params
  );

  return result.rows.map((row) => ({
    startDate: formatPgDate(row.start_date),
    endDate: formatPgDate(row.end_date),
    status: row.status,
  }));
}
