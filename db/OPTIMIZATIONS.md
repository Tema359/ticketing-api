# Database optimizations

All measurements below were taken locally against PostgreSQL 17 after applying `schema.sql` and `seed.sql`; `indexes.sql` and a fresh `ANALYZE` were applied between the before and after runs. Q4 was executed three times after index creation, and its reported after-plan is the third run with the GIN index and matching heap pages warmed in PostgreSQL's cache.

## Q1: tickets owned by a user within a period

### Before

```text
Limit  (cost=6178.35..6178.82 rows=4 width=134) (actual time=11.398..13.327 rows=12 loops=1)
  Buffers: shared hit=3376 read=249 written=161
  InitPlan 1
    ->  Seq Scan on users  (cost=0.00..550.65 rows=101 width=16) (actual time=0.100..5.793 rows=1 loops=1)
          Filter: (lower((email)::text) = 'attendee-100@example.test'::text)
          Rows Removed by Filter: 20109
          Buffers: shared read=249 written=161
  ->  Gather Merge  (cost=5627.70..5628.17 rows=4 width=134) (actual time=11.397..13.324 rows=12 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=3376 read=249 written=161
        ->  Sort  (cost=4627.68..4627.68 rows=2 width=134) (actual time=4.038..4.039 rows=4 loops=3)
              Sort Key: ticket.issued_at DESC, ticket.id DESC
              Sort Method: quicksort  Memory: 27kB
              Buffers: shared hit=3376
              Worker 0:  Sort Method: quicksort  Memory: 26kB
              Worker 1:  Sort Method: quicksort  Memory: 25kB
              ->  Parallel Seq Scan on tickets ticket  (cost=0.00..4627.67 rows=2 width=134) (actual time=3.192..3.964 rows=4 loops=3)
                    Filter: ((owner_id = (InitPlan 1).col1) AND (issued_at >= (now() - '180 days'::interval)))
                    Rows Removed by Filter: 53663
                    Buffers: shared hit=3286
Planning:
  Buffers: shared hit=188 read=9 written=4
Planning Time: 0.627 ms
Execution Time: 13.380 ms
```

### After

```text
Limit  (cost=40.07..40.09 rows=7 width=134) (actual time=0.118..0.119 rows=12 loops=1)
  Buffers: shared hit=10 read=5
  InitPlan 1
    ->  Index Scan using users_email_lower_pattern_idx on users  (cost=0.29..8.30 rows=1 width=16) (actual time=0.022..0.023 rows=1 loops=1)
          Index Cond: (lower((email)::text) = 'attendee-100@example.test'::text)
          Buffers: shared hit=1 read=2
  ->  Sort  (cost=31.77..31.78 rows=7 width=134) (actual time=0.117..0.117 rows=12 loops=1)
        Sort Key: ticket.issued_at DESC, ticket.id DESC
        Sort Method: quicksort  Memory: 28kB
        Buffers: shared hit=10 read=5
        ->  Bitmap Heap Scan on tickets ticket  (cost=4.50..31.67 rows=7 width=134) (actual time=0.065..0.084 rows=12 loops=1)
              Recheck Cond: ((owner_id = (InitPlan 1).col1) AND (issued_at >= (now() - '180 days'::interval)))
              Heap Blocks: exact=3
              Buffers: shared hit=4 read=5
              ->  Bitmap Index Scan on tickets_owner_issued_at_idx  (cost=0.00..4.50 rows=7 width=0) (actual time=0.053..0.053 rows=12 loops=1)
                    Index Cond: ((owner_id = (InitPlan 1).col1) AND (issued_at >= (now() - '180 days'::interval)))
                    Buffers: shared hit=1 read=5
Planning:
  Buffers: shared hit=252 read=2
Planning Time: 0.886 ms
Execution Time: 0.172 ms
```

