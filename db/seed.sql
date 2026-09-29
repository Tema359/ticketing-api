\set ON_ERROR_STOP on
\timing on

BEGIN;

-- Organizers, administrators, and attendees have deliberately different cardinalities.
INSERT INTO users (email, role)
SELECT 'organizer-' || n || '@example.test', 'organizer'
FROM generate_series(1, 100) AS n;

INSERT INTO users (email, role)
SELECT 'admin-' || n || '@example.test', 'admin'
FROM generate_series(1, 10) AS n;

INSERT INTO users (email, role)
SELECT 'attendee-' || n || '@example.test', 'attendee'
FROM generate_series(1, 20_000) AS n;

-- Most events are published; draft, cancelled, and completed events are less common.
WITH organizers AS (
    SELECT id, row_number() OVER (ORDER BY email) AS position
    FROM users
    WHERE role = 'organizer'
),
generated_events AS (
    SELECT
        n,
        CASE
            WHEN n % 100 < 70 THEN 'published'
            WHEN n % 100 < 82 THEN 'completed'
            WHEN n % 100 < 92 THEN 'draft'
            ELSE 'cancelled'
        END AS status
    FROM generate_series(1, 100_000) AS n
)
INSERT INTO events (
    organizer_id,
    title,
    description,
    venue_name,
    starts_at,
    ends_at,
    status,
    created_at,
    updated_at
)
SELECT
    organizer.id,
    CASE generated.n % 10
        WHEN 0 THEN 'Концерт української музики №' || generated.n
        WHEN 1 THEN 'Вечір сучасної музики №' || generated.n
        WHEN 2 THEN 'Театральна вистава для всієї родини №' || generated.n
        WHEN 3 THEN 'Фестиваль молодих музикантів №' || generated.n
        WHEN 4 THEN 'Благодійний концерт у центрі міста №' || generated.n
        WHEN 5 THEN 'Дитяча театральна вистава №' || generated.n
        WHEN 6 THEN 'Лекція про українське мистецтво №' || generated.n
        WHEN 7 THEN 'Виставка сучасних художників №' || generated.n
        WHEN 8 THEN 'Джазовий вечір просто неба №' || generated.n
        ELSE 'Книжковий фестиваль і зустріч з авторами №' || generated.n
    END,
    CASE generated.n % 10
        WHEN 0 THEN 'Жива музика у виконанні відомих українських музикантів.'
        WHEN 1 THEN 'Музичний вечір об’єднає сучасні гурти та молодих виконавців.'
        WHEN 2 THEN 'Нова вистава київського театру про родину, дружбу та взаємну підтримку.'
        WHEN 3 THEN 'Фестиваль представляє концерти молодих музикантів з усієї України.'
        WHEN 4 THEN 'Кошти від благодійного концерту передадуть на підтримку дитячої лікарні.'
        WHEN 5 THEN 'Театральна історія для дітей з музикою, танцями та казковими героями.'
        WHEN 6 THEN 'Лекція досліджує історію мистецтва та роботи українських художників.'
        WHEN 7 THEN 'На виставці представлені картини, фотографії та мистецькі інсталяції.'
        WHEN 8 THEN 'Джазові композиції звучатимуть на відкритій сцені міського парку.'
        ELSE 'Українські автори презентують книжки та спілкуються з читачами.'
    END || CASE
        WHEN generated.n <= 2_000
            THEN ' Спеціальна програма: камерний концерт бандури.'
        ELSE ''
    END,
    'Майданчик №' || ((generated.n - 1) % 100 + 1),
    schedule.starts_at,
    schedule.starts_at + interval '3 hours',
    generated.status,
    schedule.starts_at - interval '90 days',
    schedule.starts_at - interval '30 days'
FROM generated_events AS generated
JOIN organizers AS organizer
    ON organizer.position = ((generated.n - 1) % 100) + 1
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN generated.status = 'completed'
            THEN now() - ((generated.n % 730) + 1) * interval '1 day'
        ELSE now() + ((generated.n % 730) + 1) * interval '1 day'
    END AS starts_at
) AS schedule;

-- Each event has three price tiers. Prices and inventory are intentionally non-uniform.
WITH numbered_events AS (
    SELECT id, row_number() OVER (ORDER BY starts_at, id) AS position
    FROM events
)
INSERT INTO ticket_types (
    event_id,
    name,
    price,
    currency,
    inventory_total,
    inventory_available,
    sales_start_at,
    sales_end_at
)
SELECT
    event.id,
    tier.name,
    tier.price,
    'EUR',
    tier.inventory_total,
    tier.inventory_total,
    now() - interval '30 days',
    now() + interval '180 days'
FROM numbered_events AS event
CROSS JOIN (
    VALUES
        ('Standard', 4_900, 5_000),
        ('Premium', 9_900, 1_500),
        ('VIP', 19_900, 300)
) AS tier(name, price, inventory_total);

