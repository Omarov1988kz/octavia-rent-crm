import { query } from "@/server/db";

export type CarOwnershipType = "own" | "partner" | "leased";
export type CarStatus = "active" | "service" | "repair" | "inactive";

export interface CarRow {
  id: string;
  name: string;
  plate_number: string | null;
  is_active: boolean;
  brand: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  color: string | null;
  body_type: string | null;
  transmission: string | null;
  engine: string | null;
  fuel_type: string | null;
  mileage: number | null;
  car_class: string | null;
  registration_certificate: string | null;
  price_1_2_days: string | null;
  price_3_6_days: string | null;
  price_7_14_days: string | null;
  price_15_30_days: string | null;
  price_30_plus_days: string | null;
  deposit_amount: string | null;
  ownership_type: CarOwnershipType;
  status: CarStatus;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListCarsParams {
  search?: string;
  status?: CarStatus;
  ownershipType?: CarOwnershipType;
  activeOnly?: boolean;
}

export interface CarInput {
  name: string;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | string | null;
  vin?: string | null;
  color?: string | null;
  body_type?: string | null;
  transmission?: string | null;
  engine?: string | null;
  fuel_type?: string | null;
  mileage?: number | string | null;
  car_class?: string | null;
  registration_certificate?: string | null;
  price_1_2_days?: number | string | null;
  price_3_6_days?: number | string | null;
  price_7_14_days?: number | string | null;
  price_15_30_days?: number | string | null;
  price_30_plus_days?: number | string | null;
  deposit_amount?: number | string | null;
  ownership_type?: CarOwnershipType | null;
  status?: CarStatus | null;
  comment?: string | null;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function sanitizeOwnershipType(value: unknown): CarOwnershipType {
  if (value === "own" || value === "partner" || value === "leased") {
    return value;
  }
  return "own";
}

function sanitizeStatus(value: unknown): CarStatus {
  if (value === "active" || value === "service" || value === "repair" || value === "inactive") {
    return value;
  }
  return "active";
}

function normalizeCarInput(input: CarInput) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    throw new Error("Название автомобиля обязательно");
  }

  const status = sanitizeStatus(input.status);
  return {
    name,
    plate_number: normalizeOptionalString(input.plate_number),
    brand: normalizeOptionalString(input.brand),
    model: normalizeOptionalString(input.model),
    year: normalizeInteger(input.year),
    vin: normalizeOptionalString(input.vin),
    color: normalizeOptionalString(input.color),
    body_type: normalizeOptionalString(input.body_type),
    transmission: normalizeOptionalString(input.transmission),
    engine: normalizeOptionalString(input.engine),
    fuel_type: normalizeOptionalString(input.fuel_type),
    mileage: normalizeInteger(input.mileage),
    car_class: normalizeOptionalString(input.car_class),
    registration_certificate: normalizeOptionalString(input.registration_certificate),
    price_1_2_days: normalizeMoney(input.price_1_2_days),
    price_3_6_days: normalizeMoney(input.price_3_6_days),
    price_7_14_days: normalizeMoney(input.price_7_14_days),
    price_15_30_days: normalizeMoney(input.price_15_30_days),
    price_30_plus_days: normalizeMoney(input.price_30_plus_days),
    deposit_amount: normalizeMoney(input.deposit_amount),
    ownership_type: sanitizeOwnershipType(input.ownership_type),
    status,
    is_active: status === "active",
    comment: normalizeOptionalString(input.comment),
  };
}

function mapDbError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505") {
    return new Error("Автомобиль с таким госномером уже существует");
  }
  return error;
}

async function assertPlateNumberIsUnique(plateNumber: string | null, excludeId?: string) {
  if (!plateNumber) {
    return;
  }

  const values: unknown[] = [plateNumber.toLowerCase()];
  let excludeClause = "";
  if (excludeId) {
    values.push(excludeId);
    excludeClause = `AND id <> $2`;
  }

  const result = await query(
    `SELECT 1
     FROM cars
     WHERE LOWER(TRIM(plate_number)) = $1
       ${excludeClause}
     LIMIT 1`,
    values
  );

  if ((result.rowCount ?? 0) > 0) {
    throw new Error("Автомобиль с таким госномером уже существует");
  }
}