`tickets_owner_issued_at_idx` entered the plan as `Bitmap Index Scan` and `users_email_lower_pattern_idx` served the owner lookup as `Index Scan`, replacing sequential scans of both users and tickets and reducing execution buffers from 3,625 to 15; the small final sort remains because a bitmap heap scan does not preserve index order.

## Q2: latest failed payments

### Before

```text
Limit  (cost=2553.35..2553.60 rows=100 width=130) (actual time=13.647..13.658 rows=100 loops=1)
  Buffers: shared hit=6 read=1447 written=1397
  ->  Sort  (cost=2553.35..2567.77 rows=5767 width=130) (actual time=13.646..13.651 rows=100 loops=1)
        Sort Key: created_at DESC, id DESC
        Sort Method: top-N heapsort  Memory: 67kB
        Buffers: shared hit=6 read=1447 written=1397
        ->  Seq Scan on payments payment  (cost=0.00..2332.94 rows=5767 width=130) (actual time=11.749..13.039 rows=5875 loops=1)
              Filter: ((status)::text = 'failed'::text)
              Rows Removed by Filter: 65000
              Buffers: shared read=1447 written=1397
Planning:
  Buffers: shared hit=196 read=5 written=5
Planning Time: 0.677 ms
Execution Time: 13.684 ms
```

### After

```text
Limit  (cost=0.28..63.46 rows=100 width=130) (actual time=0.034..0.137 rows=100 loops=1)
  Buffers: shared hit=97 read=2
  ->  Index Scan using payments_failed_created_at_idx on payments payment  (cost=0.28..3743.37 rows=5925 width=130) (actual time=0.033..0.129 rows=100 loops=1)
        Buffers: shared hit=97 read=2
Planning:
  Buffers: shared hit=223 read=1
Planning Time: 0.834 ms
Execution Time: 0.161 ms
```

The partial `payments_failed_created_at_idx` entered the plan as `Index Scan using`, removing both `Seq Scan` and `Sort`: it contains only failed payments in the requested order, stops after 100 rows, and reduces execution buffers from 1,453 to 99.

## Q3: case-insensitive email prefix search

### Before

```text
Sort  (cost=558.43..558.94 rows=203 width=60) (actual time=6.107..6.111 rows=111 loops=1)
  Sort Key: email
  Sort Method: quicksort  Memory: 33kB
  Buffers: shared hit=4 read=248 written=104
  ->  Seq Scan on users  (cost=0.00..550.65 rows=203 width=60) (actual time=0.135..6.015 rows=111 loops=1)
        Filter: (lower((email)::text) ~~ 'attendee-199%'::text)
        Rows Removed by Filter: 19999
        Buffers: shared hit=1 read=248 written=104
Planning:
  Buffers: shared hit=105 read=4
Planning Time: 0.349 ms
Execution Time: 6.151 ms
```

### After

```text
Sort  (cost=267.99..268.49 rows=203 width=60) (actual time=0.117..0.120 rows=111 loops=1)
  Sort Key: email
  Sort Method: quicksort  Memory: 33kB
  Buffers: shared hit=9 read=1
  ->  Bitmap Heap Scan on users  (cost=10.33..260.21 rows=203 width=60) (actual time=0.027..0.062 rows=111 loops=1)
        Filter: (lower((email)::text) ~~ 'attendee-199%'::text)
        Heap Blocks: exact=5
        Buffers: shared hit=6 read=1
        ->  Bitmap Index Scan on users_email_lower_pattern_idx  (cost=0.00..10.28 rows=199 width=0) (actual time=0.020..0.020 rows=111 loops=1)
              Index Cond: ((lower((email)::text) ~>=~ 'attendee-199'::text) AND (lower((email)::text) ~<~ 'attendee-19:'::text))
              Buffers: shared hit=1 read=1
Planning:
  Buffers: shared hit=167
Planning Time: 0.462 ms
Execution Time: 0.158 ms
```

