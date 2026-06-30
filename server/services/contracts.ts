import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { query } from "@/server/db";
import { hasTemplatePlaceholders, readTemplateFile } from "@/server/services/documentTemplates";
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

export type RentalContractRow = {
  id: string;
  contract_number: number;
  contract_date: string;
  booking_id: string | null;
  client_id: string | null;
  car_id: string | null;
  client_name: string | null;
  car_name: string | null;
  car_plate_number: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  deleted_at: string | null;
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
  passport_department_code: string | null;
  driver_license_number: string | null;
  driver_license_issued_date: string | null;
  driver_license_expiry_date: string | null;
  driver_license_categories: string | null;
  driver_license_country: string | null;
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
  car_class: string | null;
  registration_certificate: string | null;
  price_1_2_days: string | null;
  price_3_6_days: string | null;
  price_7_14_days: string | null;
  price_15_30_days: string | null;
  price_30_plus_days: string | null;
  deposit_amount: string | null;
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

function signatureName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [lastName, firstName, middleName] = parts;
  if (!lastName) return "";
  const initials = [firstName, middleName].filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}.`).join("");
  return initials ? `${lastName} ${initials}` : lastName;
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  return Math.max(diff, 1);
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

const onesMale = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const onesFemale = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

function plural(value: number, forms: [string, string, string]) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function triadToWords(value: number, gender: "male" | "female") {
  const words: string[] = [];
  const h = Math.floor(value / 100);
  const t = Math.floor((value % 100) / 10);
  const o = value % 10;
  if (h) words.push(hundreds[h]);
  if (t === 1) {
    words.push(teens[o]);
  } else {
    if (t) words.push(tens[t]);
    if (o) words.push((gender === "female" ? onesFemale : onesMale)[o]);
  }
  return words;
}

function rublesToWords(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const rubles = Math.max(0, Math.round(value));
  if (rubles === 0) return "ноль рублей 00 копеек";

  const millions = Math.floor(rubles / 1_000_000);
  const thousands = Math.floor((rubles % 1_000_000) / 1000);
  const rest = rubles % 1000;
  const words: string[] = [];

  if (millions) {
    words.push(...triadToWords(millions, "male"), plural(millions, ["миллион", "миллиона", "миллионов"]));
  }
  if (thousands) {
    words.push(...triadToWords(thousands, "female"), plural(thousands, ["тысяча", "тысячи", "тысяч"]));
  }
  if (rest) {
    words.push(...triadToWords(rest, "male"));
  }
  words.push(plural(rubles, ["рубль", "рубля", "рублей"]), "00", "копеек");
  return words.join(" ");
}

function selectDailyPrice(car: ContractCarRow, days: number) {
  const raw =
    days <= 2
      ? car.price_1_2_days
      : days <= 6
        ? car.price_3_6_days
        : days <= 14
          ? car.price_7_14_days
          : days <= 30
            ? car.price_15_30_days
            : car.price_30_plus_days;
  const price = raw === null ? null : Number(raw);
  return Number.isFinite(price) ? price : null;
}

async function ensureContractDocument(booking: ContractBookingRow) {
  const existing = await query<RentalContractRow>(
    `SELECT rc.id,
            rc.contract_number,
            rc.contract_date,
            rc.booking_id,
            rc.client_id,
            rc.car_id,
            NULL::text AS client_name,
            NULL::text AS car_name,
            NULL::text AS car_plate_number,
            NULL::date AS start_date,
            NULL::date AS end_date,
            rc.created_at,
            rc.deleted_at
     FROM rental_contracts rc
     WHERE rc.booking_id = $1 AND rc.deleted_at IS NULL
     LIMIT 1`,
    [booking.id]
  );
  if (existing.rows[0]) return existing.rows[0];

  const today = formatPgDate(new Date());
  const result = await query<RentalContractRow>(
    `INSERT INTO rental_contracts (contract_number, contract_date, booking_id, client_id, car_id)
     SELECT GREATEST(COALESCE(MAX(contract_number) + 1, 30), 30), $1::date, $2, $3, $4
     FROM rental_contracts
     RETURNING id,
               contract_number,
               contract_date,
               booking_id,
               client_id,
               car_id,
               NULL::text AS client_name,
               NULL::text AS car_name,
               NULL::text AS car_plate_number,
               NULL::date AS start_date,
               NULL::date AS end_date,
               created_at,
               deleted_at`,
    [today, booking.id, booking.client_id, booking.car_id]
  );
  await query(
    `UPDATE bookings
     SET contract_number = COALESCE(contract_number, $1::text),
         contract_date = COALESCE(contract_date, $2::date),
         updated_at = now()
     WHERE id = $3
       AND (contract_number IS NULL OR contract_date IS NULL)`,
    [String(result.rows[0].contract_number), today, booking.id]
  );
  return result.rows[0];
}

export async function listRentalContracts() {
  const result = await query<RentalContractRow>(
    `SELECT rc.id,
            rc.contract_number,
            rc.contract_date,
            rc.booking_id,
            rc.client_id,
            rc.car_id,
            COALESCE(NULLIF(CONCAT_WS(' ', cl.last_name, cl.first_name, cl.middle_name), ''), b.client_name) AS client_name,
            c.name AS car_name,
            c.plate_number AS car_plate_number,
            b.start_date,
            b.end_date,
            rc.created_at,
            rc.deleted_at
     FROM rental_contracts rc
     LEFT JOIN bookings b ON b.id = rc.booking_id
     LEFT JOIN clients cl ON cl.id = rc.client_id
     LEFT JOIN cars c ON c.id = rc.car_id
     WHERE rc.deleted_at IS NULL
     ORDER BY rc.contract_number DESC`,
    []
  );
  return result.rows.map((row) => ({
    ...row,
    contract_date: formatPgDate(row.contract_date),
    start_date: formatPgDate(row.start_date),
    end_date: formatPgDate(row.end_date),
  }));
}

export async function deleteRentalContract(id: string) {
  const result = await query(
    `UPDATE rental_contracts
     SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
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

  const contractDocument = await ensureContractDocument(booking);

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
  if (!hasTemplatePlaceholders(buffer)) {
    throw new Error("В шаблоне договора не найдены переменные для подстановки. Загрузите DOCX-шаблон с плейсхолдерами.");
  }

  const doc = new Docxtemplater(new PizZip(buffer), {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "—",
  });

  const rentalDays = daysBetween(formatPgDate(booking.start_date), formatPgDate(booking.end_date));
  const dailyPrice = selectDailyPrice(car, rentalDays);
  const rentAmount = dailyPrice === null ? null : dailyPrice * rentalDays;
  const depositAmount = car.deposit_amount === null ? null : Number(car.deposit_amount);
  const clientEmail = client?.email?.trim() ?? "";
  const clientFullName = fullClientName(client, booking.client_name);
  const ownerFullName = dash(owner?.full_name);

  const data = {
    contract_number: String(contractDocument.contract_number),
    contract_date: formatDisplayDate(contractDocument.contract_date),
    owner_full_name: dash(owner?.full_name),
    owner_signature_name: signatureName(ownerFullName),
    owner_inn: dash(owner?.inn),
    owner_passport: dash(owner?.passport_series_number),
    owner_passport_issued_by: dash(owner?.passport_issued_by),
    owner_passport_issued_date: formatDisplayDate(owner?.passport_issued_date),
    owner_passport_department_code: dash(owner?.passport_department_code),
    owner_registration_address: dash(owner?.registration_address),
    owner_phone: dash(owner?.phone),
    owner_email: dash(owner?.email),
    client_full_name: clientFullName,
    client_signature_name: signatureName(clientFullName),
    client_inn: dash(client?.inn),
    client_passport: dash(client?.document_series_number),
    client_passport_issued_by: dash(client?.document_issued_by),
    client_passport_issued_date: formatDisplayDate(client?.document_issued_date),
    client_passport_department_code: dash(client?.passport_department_code),
    client_registration_address: dash(client?.registration_address),
    client_phone: dash(client?.phone ?? booking.client_phone),
    client_email: clientEmail,
    client_email_line: clientEmail ? `Email: ${clientEmail}` : "",
    client_driver_license_number: "",
    client_driver_license_issued_date: "",
    client_driver_license_expiry_date: "",
    client_driver_license_categories: "",
    client_driver_license_country: "",
    car_name: dash(car.name),
    car_brand: dash(car.brand),
    car_model: dash(car.model),
    car_year: dash(car.year),
    car_vin: dash(car.vin),
    car_plate_number: dash(car.plate_number),
    car_color: dash(car.color),
    car_registration_certificate: dash(car.registration_certificate),
    car_fuel_type: dash(car.fuel_type),
    car_class: dash(car.car_class),
    rental_start_date: formatDisplayDate(booking.start_date),
    rental_start_time: "",
    rental_end_date: formatDisplayDate(booking.end_date),
    rental_end_time: "",
    rental_period: `${formatDisplayDate(booking.start_date)} — ${formatDisplayDate(booking.end_date)}`,
    rental_term: `${formatDisplayDate(booking.start_date)} — ${formatDisplayDate(booking.end_date)}`,
    rental_days: String(rentalDays),
    daily_price: formatMoney(dailyPrice),
    rent_amount: formatMoney(rentAmount),
    rent_amount_words: rublesToWords(rentAmount),
    deposit_amount: formatMoney(Number.isFinite(depositAmount) ? depositAmount : null),
    deposit_amount_words: rublesToWords(Number.isFinite(depositAmount) ? depositAmount : null),
    allowed_mileage: "—",
    total_amount: formatMoney(rentAmount),
  };

  doc.render(data);
  const output = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  return {
    fileName: `dogovor-arendy-${contractDocument.contract_number}.docx`,
    buffer: output,
  };
}
