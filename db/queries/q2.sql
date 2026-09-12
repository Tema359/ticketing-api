SELECT payment.*
FROM payments AS payment
WHERE payment.status = 'failed'
ORDER BY payment.created_at DESC, payment.id DESC
LIMIT 100;