The expression index `users_email_lower_pattern_idx` entered the plan as `Bitmap Index Scan`, replacing the sequential scan and reducing execution buffers from 252 to 10; `Sort` remains because the query orders by the original `email`, not by the indexed expression with its pattern operator class.

## Q4: event catalog full-text search

### Before

```text
Limit  (cost=8989.14..8989.16 rows=8 width=212) (actual time=23.245..23.247 rows=20 loops=1)
  Buffers: shared hit=6335 read=1410 written=21
  ->  Sort  (cost=8989.14..8989.16 rows=8 width=212) (actual time=23.243..23.244 rows=20 loops=1)
        Sort Key: (ts_rank(search_vector, '''камерний'' & ''концерт'' & ''бандури'''::tsquery)) DESC, id
        Sort Method: top-N heapsort  Memory: 43kB
        Buffers: shared hit=6335 read=1410 written=21
        ->  Seq Scan on events  (cost=0.00..8989.02 rows=8 width=212) (actual time=0.013..22.961 rows=2000 loops=1)
              Filter: (search_vector @@ '''камерний'' & ''концерт'' & ''бандури'''::tsquery)
              Rows Removed by Filter: 98000
              Buffers: shared hit=6329 read=1410 written=21
Planning:
  Buffers: shared hit=106 read=15 written=8
Planning Time: 0.586 ms
Execution Time: 23.284 ms
```

### After

```text
Limit  (cost=78.41..78.44 rows=9 width=212) (actual time=1.419..1.421 rows=20 loops=1)
  Buffers: shared hit=218
  ->  Sort  (cost=78.41..78.44 rows=9 width=212) (actual time=1.418..1.419 rows=20 loops=1)
        Sort Key: (ts_rank(search_vector, '''камерний'' & ''концерт'' & ''бандури'''::tsquery)) DESC, id
        Sort Method: top-N heapsort  Memory: 43kB
        Buffers: shared hit=218
        ->  Bitmap Heap Scan on events  (cost=43.06..78.27 rows=9 width=212) (actual time=0.199..1.192 rows=2000 loops=1)
              Recheck Cond: (search_vector @@ '''камерний'' & ''концерт'' & ''бандури'''::tsquery)
              Heap Blocks: exact=200
              Buffers: shared hit=212
              ->  Bitmap Index Scan on events_search_vector_idx  (cost=0.00..43.06 rows=9 width=0) (actual time=0.181..0.181 rows=2000 loops=1)
                    Index Cond: (search_vector @@ '''камерний'' & ''концерт'' & ''бандури'''::tsquery)
                    Buffers: shared hit=12
Planning:
  Buffers: shared hit=149
Planning Time: 0.442 ms
Execution Time: 1.460 ms
```

The GIN index `events_search_vector_idx` entered the plan as `Bitmap Index Scan`, replacing the scan and filtering of all 100,000 events with reads of 200 matching heap pages and reducing execution buffers from 7,745 to 218; the top-N rank sort remains because GIN does not store `ts_rank` order.

## Stored search vector cost

On the same 100,000-event dataset, an equivalent `events` table without `search_vector` occupied 40 MB; the stored vector increased it to approximately 68 MB (1.69×), and the 8,664 kB GIN index brought the total to 77 MB (1.90×). This is the deliberate cost of avoiding `to_tsvector` computation during every search: inserts and updates of `title` or `description` must materialize the vector and maintain the GIN index, while reads become substantially faster.

## Морфологія

Searching the same database with `plainto_tsquery('simple', 'бандури')` returned 2,000 events, while the other grammatical form `plainto_tsquery('simple', 'бандура')` returned 0 events. The counts differ because `simple` lowercases and tokenizes text but does not stem Ukrainian words, and this PostgreSQL installation exposes 29 built-in text search configurations with no Ukrainian configuration. A production-grade next step is a dedicated Ukrainian dictionary or normalization pipeline; `unaccent` can normalize diacritics but does not provide Ukrainian stemming, and substituting an unrelated built-in language configuration would not solve the problem correctly.
