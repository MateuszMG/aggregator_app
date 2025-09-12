CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET client_min_messages TO WARNING;

-- Mechanics table
CREATE TABLE mechanics (
    mechanic_id UUID PRIMARY KEY,
    mechanic_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service definitions table
CREATE TABLE service_definitions (
    service_id UUID PRIMARY KEY,
    service_name VARCHAR(150) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0)
);

-- Service orders table
CREATE TABLE service_orders (
    order_id UUID PRIMARY KEY,
    mechanic_id UUID NOT NULL REFERENCES mechanics(mechanic_id),
    service_id UUID NOT NULL REFERENCES service_definitions(service_id),
    client_name VARCHAR(100) NOT NULL,
    client_contact VARCHAR(20) NOT NULL,
    bike_model VARCHAR(100) NOT NULL,
    hours_spent NUMERIC(5, 2) NOT NULL CHECK (hours_spent >= 0),
    additional_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    date_registered TIMESTAMPTZ NOT NULL,
    date_finished TIMESTAMPTZ,
    CHECK (date_finished IS NULL OR date_finished >= date_registered)
);

-- Indexes for performance
CREATE INDEX idx_service_orders_date_finished ON service_orders(date_finished);
CREATE INDEX idx_service_orders_mechanic_id ON service_orders(mechanic_id);

-- Insert data
BEGIN;

-- Mechanics
INSERT INTO mechanics (mechanic_id, mechanic_name, specialization) VALUES
('e5f6a7b8-c9d0-1122-3344-eeff00112233', 'Janusz Fachowiec', 'Przerzutki i napęd'),
('f6a7b8c9-d0e1-2233-4455-ff0011223344', 'Grażyna Hamulcowa', 'Hamulce hydrauliczne'),
('a7b8c9d0-e1f2-3344-5566-001122334455', 'Sebastian Ogólny', 'Serwis ogólny');

-- Service definitions
INSERT INTO service_definitions (service_id, service_name, base_price) VALUES
('a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e5e5', 'Regulacja przerzutki', 50.00),
('b2b2b2b2-c3c3-d4d4-e5e5-f6f6f6f6f6f6', 'Odpowietrzenie hamulców', 80.00),
('c3c3c3c3-d4d4-e5e5-f6f6-a1a1a1a1a1a1', 'Pełny przegląd roweru', 150.00),
('d4d4d4d4-e5e5-f6f6-a1a1-b2b2b2b2b2b2', 'Wymiana klocków hamulcowych', 30.00),
('e5e5e5e5-f6f6-a1a1-b2b2-c3c3c3c3c3c3', 'Wymiana łańcucha i kasety', 70.00),
('f6f6f6f6-a1a1-b2b2-c3c3-d4d4d4d4d4d4', 'Centrowanie koła', 60.00),
('a2a2a2a2-b3b3-c4c4-d5d5-e6e6e6e6e6e6', 'Wymiana opon (tubeless setup)', 90.00),
('b3b3b3b3-c4c4-d5d5-e6e6-f7f7f7f7f7f7', 'Wymiana suportu', 85.00);

-- Orders
DO $$
DECLARE
    mechanic_ids UUID[] := ARRAY['e5f6a7b8-c9d0-1122-3344-eeff00112233', 'f6a7b8c9-d0e1-2233-4455-ff0011223344', 'a7b8c9d0-e1f2-3344-5566-001122334455'];
    service_ids UUID[] := ARRAY['a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e5e5', 'b2b2b2b2-c3c3-d4d4-e5e5-f6f6f6f6f6f6', 'c3c3c3c3-d4d4-e5e5-f6f6-a1a1a1a1a1a1', 'd4d4d4d4-e5e5-f6f6-a1a1-b2b2b2b2b2b2', 'e5e5e5e5-f6f6-a1a1-b2b2-c3c3c3c3c3c3', 'f6f6f6f6-a1a1-b2b2-c3c3-d4d4d4d4d4d4', 'a2a2a2a2-b3b3-c4c4-d5d5-e6e6e6e6e6e6', 'b3b3b3b3-c4c4-d5d5-e6e6-f7f7f7f7f7f7'];
    bike_brands TEXT[] := ARRAY['Kross', 'Trek', 'Giant', 'Scott', 'Merida', 'Romet', 'Cube', 'Cannondale', 'Specialized', 'Orbea'];
    bike_models TEXT[] := ARRAY['Level', 'Marlin', 'Talon', 'Aspect', 'Big Nine', 'Orkan', 'Aim', 'Trail', 'Rockhopper', 'Alma'];
    first_names TEXT[] := ARRAY['Jan', 'Anna', 'Piotr', 'Katarzyna', 'Marek', 'Agnieszka', 'Tomasz', 'Magdalena'];
    last_names TEXT[] := ARRAY['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Zieliński', 'Szymański'];
    reg_date TIMESTAMPTZ;
    fin_date TIMESTAMPTZ;
BEGIN
    FOR i IN 1..10000 LOOP
        -- Generate random registered date
        reg_date := timestamp '2025-01-01' + random() * (timestamp '2025-08-31' - timestamp '2025-01-01');

        -- 95% chance of having a finished date
        IF random() < 0.95 THEN
            fin_date := reg_date + (random() * 14 + 1) * interval '1 day'; -- finished 1 to 15 days after registration
            -- Ensure finish date does not exceed the max date
            IF fin_date > timestamp '2025-08-31' THEN
                fin_date := timestamp '2025-08-31';
            END IF;
        ELSE
            fin_date := NULL;
        END IF;

        INSERT INTO service_orders (order_id, mechanic_id, service_id, client_name, client_contact, bike_model, hours_spent, additional_cost, date_registered, date_finished)
        VALUES (
            gen_random_uuid(),
            mechanic_ids[floor(random() * array_length(mechanic_ids, 1) + 1)],
            service_ids[floor(random() * array_length(service_ids, 1) + 1)],
            first_names[floor(random() * array_length(first_names, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)],
            '+48' || (500000000 + floor(random() * 499999999))::bigint::text,
            bike_brands[floor(random() * array_length(bike_brands, 1) + 1)] || ' ' || bike_models[floor(random() * array_length(bike_models, 1) + 1)] || ' ' || (2010 + floor(random() * 15))::text,
            round((random() * 8 + 0.5)::numeric, 2), -- hours_spent from 0.5 to 8.5
            CASE WHEN random() < 0.7 THEN round((random() * 500)::numeric, 2) ELSE 0 END, -- 70% chance of additional cost
            reg_date,
            fin_date
        );
    END LOOP;
END $$;

COMMIT;
