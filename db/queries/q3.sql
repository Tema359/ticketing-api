SELECT id, email, role, created_at
FROM users
WHERE lower(email) LIKE 'attendee-199%'
ORDER BY email;
