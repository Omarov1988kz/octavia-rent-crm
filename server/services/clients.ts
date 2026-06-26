import { query } from "@/server/db";

export type ClientStatus = "new" | "checked" | "active" | "problem" | "archived";
export type ClientGender = "male" | "female" | "other" | "unknown";

export interface ClientRow {
  id: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  birth_date: string | null;
  gender: ClientGender | null;
  phone: string | null;
  email: string | null;
  residential_address: string | null;
  registration_address: string | null;
  document_type: string | null;
  document_series_number: string | null;
  document_issued_by: string | null;
  document_issued_date: string | null;
  document_expiry_date: string | null;
  driver_license_number: string | null;
  driver_license_issued_date: string | null;
  driver_license_expiry_date: string | null;
  driver_license_categories: string | null;
  driver_license_country: string | null;
  kbm: string | null;
  inn: string | null;
  client_registration_date: string;
  client_status: ClientStatus;
  preferences: string | null;
  comments: string | null;
  social_links: string | null;
  acquisition_source: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientInput {
  last_name: string;
  first_name: string;
  middle_name?: string;
  birth_date?: string;
  gender?: ClientGender;
  phone?: string;
  email?: string;
  residential_address?: string;
  registration_address?: string;
  document_type?: string;
  document_series_number?: string;
  document_issued_by?: string;
  document_issued_date?: string;
  document_expiry_date?: string;
  driver_license_number?: string;
  driver_license_issued_date?: string;
  driver_license_expiry_date?: string;
  driver_license_categories?: string;
  driver_license_country?: string;
  kbm?: string;
  inn?: string;
  client_registration_date?: string;
  client_status?: ClientStatus;
  preferences?: string;
  comments?: string;
  social_links?: string;
  acquisition_source?: string;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
}

export interface ListClientsParams {
  search?: string;
  status?: ClientStatus;
  isBlacklisted?: boolean;
}

function sanitizeClientStatus(value: unknown): ClientStatus {
  if (value === "new" || value === "checked" || value === "active" || value === "problem" || value === "archived") {
    return value;
  }
  return "new";
}

function sanitizeClientGender(value: unknown): ClientGender {
  if (value === "male" || value === "female" || value === "other" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function validateClientInput(input: ClientInput) {
  if (!input.last_name || typeof input.last_name !== "string" || !input.last_name.trim()) {
    throw new Error("Фамилия обязательна");
  }

  if (!input.first_name || typeof input.first_name !== "string" || !input.first_name.trim()) {
    throw new Error("Имя обязательно");
  }
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalDate(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeRequiredDate(value?: string | null) {
  return normalizeOptionalDate(value) ?? todayDateString();
}

export async function listClients(params: ListClientsParams = {}) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    const q = `%${params.search.trim().toLowerCase()}%`;
    values.push(q, q, q, q, q, q);
    conditions.push(
      `(LOWER(last_name) LIKE $${values.length - 5} OR LOWER(first_name) LIKE $${values.length - 4} OR LOWER(phone) LIKE $${values.length - 3} OR LOWER(email) LIKE $${values.length - 2} OR LOWER(document_series_number) LIKE $${values.length - 1} OR LOWER(driver_license_number) LIKE $${values.length})`
    );
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`client_status = $${values.length}`);
  }

  if (typeof params.isBlacklisted === "boolean") {
    values.push(params.isBlacklisted);
    conditions.push(`is_blacklisted = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<ClientRow>(
    `SELECT * FROM clients ${whereClause} ORDER BY last_name, first_name, created_at DESC`,
    values
  );

  return result.rows;
}

export async function getClient(id: string) {
  const result = await query<ClientRow>(`SELECT * FROM clients WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] ?? null;
}

export async function createClient(input: ClientInput) {
  validateClientInput(input);

  const clientStatus = sanitizeClientStatus(input.client_status);
  const gender = input.gender ? sanitizeClientGender(input.gender) : "unknown";
  const isBlacklisted = Boolean(input.is_blacklisted);

  const result = await query<ClientRow>(
    `INSERT INTO clients (
      last_name,
      first_name,
      middle_name,
      birth_date,
      gender,
      phone,
      email,
      residential_address,
      registration_address,
      document_type,
      document_series_number,
      document_issued_by,
      document_issued_date,
      document_expiry_date,
      driver_license_number,
      driver_license_issued_date,
      driver_license_expiry_date,
      driver_license_categories,
      driver_license_country,
      kbm,
      inn,
      client_registration_date,
      client_status,
      preferences,
      comments,
      social_links,
      acquisition_source,
      is_blacklisted,
      blacklist_reason
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29
    ) RETURNING *`,
    [
      input.last_name.trim(),
      input.first_name.trim(),
      normalizeOptionalString(input.middle_name),
      normalizeOptionalDate(input.birth_date),
      gender,
      normalizeOptionalString(input.phone),
      normalizeOptionalString(input.email),
      normalizeOptionalString(input.residential_address),
      normalizeOptionalString(input.registration_address),
      normalizeOptionalString(input.document_type),
      normalizeOptionalString(input.document_series_number),
      normalizeOptionalString(input.document_issued_by),
      normalizeOptionalDate(input.document_issued_date),
      normalizeOptionalDate(input.document_expiry_date),
      normalizeOptionalString(input.driver_license_number),
      normalizeOptionalDate(input.driver_license_issued_date),
      normalizeOptionalDate(input.driver_license_expiry_date),
      normalizeOptionalString(input.driver_license_categories),
      normalizeOptionalString(input.driver_license_country),
      normalizeOptionalString(input.kbm),
      normalizeOptionalString(input.inn),
      normalizeRequiredDate(input.client_registration_date),
      clientStatus,
      normalizeOptionalString(input.preferences),
      normalizeOptionalString(input.comments),
      normalizeOptionalString(input.social_links),
      normalizeOptionalString(input.acquisition_source),
      isBlacklisted,
      normalizeOptionalString(input.blacklist_reason),
    ]
  );

  return result.rows[0];
}

export async function updateClient(id: string, input: ClientInput) {
  validateClientInput(input);

  const clientStatus = sanitizeClientStatus(input.client_status);
  const gender = input.gender ? sanitizeClientGender(input.gender) : "unknown";
  const isBlacklisted = Boolean(input.is_blacklisted);

  const result = await query<ClientRow>(
    `UPDATE clients SET
      last_name = $1,
      first_name = $2,
      middle_name = $3,
      birth_date = $4,
      gender = $5,
      phone = $6,
      email = $7,
      residential_address = $8,
      registration_address = $9,
      document_type = $10,
      document_series_number = $11,
      document_issued_by = $12,
      document_issued_date = $13,
      document_expiry_date = $14,
      driver_license_number = $15,
      driver_license_issued_date = $16,
      driver_license_expiry_date = $17,
      driver_license_categories = $18,
      driver_license_country = $19,
      kbm = $20,
      inn = $21,
      client_registration_date = $22,
      client_status = $23,
      preferences = $24,
      comments = $25,
      social_links = $26,
      acquisition_source = $27,
      is_blacklisted = $28,
      blacklist_reason = $29,
      updated_at = now()
    WHERE id = $30
    RETURNING *`,
    [
      input.last_name.trim(),
      input.first_name.trim(),
      normalizeOptionalString(input.middle_name),
      normalizeOptionalDate(input.birth_date),
      gender,
      normalizeOptionalString(input.phone),
      normalizeOptionalString(input.email),
      normalizeOptionalString(input.residential_address),
      normalizeOptionalString(input.registration_address),
      normalizeOptionalString(input.document_type),
      normalizeOptionalString(input.document_series_number),
      normalizeOptionalString(input.document_issued_by),
      normalizeOptionalDate(input.document_issued_date),
      normalizeOptionalDate(input.document_expiry_date),
      normalizeOptionalString(input.driver_license_number),
      normalizeOptionalDate(input.driver_license_issued_date),
      normalizeOptionalDate(input.driver_license_expiry_date),
      normalizeOptionalString(input.driver_license_categories),
      normalizeOptionalString(input.driver_license_country),
      normalizeOptionalString(input.kbm),
      normalizeOptionalString(input.inn),
      normalizeRequiredDate(input.client_registration_date),
      clientStatus,
      normalizeOptionalString(input.preferences),
      normalizeOptionalString(input.comments),
      normalizeOptionalString(input.social_links),
      normalizeOptionalString(input.acquisition_source),
      isBlacklisted,
      normalizeOptionalString(input.blacklist_reason),
      id,
    ]
  );

  return result.rows[0] ?? null;
}

export async function deleteClient(id: string) {
  const result = await query(`DELETE FROM clients WHERE id = $1 RETURNING id`, [id]);
  return (result.rowCount ?? 0) > 0;
}
