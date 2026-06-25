-- PostgreSQL schema for Octavia Rent CRM

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  plate_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- Пример данных
INSERT INTO cars (name, plate_number) VALUES ('Skoda Octavia', 'A123BC');
