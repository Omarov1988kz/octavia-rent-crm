-- PostgreSQL schema for Octavia Rent CRM

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  plate_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS vin text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS body_type text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS transmission text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS engine text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS fuel_type text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS mileage integer;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS car_class text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS registration_certificate text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS price_1_2_days numeric(12, 2);
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS price_3_6_days numeric(12, 2);
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS price_7_14_days numeric(12, 2);
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS price_15_30_days numeric(12, 2);
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS price_30_plus_days numeric(12, 2);
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(12, 2);
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS ownership_type text NOT NULL DEFAULT 'own';
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS comment text;
ALTER TABLE IF EXISTS cars
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE cars
SET plate_number = NULL
WHERE plate_number IS NOT NULL
  AND TRIM(plate_number) = '';

DELETE FROM cars a
USING cars b
WHERE a.ctid < b.ctid
  AND NULLIF(TRIM(a.plate_number), '') IS NOT NULL
  AND LOWER(TRIM(a.plate_number)) = LOWER(TRIM(b.plate_number));

CREATE UNIQUE INDEX IF NOT EXISTS cars_plate_number_unique_idx ON cars(plate_number);
CREATE INDEX IF NOT EXISTS cars_status_idx ON cars(status);
CREATE INDEX IF NOT EXISTS cars_ownership_type_idx ON cars(ownership_type);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid NOT NULL REFERENCES cars(id),
  client_name text NOT NULL,
  client_phone text,
  start_date date NOT NULL,
  start_time time NOT NULL DEFAULT '12:00',
  end_date date NOT NULL,
  end_time time NOT NULL DEFAULT '12:00',
  status text NOT NULL DEFAULT 'request',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS start_time time NOT NULL DEFAULT '12:00';
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS end_time time NOT NULL DEFAULT '12:00';

CREATE INDEX IF NOT EXISTS bookings_car_id_idx ON bookings(car_id);
CREATE INDEX IF NOT EXISTS bookings_dates_idx ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

CREATE TABLE IF NOT EXISTS public_calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  car_key text NOT NULL DEFAULT 'octavia',
  start_date date NOT NULL,
  start_time time NOT NULL DEFAULT '12:00',
  end_date date NOT NULL,
  end_time time NOT NULL DEFAULT '12:00',
  status text NOT NULL,
  source text NOT NULL DEFAULT 'local_crm',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date OR (end_date = start_date AND end_time > start_time)),
  CHECK (status IN ('request', 'booked', 'cancelled'))
);

ALTER TABLE IF EXISTS public_calendar_entries
  ADD COLUMN IF NOT EXISTS start_time time NOT NULL DEFAULT '12:00';
ALTER TABLE IF EXISTS public_calendar_entries
  ADD COLUMN IF NOT EXISTS end_time time NOT NULL DEFAULT '12:00';

CREATE INDEX IF NOT EXISTS public_calendar_entries_car_key_idx ON public_calendar_entries(car_key);
CREATE INDEX IF NOT EXISTS public_calendar_entries_dates_idx ON public_calendar_entries(start_date, end_date);
CREATE INDEX IF NOT EXISTS public_calendar_entries_status_idx ON public_calendar_entries(status);
CREATE UNIQUE INDEX IF NOT EXISTS public_calendar_entries_external_id_idx ON public_calendar_entries(external_id);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  birth_date date,
  gender text,
  phone text,
  email text,
  residential_address text,
  registration_address text,
  document_type text,
  document_series_number text,
  document_issued_by text,
  document_issued_date date,
  document_expiry_date date,
  driver_license_number text,
  driver_license_issued_date date,
  driver_license_expiry_date date,
  driver_license_categories text,
  driver_license_country text,
  kbm text,
  inn text,
  client_registration_date date NOT NULL DEFAULT current_date,
  client_status text NOT NULL DEFAULT 'new',
  preferences text,
  comments text,
  social_links text,
  acquisition_source text,
  is_blacklisted boolean NOT NULL DEFAULT false,
  blacklist_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS residential_address text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS registration_address text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS document_series_number text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS document_issued_by text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS document_issued_date date;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS passport_department_code text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS document_expiry_date date;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS driver_license_number text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS driver_license_issued_date date;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS driver_license_expiry_date date;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS driver_license_categories text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS driver_license_country text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS kbm text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS inn text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS client_registration_date date NOT NULL DEFAULT current_date;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS client_status text NOT NULL DEFAULT 'new';
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS preferences text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS comments text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS social_links text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS acquisition_source text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS blacklist_reason text;
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS contract_number text;
ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS contract_date date;

CREATE TABLE IF NOT EXISTS rental_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number integer NOT NULL UNIQUE,
  contract_date date NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  car_id uuid REFERENCES cars(id) ON DELETE SET NULL,
  daily_price numeric(12, 2),
  allowed_mileage integer,
  deposit_amount numeric(12, 2),
  discount_percent numeric(5, 2),
  rent_amount numeric(12, 2),
  total_amount_with_deposit numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS rental_contracts_active_booking_unique_idx
  ON rental_contracts(booking_id)
  WHERE booking_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS rental_contracts_deleted_at_idx ON rental_contracts(deleted_at);
CREATE INDEX IF NOT EXISTS rental_contracts_created_at_idx ON rental_contracts(created_at);

CREATE TABLE IF NOT EXISTS car_class_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_class text NOT NULL UNIQUE,
  deposit_amount integer NOT NULL DEFAULT 10000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO car_class_deposits (car_class, deposit_amount)
VALUES
  ('эконом', 10000),
  ('комфорт', 10000),
  ('бизнес', 10000),
  ('люкс', 10000),
  ('SUV', 10000)
ON CONFLICT (car_class) DO NOTHING;

CREATE INDEX IF NOT EXISTS clients_last_name_idx ON clients(last_name);
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients(phone);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(client_status);
CREATE INDEX IF NOT EXISTS clients_blacklist_idx ON clients(is_blacklisted);

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  title text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS owner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  inn text,
  passport_series_number text,
  passport_issued_by text,
  passport_issued_date date,
  passport_department_code text,
  registration_address text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO document_templates (template_key, title, file_name, file_path, description, is_active)
VALUES (
  'rental_contract',
  'Договор аренды',
  'rental-contract-template.docx',
  'templates/rental-contract-template.docx',
  'DOCX-шаблон договора аренды автомобиля без экипажа',
  true
)
ON CONFLICT (template_key) DO NOTHING;

-- Пример данных
INSERT INTO cars (name, plate_number)
VALUES ('Skoda Octavia', 'A123BC')
ON CONFLICT (plate_number) DO NOTHING;
