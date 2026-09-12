SELECT ticket.*
FROM tickets AS ticket
WHERE ticket.owner_id = (
    SELECT id
    FROM users
    WHERE lower(email) = 'attendee-100@example.test'
)
  AND ticket.issued_at >= now() - interval '180 days'
ORDER BY ticket.issued_at DESC, ticket.id DESC
LIMIT 100;
