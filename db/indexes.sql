CREATE INDEX tickets_owner_issued_at_idx
    ON tickets (owner_id, issued_at DESC, id DESC);

CREATE INDEX payments_failed_created_at_idx
    ON payments (created_at DESC, id DESC)
    WHERE status = 'failed';

CREATE INDEX users_email_lower_pattern_idx
    ON users (lower(email) text_pattern_ops);

CREATE INDEX events_search_vector_idx
    ON events
    USING GIN (search_vector);
