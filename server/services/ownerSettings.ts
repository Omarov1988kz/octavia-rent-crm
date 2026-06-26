import { query } from "@/server/db";

export type OwnerSettingsRow = {
  id: string;
  full_name: string | null;
  inn: string | null;
  passport_series_number: string | null;
  passport_issued_by: string | null;
  passport_issued_date: string | null;
  passport_department_code: string | null;
  registration_address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type OwnerSettingsInput = {
  full_name?: string | null;
  inn?: string | null;
  passport_series_number?: string | null;
  passport_issued_by?: string | null;
  passport_issued_date?: string | null;
  passport_department_code?: string | null;
  registration_address?: string | null;
  phone?: string | null;
  email?: string | null;
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalDate(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export async function getOwnerSettings() {
  const result = await query<OwnerSettingsRow>(
    `SELECT * FROM owner_settings ORDER BY created_at ASC LIMIT 1`,
    []
  );
  return result.rows[0] ?? null;
}

export async function upsertOwnerSettings(input: OwnerSettingsInput) {
  const current = await getOwnerSettings();
  const values = [
    normalizeOptionalString(input.full_name),
    normalizeOptionalString(input.inn),
    normalizeOptionalString(input.passport_series_number),
    normalizeOptionalString(input.passport_issued_by),
    normalizeOptionalDate(input.passport_issued_date),
    normalizeOptionalString(input.passport_department_code),
    normalizeOptionalString(input.registration_address),
    normalizeOptionalString(input.phone),
    normalizeOptionalString(input.email),
  ];

  if (!current) {
    const result = await query<OwnerSettingsRow>(
      `INSERT INTO owner_settings (
        full_name,
        inn,
        passport_series_number,
        passport_issued_by,
        passport_issued_date,
        passport_department_code,
        registration_address,
        phone,
        email,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
      RETURNING *`,
      values
    );
    return result.rows[0];
  }

  const result = await query<OwnerSettingsRow>(
    `UPDATE owner_settings SET
       full_name = $1,
       inn = $2,
       passport_series_number = $3,
       passport_issued_by = $4,
       passport_issued_date = $5,
       passport_department_code = $6,
       registration_address = $7,
       phone = $8,
       email = $9,
       updated_at = now()
     WHERE id = $10
     RETURNING *`,
    [...values, current.id]
  );

  return result.rows[0];
}

export function isOwnerSettingsComplete(settings: OwnerSettingsRow | null) {
  return Boolean(settings?.full_name && settings.passport_series_number && settings.registration_address);
}
