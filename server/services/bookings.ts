import { query } from "@/server/db";
import { listActiveCars } from "@/server/services/cars";

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
  car_plate_number: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  status: BookingStatus;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingInput {
  carId: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  status?: BookingStatus;
  comment?: string;
}

export interface PublicCalendarBooking {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: Exclude<BookingStatus, "cancelled">;
}

export interface SyncBookingInput {
  externalId: string;
  carKey?: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  status: BookingStatus;
}

function validateDateRange(startDate: string, endDate: string) {
  const startParts = startDate.split("-").map(Number);
  const endParts = endDate.split("-").map(Number);

  if (startParts.length !== 3 || endParts.length !== 3 || startParts.some(Number.isNaN) || endParts.some(Number.isNaN)) {
    throw new Error("Неверный формат дат");
  }

  const [startYear, startMonth, startDay] = startParts;
  const [endYear, endMonth, endDay] = endParts;

  const startValue = startYear * 10000 + startMonth * 100 + startDay;
  const endValue = endYear * 10000 + endMonth * 100 + endDay;

  if (!(startValue <= endValue)) {
    throw new Error("Дата возврата должна быть позже даты начала");
  }
}

function validateTime(value: string) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    throw new Error("Неверный формат времени");
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Неверный формат времени");
  }
}

function validateDateTimeRange(startDate: string, startTime: string, endDate: string, endTime: string) {
  validateDateRange(startDate, endDate);
  validateTime(startTime);
  validateTime(endTime);

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const startValue = startYear * 10000 + startMonth * 100 + startDay;
  const endValue = endYear * 10000 + endMonth * 100 + endDay;
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  if (startValue > endValue || (startValue === endValue && startTotal >= endTotal)) {
    throw new Error("Дата и время окончания должны быть позже начала");
  }
}

function formatDisplayDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return `${date} ${time}`;
  }
  return `${day}.${month}.${year} ${time}`;
}

function formatPublicTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "12:00";
}

function sanitizeStatus(value: unknown): BookingStatus {
  if (value === "request" || value === "booked" || value === "cancelled") {
    return value;
  }
  throw new Error("Неверный статус бронирования");
}

export async function listBookings() {
  const result = await query<BookingRow>(
    `SELECT b.id,
            b.car_id,
            c.name AS car_name,
            c.plate_number AS car_plate_number,
            b.client_id,
            b.client_name,
            b.client_phone,
            b.start_date,
            b.start_time,
            b.end_date,
            b.end_time,
            b.status,
            b.comment,
            b.created_at,
            b.updated_at
     FROM bookings b
     LEFT JOIN cars c ON c.id = b.car_id
     ORDER BY b.start_date DESC, b.start_time DESC, b.created_at DESC`,
    []
  );

  return result.rows.map((row) => ({
    ...row,
    start_date: formatPgDate(row.start_date),
    end_date: formatPgDate(row.end_date),
  }));
}

export async function listBookingsByClient(clientId: string) {
  const result = await query<BookingRow>(
    `SELECT b.id,
            b.car_id,
            c.name AS car_name,
            c.plate_number AS car_plate_number,
            b.client_id,
            b.client_name,
            b.client_phone,
            b.start_date,
            b.start_time,
            b.end_date,
            b.end_time,
            b.status,
            b.comment,
            b.created_at,
            b.updated_at
     FROM bookings b
     LEFT JOIN cars c ON c.id = b.car_id
     WHERE b.client_id = $1
     ORDER BY b.start_date DESC, b.start_time DESC, b.created_at DESC`,
    [clientId]
  );

  return result.rows.map((row) => ({
    ...row,
    start_date: formatPgDate(row.start_date),
    end_date: formatPgDate(row.end_date),
  }));
}

export const getActiveCars = listActiveCars;

async function resolveBookingClient(clientId: string | null, clientName: string, clientPhone: string | null) {
  if (!clientId) {
    return {
      resolvedClientId: null,
      resolvedClientName: clientName,
      resolvedClientPhone: clientPhone,
    };
  }

  const clientResult = await query<{
    last_name: string;
    first_name: string;
    middle_name: string | null;
    phone: string | null;
  }>(
    `SELECT last_name, first_name, middle_name, phone FROM clients WHERE id = $1 LIMIT 1`,
    [clientId]
  );

  if (clientResult.rows.length === 0) {
    throw new Error("Клиент не найден");
  }

  const client = clientResult.rows[0];
  return {
    resolvedClientId: clientId,
    resolvedClientName: `${client.last_name} ${client.first_name}${client.middle_name ? ` ${client.middle_name}` : ""}`.trim(),
    resolvedClientPhone: client.phone ?? null,
  };
}

async function assertNoActiveOverlap(carId: string, startDate: string, startTime: string, endDate: string, endTime: string, excludeBookingId?: string) {
  const values = excludeBookingId
    ? [carId, startDate, startTime, endDate, endTime, excludeBookingId]
    : [carId, startDate, startTime, endDate, endTime];

  const excludeClause = excludeBookingId ? "AND id <> $6" : "";
  const overlap = await query<{ start_date: string | Date; start_time: string; end_date: string | Date; end_time: string }>(
    `SELECT start_date, start_time, end_date, end_time
     FROM bookings
     WHERE car_id = $1
       ${excludeClause}
       AND status IN ('request', 'booked')
       AND (start_date + start_time) < ($4::date + $5::time)
       AND (end_date + end_time) > ($2::date + $3::time)
     LIMIT 1`,
    values
  );

  if ((overlap.rowCount ?? 0) > 0) {
    const booking = overlap.rows[0];
    throw new Error(`Машина занята с ${formatDisplayDateTime(formatPgDate(booking.start_date), booking.start_time)} до ${formatDisplayDateTime(formatPgDate(booking.end_date), booking.end_time)}`);
  }
}

