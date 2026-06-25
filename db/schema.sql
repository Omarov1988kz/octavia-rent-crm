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

CREATE UNIQUE INDEX IF NOT EXISTS cars_plate_number_unique_idx ON cars(plate_number);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id uuid NOT NULL REFERENCES cars(id),
  client_name text NOT NULL,
  client_phone text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'request',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_car_id_idx ON bookings(car_id);
CREATE INDEX IF NOT EXISTS bookings_dates_idx ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

CREATE TABLE IF NOT EXISTS public_calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  car_key text NOT NULL DEFAULT 'octavia',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL,
  source text NOT NULL DEFAULT 'local_crm',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date),
  CHECK (status IN ('request', 'booked', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS public_calendar_entries_car_key_idx ON public_calendar_entries(car_key);
CREATE INDEX IF NOT EXISTS public_calendar_entries_dates_idx ON public_calendar_entries(start_date, end_date);
CREATE INDEX IF NOT EXISTS public_calendar_entries_status_idx ON public_calendar_entries(status);
CREATE UNIQUE INDEX IF NOT EXISTS public_calendar_entries_external_id_idx ON public_calendar_entries(external_id);

-- Пример данных
INSERT INTO cars (name, plate_number)
VALUES ('Skoda Octavia', 'A123BC')
ON CONFLICT (plate_number) DO NOTHING;
