SELECT
    id,
    title,
    description,
    ts_rank(search_vector, plainto_tsquery('simple', 'камерний концерт бандури')) AS rank
FROM events
WHERE search_vector @@ plainto_tsquery('simple', 'камерний концерт бандури')
ORDER BY rank DESC, id
LIMIT 20;
