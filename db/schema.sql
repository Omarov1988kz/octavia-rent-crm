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

DELETE FROM cars a
USING cars b
WHERE a.ctid < b.ctid
  AND a.plate_number IS NOT NULL
  AND a.plate_number = b.plate_number;

CREATE UNIQUE INDEX IF NOT EXISTS cars_plate_number_unique_idx ON cars(plate_number);

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

CREATE INDEX IF NOT EXISTS clients_last_name_idx ON clients(last_name);
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients(phone);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(client_status);
CREATE INDEX IF NOT EXISTS clients_blacklist_idx ON clients(is_blacklisted);

-- Пример данных
INSERT INTO cars (name, plate_number)
VALUES ('Skoda Octavia', 'A123BC')
ON CONFLICT (plate_number) DO NOTHING;