export async function listCars(params: ListCarsParams = {}) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.search?.trim()) {
    const search = `%${params.search.trim().toLowerCase()}%`;
    values.push(search, search, search, search, search);
    conditions.push(
      `(LOWER(name) LIKE $${values.length - 4} OR LOWER(COALESCE(plate_number, '')) LIKE $${values.length - 3} OR LOWER(COALESCE(vin, '')) LIKE $${values.length - 2} OR LOWER(COALESCE(brand, '')) LIKE $${values.length - 1} OR LOWER(COALESCE(model, '')) LIKE $${values.length})`
    );
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }

  if (params.ownershipType) {
    values.push(params.ownershipType);
    conditions.push(`ownership_type = $${values.length}`);
  }

  if (params.activeOnly) {
    conditions.push(`status = 'active'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await query<CarRow>(
    `SELECT id,
            name,
            plate_number,
            is_active,
            brand,
            model,
            year,
            vin,
            color,
            body_type,
            transmission,
            engine,
            fuel_type,
            mileage,
            car_class,
            registration_certificate,
            price_1_2_days,
            price_3_6_days,
            price_7_14_days,
            price_15_30_days,
            price_30_plus_days,
            deposit_amount,
            ownership_type,
            status,
            comment,
            created_at,
            updated_at
     FROM cars
     ${whereClause}
     ORDER BY status = 'inactive', name, plate_number NULLS LAST, created_at DESC`,
    values
  );

  return result.rows;
}

export async function listActiveCars() {
  const cars = await listCars({ activeOnly: true });
  const seen = new Set<string>();
  return cars.filter((car) => {
    const key = car.plate_number?.trim()
      ? `plate:${car.plate_number.trim().toLowerCase()}`
      : `name:${car.name.trim().toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function getCar(id: string) {
  const result = await query<CarRow>(
    `SELECT id,
            name,
            plate_number,
            is_active,
            brand,
            model,
            year,
            vin,
            color,
            body_type,
            transmission,
            engine,
            fuel_type,
            mileage,
            car_class,
            registration_certificate,
            price_1_2_days,
            price_3_6_days,
            price_7_14_days,
            price_15_30_days,
            price_30_plus_days,
            deposit_amount,
            ownership_type,
            status,
            comment,
            created_at,
            updated_at
     FROM cars
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createCar(input: CarInput) {
  const car = normalizeCarInput(input);
  await assertPlateNumberIsUnique(car.plate_number);

  try {
    const result = await query<CarRow>(
      `INSERT INTO cars (
        name,
        plate_number,
        is_active,
        brand,
        model,
        year,
        vin,
        color,
        body_type,
        transmission,
        engine,
        fuel_type,
        mileage,
        car_class,
        registration_certificate,
        price_1_2_days,
        price_3_6_days,
        price_7_14_days,
        price_15_30_days,
        price_30_plus_days,
        deposit_amount,
        ownership_type,
        status,
        comment,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, now(), now()
      )
      RETURNING *`,
      [
        car.name,
        car.plate_number,
        car.is_active,
        car.brand,
        car.model,
        car.year,
        car.vin,
        car.color,
        car.body_type,
        car.transmission,
        car.engine,
        car.fuel_type,
        car.mileage,
        car.car_class,
        car.registration_certificate,
        car.price_1_2_days,
        car.price_3_6_days,
        car.price_7_14_days,
        car.price_15_30_days,
        car.price_30_plus_days,
        car.deposit_amount,
        car.ownership_type,
        car.status,
        car.comment,
      ]
    );
    return result.rows[0];
  } catch (error) {
    throw mapDbError(error);
  }
}

export async function updateCar(id: string, input: CarInput) {
  const car = normalizeCarInput(input);
  await assertPlateNumberIsUnique(car.plate_number, id);

  try {
    const result = await query<CarRow>(
      `UPDATE cars SET
        name = $1,
        plate_number = $2,
        is_active = $3,
        brand = $4,
        model = $5,
        year = $6,
        vin = $7,
        color = $8,
        body_type = $9,
        transmission = $10,
        engine = $11,
        fuel_type = $12,
        mileage = $13,
        car_class = $14,
        registration_certificate = $15,
        price_1_2_days = $16,
        price_3_6_days = $17,
        price_7_14_days = $18,
        price_15_30_days = $19,
        price_30_plus_days = $20,
        deposit_amount = $21,
        ownership_type = $22,
        status = $23,
        comment = $24,
        updated_at = now()
       WHERE id = $25
       RETURNING *`,
      [
        car.name,
        car.plate_number,
        car.is_active,
        car.brand,
        car.model,
        car.year,
        car.vin,
        car.color,
        car.body_type,
        car.transmission,
        car.engine,
        car.fuel_type,
        car.mileage,
        car.car_class,
        car.registration_certificate,
        car.price_1_2_days,
        car.price_3_6_days,
        car.price_7_14_days,
        car.price_15_30_days,
        car.price_30_plus_days,
        car.deposit_amount,
        car.ownership_type,
        car.status,
        car.comment,
        id,
      ]
    );
    return result.rows[0] ?? null;
  } catch (error) {
    throw mapDbError(error);
  }
}

export async function deleteCar(id: string) {
  const usage = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM bookings WHERE car_id = $1`, [id]);
  const usedInBookings = Number(usage.rows[0]?.count ?? 0) > 0;

  if (usedInBookings) {
    const result = await query<CarRow>(
      `UPDATE cars
       SET status = 'inactive',
           is_active = false,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return { deleted: false, car: result.rows[0] ?? null };
  }

  const result = await query<CarRow>(`DELETE FROM cars WHERE id = $1 RETURNING *`, [id]);
  return { deleted: (result.rowCount ?? 0) > 0, car: result.rows[0] ?? null };
}
