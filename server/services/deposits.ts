import { query } from "@/server/db";

export type CarClassDepositRow = {
  id: string;
  car_class: string;
  deposit_amount: number;
  created_at: string;
  updated_at: string;
};

export type CarClassDepositInput = {
  car_class?: string | null;
  deposit_amount?: number | string | null;
};

const DEFAULT_DEPOSIT_AMOUNT = 10000;

function normalizeCarClass(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDepositAmount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : DEFAULT_DEPOSIT_AMOUNT;
}

export async function ensureDefaultCarClassDeposits() {
  await query(
    `INSERT INTO car_class_deposits (car_class, deposit_amount)
     VALUES
       ('эконом', 10000),
       ('комфорт', 10000),
       ('бизнес', 10000),
       ('люкс', 10000),
       ('SUV', 10000)
     ON CONFLICT (car_class) DO NOTHING`,
    []
  );
}

export async function listCarClassDeposits() {
  await ensureDefaultCarClassDeposits();
  const result = await query<CarClassDepositRow>(
    `SELECT id, car_class, deposit_amount, created_at, updated_at
     FROM car_class_deposits
     ORDER BY
       CASE car_class
         WHEN 'эконом' THEN 1
         WHEN 'комфорт' THEN 2
         WHEN 'бизнес' THEN 3
         WHEN 'люкс' THEN 4
         WHEN 'SUV' THEN 5
         ELSE 6
       END,
       car_class`,
    []
  );
  return result.rows;
}

export async function upsertCarClassDeposits(inputs: CarClassDepositInput[]) {
  await ensureDefaultCarClassDeposits();
  for (const input of inputs) {
    const carClass = normalizeCarClass(input.car_class);
    if (!carClass) continue;
    const depositAmount = normalizeDepositAmount(input.deposit_amount);
    await query(
      `INSERT INTO car_class_deposits (car_class, deposit_amount, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (car_class) DO UPDATE
       SET deposit_amount = EXCLUDED.deposit_amount,
           updated_at = now()`,
      [carClass, depositAmount]
    );
  }
  return listCarClassDeposits();
}

export async function getDepositAmountForClass(carClass: string | null | undefined) {
  await ensureDefaultCarClassDeposits();
  const normalized = normalizeCarClass(carClass);
  if (!normalized) return DEFAULT_DEPOSIT_AMOUNT;
  const result = await query<{ deposit_amount: number }>(
    `SELECT deposit_amount
     FROM car_class_deposits
     WHERE LOWER(car_class) = LOWER($1)
     LIMIT 1`,
    [normalized]
  );
  return result.rows[0]?.deposit_amount ?? DEFAULT_DEPOSIT_AMOUNT;
}