-- Reservations are the main workload table. The status split is intentionally skewed:
-- confirmed 65%, expired 20%, cancelled 10%, pending 5%.
WITH attendees AS (
    SELECT id, row_number() OVER (ORDER BY email) AS position
    FROM users
    WHERE role = 'attendee'
),
numbered_ticket_types AS (
    SELECT id, price, currency, row_number() OVER (ORDER BY event_id, name) AS position
    FROM ticket_types
),
ticket_type_count AS (
    SELECT count(*) AS value
    FROM numbered_ticket_types
),
generated_reservations AS (
    SELECT
        n,
        now() - (n % 365) * interval '1 day' - (n % 86_400) * interval '1 second' AS created_at,
        CASE
            WHEN n % 100 < 65 THEN 'confirmed'
            WHEN n % 100 < 85 THEN 'expired'
            WHEN n % 100 < 95 THEN 'cancelled'
            ELSE 'pending'
        END AS status
    FROM generate_series(1, 100_000) AS n
)
INSERT INTO reservations (
    user_id,
    ticket_type_id,
    quantity,
    unit_price,
    currency,
    status,
    idempotency_key,
    request_fingerprint,
    expires_at,
    created_at,
    updated_at
)
SELECT
    attendee.id,
    ticket_type.id,
    (generated.n % 4) + 1,
    ticket_type.price,
    ticket_type.currency,
    generated.status,
    'seed-reservation-' || generated.n,
    md5('seed-request-' || generated.n) || md5('seed-body-' || generated.n),
    CASE
        WHEN generated.status = 'pending' THEN now() + interval '15 minutes'
        ELSE generated.created_at + interval '15 minutes'
    END,
    generated.created_at,
    generated.created_at + interval '5 minutes'
FROM generated_reservations AS generated
JOIN attendees AS attendee
    ON attendee.position = ((generated.n * 37 - 1) % 20_000) + 1
CROSS JOIN ticket_type_count
JOIN numbered_ticket_types AS ticket_type
    ON ticket_type.position = ((generated.n * 97 - 1) % ticket_type_count.value) + 1;

-- Successful payments exist for confirmed reservations; a smaller failed group
-- represents abandoned or rejected payment attempts.
INSERT INTO payments (
    reservation_id,
    provider,
    provider_payment_id,
    amount,
    currency,
    status,
    paid_at,
    created_at,
    updated_at
)
SELECT
    reservation.id,
    CASE WHEN row_number() OVER (ORDER BY reservation.created_at, reservation.id) % 4 = 0
        THEN 'adyen'
        ELSE 'stripe'
    END,
    'seed-payment-' || reservation.id,
    reservation.unit_price * reservation.quantity,
    reservation.currency,
    'succeeded',
    reservation.created_at + interval '4 minutes',
    reservation.created_at + interval '2 minutes',
    reservation.created_at + interval '4 minutes'
FROM reservations AS reservation
WHERE reservation.status = 'confirmed';

INSERT INTO payments (
    reservation_id,
    provider,
    provider_payment_id,
    amount,
    currency,
    status,
    created_at,
    updated_at
)
SELECT
    reservation.id,
    'stripe',
    'seed-failed-payment-' || reservation.id,
    reservation.unit_price * reservation.quantity,
    reservation.currency,
    'failed',
    reservation.created_at + interval '2 minutes',
    reservation.created_at + interval '3 minutes'
FROM reservations AS reservation
WHERE reservation.status IN ('expired', 'cancelled')
  AND get_byte(uuid_send(reservation.id), 0) % 5 = 0;

-- One admission credential is issued for every unit in a paid reservation.
WITH paid_reservations AS (
    SELECT
        reservation.id AS reservation_id,
        reservation.ticket_type_id,
        reservation.user_id,
        reservation.quantity,
        payment.id AS payment_id,
        payment.paid_at
    FROM reservations AS reservation
    JOIN payments AS payment
        ON payment.reservation_id = reservation.id
       AND payment.status = 'succeeded'
)
INSERT INTO tickets (
    reservation_id,
    payment_id,
    ticket_type_id,
    owner_id,
    admission_code,
    status,
    issued_at,
    used_at
)
SELECT
    paid.reservation_id,
    paid.payment_id,
    paid.ticket_type_id,
    paid.user_id,
    md5(paid.reservation_id::text || '-' || unit.number),
    CASE WHEN paid.paid_at < now() - interval '30 days' AND unit.number % 5 <> 0
        THEN 'used'
        ELSE 'valid'
    END,
    paid.paid_at,
    CASE WHEN paid.paid_at < now() - interval '30 days' AND unit.number % 5 <> 0
        THEN paid.paid_at + interval '30 minutes'
        ELSE NULL
    END
FROM paid_reservations AS paid
CROSS JOIN LATERAL generate_series(1, paid.quantity) AS unit(number);

-- Keep the materialized counter consistent with active and sold inventory.
UPDATE ticket_types AS ticket_type
SET inventory_available = ticket_type.inventory_total - usage.reserved_quantity,
    updated_at = now()
FROM (
    SELECT ticket_type_id, sum(quantity)::integer AS reserved_quantity
    FROM reservations
    WHERE status IN ('pending', 'confirmed')
    GROUP BY ticket_type_id
) AS usage
WHERE usage.ticket_type_id = ticket_type.id;

COMMIT;

-- Bulk loading invalidates planner estimates and the visibility map. Refresh both
-- so subsequent EXPLAIN (ANALYZE, BUFFERS) results are reproducible.
VACUUM (ANALYZE);

SELECT 'users' AS table_name, count(*) AS row_count FROM users
UNION ALL
SELECT 'events', count(*) FROM events
UNION ALL
SELECT 'ticket_types', count(*) FROM ticket_types
UNION ALL
SELECT 'reservations', count(*) FROM reservations
UNION ALL
SELECT 'payments', count(*) FROM payments
UNION ALL
SELECT 'tickets', count(*) FROM tickets
ORDER BY table_name;