export async function createBooking(input: BookingInput) {
  const {
    carId,
    clientId = null,
    clientName,
    clientPhone = null,
    startDate,
    startTime = "12:00",
    endDate,
    endTime = "12:00",
    comment = null,
  } = input;

  const { resolvedClientId, resolvedClientName, resolvedClientPhone } = await resolveBookingClient(clientId, clientName, clientPhone);

  const status = input.status ?? "request";
  if (!activeStatuses.includes(status) && status !== "cancelled") {
    throw new Error("Неверный статус бронирования");
  }
  validateDateTimeRange(startDate, startTime, endDate, endTime);
  if (activeStatuses.includes(status)) {
    await assertNoActiveOverlap(carId, startDate, startTime, endDate, endTime);
  }

  const result = await query<BookingRow>(
    `INSERT INTO bookings (car_id, client_id, client_name, client_phone, start_date, start_time, end_date, end_time, status, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, car_id, client_id, client_name, client_phone, start_date, start_time, end_date, end_time, status, comment, created_at, updated_at`,
    [carId, resolvedClientId, resolvedClientName, resolvedClientPhone, startDate, startTime, endDate, endTime, status, comment]
  );

  return result.rows[0];
}

export async function updateBooking(id: string, input: BookingInput) {
  const current = await query<BookingRow>(`SELECT * FROM bookings WHERE id = $1 LIMIT 1`, [id]);
  if (current.rows.length === 0) {
    return null;
  }

  const {
    carId,
    clientId = null,
    clientName,
    clientPhone = null,
    startDate,
    startTime = "12:00",
    endDate,
    endTime = "12:00",
    comment = null,
  } = input;

  const status = input.status ? sanitizeStatus(input.status) : "request";
  const { resolvedClientId, resolvedClientName, resolvedClientPhone } = await resolveBookingClient(clientId, clientName, clientPhone);

  validateDateTimeRange(startDate, startTime, endDate, endTime);
  if (activeStatuses.includes(status)) {
    await assertNoActiveOverlap(carId, startDate, startTime, endDate, endTime, id);
  }

  const result = await query<BookingRow>(
    `UPDATE bookings SET
       car_id = $1,
       client_id = $2,
       client_name = $3,
       client_phone = $4,
       start_date = $5,
       start_time = $6,
       end_date = $7,
       end_time = $8,
       status = $9,
       comment = $10,
       updated_at = now()
     WHERE id = $11
     RETURNING id, car_id, client_id, client_name, client_phone, start_date, start_time, end_date, end_time, status, comment, created_at, updated_at`,
    [carId, resolvedClientId, resolvedClientName, resolvedClientPhone, startDate, startTime, endDate, endTime, status, comment, id]
  );

  return result.rows[0] ?? null;
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

export async function deleteBooking(id: string) {
  const result = await query(
    `DELETE FROM bookings
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

export async function getBookedDateRanges(carKey?: string) {
  const params: unknown[] = [];
  let filter = "";

  if (carKey) {
    filter = "AND car_key = $1";
    params.push(carKey);
  }

  const result = await query<{ start_date: string | Date; start_time: string; end_date: string | Date; end_time: string; status: BookingStatus }>(
    `SELECT start_date, start_time, end_date, end_time, status
     FROM public_calendar_entries
     WHERE status IN ('request', 'booked')
     ${filter}
     ORDER BY start_date, start_time`,
    params
  );

  return result.rows.map((row) => ({
    startDate: formatPgDate(row.start_date),
    endDate: formatPgDate(row.end_date),
    startTime: formatPublicTime(row.start_time),
    endTime: formatPublicTime(row.end_time),
    status: row.status as Exclude<BookingStatus, "cancelled">,
  }));
}

export async function syncPublicBookings(bookings: SyncBookingInput[]) {
  const validated = bookings.map((booking) => {
    if (typeof booking.externalId !== "string" || !booking.externalId.trim()) {
      throw new Error("externalId обязателен");
    }

    const carKey = typeof booking.carKey === "string" && booking.carKey.trim() ? booking.carKey : "octavia";
    const status = sanitizeStatus(booking.status);
    const startTime = typeof booking.startTime === "string" && booking.startTime.trim() ? booking.startTime : "12:00";
    const endTime = typeof booking.endTime === "string" && booking.endTime.trim() ? booking.endTime : "12:00";

    validateDateTimeRange(booking.startDate, startTime, booking.endDate, endTime);

    return {
      externalId: booking.externalId,
      carKey,
      startDate: booking.startDate,
      startTime,
      endDate: booking.endDate,
      endTime,
      status,
    };
  });

  for (const entry of validated) {
    await query(
      `INSERT INTO public_calendar_entries (external_id, car_key, start_date, start_time, end_date, end_time, status, source, synced_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), now())
       ON CONFLICT (external_id) DO UPDATE
       SET car_key = EXCLUDED.car_key,
           start_date = EXCLUDED.start_date,
           start_time = EXCLUDED.start_time,
           end_date = EXCLUDED.end_date,
           end_time = EXCLUDED.end_time,
           status = EXCLUDED.status,
           synced_at = now(),
           updated_at = now()`,
      [
        entry.externalId,
        entry.carKey,
        entry.startDate,
        entry.startTime,
        entry.endDate,
        entry.endTime,
        entry.status,
        "local_crm",
      ]
    );
  }

  return validated.length;
}
