import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { query } from "@/server/db";
import { readTemplateFile } from "@/server/services/documentTemplates";
import { getOwnerSettings, isOwnerSettingsComplete } from "@/server/services/ownerSettings";

type ContractBookingRow = {
  id: string;
  car_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  contract_number: string | null;
  contract_date: string | null;
};

type ContractClientRow = {
  last_name: string;
  first_name: string;
  middle_name: string | null;
  phone: string | null;
  email: string | null;
  registration_address: string | null;
  document_series_number: string | null;
  document_issued_by: string | null;
  document_issued_date: string | null;
  driver_license_number: string | null;
  driver_license_issued_date: string | null;
  driver_license_expiry_date: string | null;
  driver_license_categories: string | null;
  inn: string | null;
};

type ContractCarRow = {
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  plate_number: string | null;
  color: string | null;
  fuel_type: string | null;
};

function formatPgDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string | Date | null | undefined) {
  const normalized = formatPgDate(value);
  if (!normalized) return "—";
  const [year, month, day] = normalized.split("-");
  return year && month && day ? `${day}.${month}.${year}` : normalized;
}

function dash(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function fullClientName(client: ContractClientRow | null, fallback: string) {
  if (!client) return fallback;
  return `${client.last_name} ${client.first_name}${client.middle_name ? ` ${client.middle_name}` : ""}`.trim();
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  return Math.max(diff, 1);
}

async function ensureContractNumber(booking: ContractBookingRow) {
  if (booking.contract_number && booking.contract_date) {
    return booking;
  }

  const today = formatPgDate(new Date());
  const contractNumber = booking.contract_number ?? `${today.replace(/-/g, "")}-${booking.id.slice(0, 8)}`;
  const result = await query<ContractBookingRow>(
    `UPDATE bookings
     SET contract_number = COALESCE(contract_number, $1),
         contract_date = COALESCE(contract_date, $2::date),
         updated_at = now()
     WHERE id = $3
     RETURNING id, car_id, client_id, client_name, client_phone, start_date, start_time, end_date, end_time, contract_number, contract_date`,
    [contractNumber, today, booking.id]
  );
  return result.rows[0];
}

export async function generateRentalContract(bookingId: string) {
  const bookingResult = await query<ContractBookingRow>(
    `SELECT id, car_id, client_id, client_name, client_phone, start_date, start_time, end_date, end_time, contract_number, contract_date
     FROM bookings
     WHERE id = $1
     LIMIT 1`,
    [bookingId]
  );
  let booking = bookingResult.rows[0] ?? null;
  if (!booking) {
    throw new Error("Бронь не найдена");
  }

  const owner = await getOwnerSettings();
  if (!isOwnerSettingsComplete(owner)) {
    throw new Error("Не заполнены реквизиты арендодателя");
  }

  booking = await ensureContractNumber(booking);

  const clientResult = booking.client_id
    ? await query<ContractClientRow>(`SELECT * FROM clients WHERE id = $1 LIMIT 1`, [booking.client_id])
    : { rows: [] as ContractClientRow[] };
  const client = clientResult.rows[0] ?? null;

  const carResult = await query<ContractCarRow>(`SELECT * FROM cars WHERE id = $1 LIMIT 1`, [booking.car_id]);
  const car = carResult.rows[0] ?? null;
  if (!car) {
    throw new Error("Автомобиль не найден");
  }

  const { buffer } = await readTemplateFile("rental_contract");
  const doc = new Docxtemplater(new PizZip(buffer), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "—",
  });

  const data = {
    contract_number: dash(booking.contract_number),
    contract_date: formatDisplayDate(booking.contract_date),
    owner_full_name: dash(owner?.full_name),
    owner_inn: dash(owner?.inn),
    owner_passport: dash(owner?.passport_series_number),
    owner_passport_issued_by: dash(owner?.passport_issued_by),
    owner_passport_issued_date: formatDisplayDate(owner?.passport_issued_date),
    owner_passport_department_code: dash(owner?.passport_department_code),
    owner_registration_address: dash(owner?.registration_address),
    owner_phone: dash(owner?.phone),
    owner_email: dash(owner?.email),
    client_full_name: fullClientName(client, booking.client_name),
    client_inn: dash(client?.inn),
    client_passport: dash(client?.document_series_number),
    client_passport_issued_by: dash(client?.document_issued_by),
    client_passport_issued_date: formatDisplayDate(client?.document_issued_date),
    client_registration_address: dash(client?.registration_address),
    client_phone: dash(client?.phone ?? booking.client_phone),
    client_email: dash(client?.email),
    client_driver_license_number: dash(client?.driver_license_number),
    client_driver_license_issued_date: formatDisplayDate(client?.driver_license_issued_date),
    client_driver_license_expiry_date: formatDisplayDate(client?.driver_license_expiry_date),
    client_driver_license_categories: dash(client?.driver_license_categories),
    car_name: dash(car.name),
    car_brand: dash(car.brand),
    car_model: dash(car.model),
    car_year: dash(car.year),
    car_vin: dash(car.vin),
    car_plate_number: dash(car.plate_number),
    car_color: dash(car.color),
    car_registration_certificate: "—",
    car_fuel_type: dash(car.fuel_type),
    rental_start_date: formatDisplayDate(booking.start_date),
    rental_start_time: dash(booking.start_time),
    rental_end_date: formatDisplayDate(booking.end_date),
    rental_end_time: dash(booking.end_time),
    rental_days: String(daysBetween(formatPgDate(booking.start_date), formatPgDate(booking.end_date))),
    daily_price: "—",
    rent_amount: "—",
    deposit_amount: "—",
    total_amount: "—",
  };

  doc.render(data);
  const output = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  return {
    fileName: `dogovor-arendy-${booking.contract_number}.docx`,
    buffer: output,
  };
}
