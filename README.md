# Ticketing API

Ticketing API is a NestJS backend service for creating events and managing the complete ticket lifecycle—from discovery and reservation to payment and notification.

## The problem it solves

Selling tickets involves more than storing events and orders. Popular events can receive many purchase attempts at the same time, while every ticket must be sold at most once. Unfinished checkouts must not block inventory forever, and payment results must remain consistent with reservations.

## Who it is for

The service is intended for teams building event marketplaces, venue platforms, ticketing applications, or internal event-sales systems. It gives product teams a foundation on which to build web and mobile experiences for attendees, event organizers, and marketplace administrators.

## Domain model

The domain consists of six core entities that cover event publication, inventory configuration, checkout, payment, and admission. Together, they describe the lifecycle from an organizer creating an event to an attendee receiving a valid ticket.

### User

A `User` can act as an attendee who makes reservations or as an organizer who creates events. An attendee can own multiple reservations and tickets, while an organizer can manage multiple events.

### Event

An `Event` represents a scheduled experience published by an organizer and contains its essential details, such as date, location, and status. Each event belongs to one organizer and offers one or more ticket types.

### TicketType

A `TicketType` defines a purchasable inventory category for an event, including its name, price, and available quantity. It belongs to one event and can be referenced by many reservations and issued tickets.

### Reservation

A `Reservation` temporarily holds a quantity of a selected ticket type for an attendee during checkout. It belongs to one user and one ticket type, has an expiration time, and may be associated with a payment attempt.

### Payment

A `Payment` records the financial transaction for a reservation and tracks its processing status. A successful payment confirms the reservation and authorizes the creation of the corresponding tickets. All monetary values are stored as integers in the currency's minor units, so `10100` with currency `PLN` represents `101.00 PLN` without floating-point rounding.

### Ticket

A `Ticket` is the admission credential issued to an attendee after a reservation has been paid successfully. It belongs to one user, references its event and ticket type, and remains traceable to the reservation and payment that produced it.

## Domain requirements

The ticketing domain covers all of the required architectural scenarios. The table below maps each requirement to the homework assignment in which it will be implemented.

| Covered | Domain requirement                                                                     | Where it will be used                                            |
| :-----: | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
|   [x]   | At least two user roles with different permissions                                     | **HW #24** — resource-level RBAC                                 |
|   [x]   | A limited resource that users compete for, such as inventory, seats, or time slots     | **HW #14** — transaction under concurrent load                   |
|   [x]   | An operation with an irreversible side effect, such as payment, reservation, or charge | **HW #22** — outbox pattern and idempotency keys                 |
|   [x]   | An event that requires notifying someone                                               | **HW #18** — real-time communication; **HW #19** — message queue |
|   [x]   | An entity with files, such as photos, documents, or avatars                            | **HW #26** — S3 and presigned URLs                               |
|   [x]   | Data that is read frequently and changed rarely                                        | **HW #23** — cache-aside with Redis                              |
|   [x]   | Four to six related entities and at least one complex query                            | **HW #12–13** — schema, indexes, and N+1 query prevention        |

## Architecture decisions

The compute model consists of a stateless NestJS API and separate workers running in Docker or Kubernetes. PostgreSQL with TypeORM is the source of truth, while Redis supports caching and BullMQ workloads. RabbitMQ handles asynchronous commands, Kafka distributes domain events, and the Transactional Outbox pattern with idempotency keys ensures reliable processing. Authentication and authorization use OAuth 2.0/OIDC, JWTs, RBAC, and resource ownership checks. The system is deployed on AWS, uses S3 for object storage and GitHub Actions with OIDC for delivery, and provides observability through Prometheus, Grafana, and OpenTelemetry.

## Trade-offs

The system starts as a modular monolith rather than independently deployed microservices because this keeps transactions, local development, and operations simpler until scaling or team boundaries justify the additional complexity. PostgreSQL remains the system of record for reservations and tickets; Redis is used only for caching and background-job coordination, so cache loss may temporarily reduce performance but cannot cause ticket overselling. The MVP intentionally excludes interactive seating maps, ticket resale, and refunds because these capabilities introduce separate inventory, ownership-transfer, and payment-reversal workflows. The initial design instead prioritizes the core invariant that the same inventory unit must never be sold twice.

## User stories

1. **As a user**, I want to search and browse published upcoming events by category, location, and date so that I can find an event I would like to attend.
2. **As a user**, I want selected tickets to be reserved exclusively for a limited time during checkout so that I can complete payment without another buyer taking them.
3. **As a user**, I want to pay for an active reservation and receive my ticket after successful payment so that I can attend the event.
4. **As an organizer**, I want to create and publish an event and configure its ticket types, prices, and quantities so that users can discover it and purchase tickets.

## Contract verification — Option B

The project uses **Option B — runtime validation at the API boundary**, not consumer-driven Pact. The NestJS application validates requests and responses against `openapi/openapi.yaml` using `express-openapi-validator` for all five event and reservation operations, with data stored in memory. A global exception filter converts validator errors, malformed JSON, and application exceptions into `application/problem+json`; invalid server responses produce a sanitized `500` problem response. Swagger UI at `/api` and its documentation assets are excluded from API validation. For reservation creation, repeating the same `Idempotency-Key` with the same body returns the original `201` response with `Idempotency-Replay: true`, while reusing the key with a different body returns a `422 application/problem+json` response.

## Grading

From a fresh clone, install dependencies, start the development Compose stack, and export the tracked development database configuration. `SKIP_VAULT=1` tells the existing npm wrappers to use these injected values instead of trying to access the private Infisical project.

```bash
npm ci
docker compose up -d --wait db
export DB_URL=postgresql://ticketing@127.0.0.1:5432/ticketing DB_PASSWORD_FILE=secrets/db_password.example
export SKIP_VAULT=1 # the grader cannot access the private vault
npm run migrate
npm run seed
npm run demo:nplus1
npm run report
```

## Local setup and startup

### Prerequisites

- Docker Engine with Docker Compose.
- OpenSSL for generating the initial local database password.

Node.js **22.23.2** and npm **10 or later** are only required when running checks or the API directly on the host.

### Database grader quick start

Start PostgreSQL from a fresh clone with the versioned development-only example secret:

```bash
docker compose up -d --wait db
```

Connect and verify it in one command:

```bash
docker compose exec -T db psql -U ticketing -d ticketing -Atc 'SELECT 1'
```

### Database benchmark dataset

The main workload table is `reservations`, and the catalog table searched by `db/queries/q4.sql` is `events`. After applying `db/schema.sql` to a clean database, `db/seed.sql` inserts exactly 100,000 rows into each of these tables and finishes with `VACUUM (ANALYZE)`.

```bash
docker compose exec -T db psql -U ticketing -d ticketing -v ON_ERROR_STOP=1 < db/schema.sql
```

```bash
docker compose exec -T db psql -U ticketing -d ticketing -v ON_ERROR_STOP=1 < db/seed.sql
```

```bash
docker compose exec -T db psql -U ticketing -d ticketing -Atc 'SELECT count(*) FROM reservations;'
docker compose exec -T db psql -U ticketing -d ticketing -Atc 'SELECT count(*) FROM events;'
```

### Prepare the local environment

Copy the versioned example before running `npm start` or `npm run start:dev` on the host. The resulting `.env` supplies the required `DB_URL`, is ignored by Git, and may be changed for local overrides; Docker Compose supplies its container configuration independently.

```bash
cp .env.example .env
```

### Prepare the database secret

The tracked `secrets/db_password.example` contains development-only credentials so the database can start from a fresh clone. For local password rotation, create an ignored managed secret before the first startup and select it through the Compose-only `DB_PASSWORD_SECRET_FILE` variable; do not overwrite it after PostgreSQL has initialized its volume.

```bash
mkdir -p secrets
test -f secrets/db_password || openssl rand -hex 32 > secrets/db_password
chmod 600 secrets/db_password
export DB_PASSWORD_SECRET_FILE=./secrets/db_password
```

### Start the application

Docker Compose builds the NestJS image, starts PostgreSQL, waits for its health check, and then starts the API. Source code is mounted by the development override, while the database is persisted in the `pgdata` volume. Without `DB_PASSWORD_SECRET_FILE`, Compose uses the tracked development-only example secret.

```bash
docker compose up --build -d
```

Check the container state and application dependencies:

```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

The API uses port **3000**:

- Swagger UI: [http://localhost:3000/api](http://localhost:3000/api)
- Events endpoint: [http://localhost:3000/events](http://localhost:3000/events)
- Swagger JSON: [http://localhost:3000/api-json](http://localhost:3000/api-json)

```bash
curl -i 'http://localhost:3000/events?limit=2'
```

Expect `200 OK` and a JSON object containing `items` and `next_cursor`. The root path `/` is not an API endpoint.

### Logs and shutdown

Use Compose to follow application logs and stop the complete stack. `docker compose down` preserves the PostgreSQL volume; add `-v` only when the stored database may be deleted intentionally.

```bash
docker compose logs -f api
docker compose down
```

### Regenerate the OpenAPI contract when needed

Only after intentional Swagger metadata changes:

```bash
npm run openapi:generate
npx --no-install redocly lint openapi/openapi.yaml
npm run test:contract
```

`openapi:generate` builds the project and overwrites `openapi/openapi.yaml`. Review the YAML diff before accepting the updated contract. This is not a required installation step.

### Available npm scripts

| Command                    | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `npm run start:dev`        | Compile and run with automatic rebuilds on source changes.     |
| `npm run build`            | Compile TypeScript into `dist/`.                               |
| `npm run check:env`        | Verify that `.env.example` matches the Zod environment schema. |
| `npm run format`           | Format supported project files with Prettier.                  |
| `npm run format:check`     | Check formatting without changing files.                       |
| `npm start`                | Build and run the application without watch mode.              |
| `npm run typecheck`        | Check TypeScript without emitting files.                       |
| `npm run test:contract`    | Compile and run the contract tests.                            |
| `npm run openapi:generate` | Build and regenerate the YAML contract from Swagger metadata.  |
| `npm run migrate:generate` | Build and generate a migration from entity changes.            |
| `npm run migrate:show`     | Build and show applied and pending TypeORM migrations.         |
| `npm run migrate`          | Build and apply pending TypeORM migrations.                    |
| `npm run migrate:revert`   | Build and revert the latest applied TypeORM migration.         |
| `npm run seed`             | Insert deterministic, idempotent development data.             |
| `npm run demo:nplus1`      | Log and compare naive and optimized relation-loading queries.  |
| `npm run report`           | Show successful payment revenue grouped by event and currency. |

## TypeORM and migrations

The application and the TypeORM CLI share `src/data-source.ts` and the connection options in `src/database`, including the password-file callback used for secret rotation. Schema synchronization is permanently disabled: database changes must be represented by versioned migrations, reviewed as SQL, and applied with `npm run migrate`. Create entities first and then run `npm run migrate:generate`; do not generate a migration while the entity list is incomplete, because TypeORM compares the entire mapped model with the current database schema.

Install and authenticate the Infisical CLI before running database commands. `migrate*`, `seed`, `demo:nplus1`, and `report` invoke `scripts/with-secrets.sh dev` themselves, so Infisical injects the `dev` environment into the child process and no command prefix or local env file is required.

In CI or the grader, set `SKIP_VAULT=1` after providing the required variables in the process environment; the same wrapper then executes the command directly without accessing Infisical.

Run `npm run migrate` before `npm run seed`. The ORM seed inserts ten fixed rows into each domain table inside one transaction and ignores existing seed records, so repeated runs do not duplicate data or fail. It is intentionally separate from `db/seed.sql`, which creates the large benchmark dataset used for query-plan exercises.

After running `npm run seed` twice, verify that the main table counts remain unchanged:

```bash
docker compose exec -T db psql -U ticketing -d ticketing -Atc "SELECT 'events=' || count(*) FROM events UNION ALL SELECT 'reservations=' || count(*) FROM reservations UNION ALL SELECT 'payments=' || count(*) FROM payments UNION ALL SELECT 'tickets=' || count(*) FROM tickets;"
```

### Relationship deletion policy

Every domain foreign key uses `onDelete: 'RESTRICT'` deliberately: events, reservations, payments, and issued tickets form financial and admission history that must not disappear through a cascading parent deletion. Lifecycle changes are represented by statuses such as `cancelled`, `expired`, `refunded`, and `void`; `CASCADE` is reserved for future dependent records that have no meaning or audit value without their parent.

### N+1 query demonstration

Run `npm run migrate`, `npm run seed`, and then `npm run demo:nplus1` against the development database. The script enables TypeORM query logging and loads ten events with two relation levels, `Event -> TicketType -> Reservation`, first with repository calls inside loops and then with optimized relation-loading strategies.

| Strategy                        | `N=5` | `N=10` |
| ------------------------------- | ----: | -----: |
| Naive queries in loops          |    11 |     21 |
| `leftJoinAndSelect` with `take` |     2 |      2 |
| `relationLoadStrategy: 'query'` |     5 |      5 |

The naive result grows as `1 + N + N`: one query for the event list, one ticket-type query per event, and one reservation query per ticket type in the deterministic seed. Increasing the collection from five to ten events leaves the optimized counts unchanged: `leftJoinAndSelect` with `take` uses one query for distinct root IDs and one for the complete graph, while the query strategy batches each relation level and its relation mapping in five statements. `take` is required here because SQL `LIMIT` would count joined rows rather than events and could return fewer root entities when an event has multiple ticket types or reservations.

### QueryBuilder vs Repository

Run `npm run report` to calculate successful-payment revenue, reservation count, and sold-ticket quantity grouped by event and currency. The project uses Repository `find*` methods for entity reads that can be expressed with filters, ordering, pagination, and relation loading; it switches to QueryBuilder when a query needs aggregates, `GROUP BY`, computed columns, or explicit join control and therefore returns report rows rather than entities.

## Configuration

All environment variables are validated by the Zod schema in `src/config/env.schema.ts` before the application starts. Invalid values stop the process immediately, while application code accesses validated values through `ConfigService<Env, true>`. `.env.example` is the versioned configuration contract; real `.env` files and the `secrets/` directory are excluded from Git and the Docker build context.

| Variable           | Type and allowed values                | Default               | Source                                             | Purpose                                       |
| ------------------ | -------------------------------------- | --------------------- | -------------------------------------------------- | --------------------------------------------- |
| `NODE_ENV`         | `development`, `test`, or `production` | `development`         | Dev/prod environment store; Docker Compose locally | Application runtime environment.              |
| `PORT`             | Integer from `1` to `65535`            | `3000`                | Dev/prod environment store; Docker Compose locally | HTTP port exposed by the API.                 |
| `DB_URL`           | `postgresql://` URL                    | Required              | Dev/prod environment store; Docker Compose locally | Connection URL without a password.            |
| `DB_PASSWORD_FILE` | Non-empty file path                    | `secrets/db_password` | Dev/prod environment store; Docker secret locally  | Password file path, never the password value. |

`DB_PASSWORD_SECRET_FILE` is a Docker Compose interpolation variable rather than an application variable, so it is intentionally absent from the Zod schema. It selects the host-side secret source: `secrets/db_password.example` by default for a fresh-clone development database, or ignored `secrets/db_password` for the password-rotation exercise.

Run `npm run check:env` after changing the schema or `.env.example`; the command exits with code `1` when their keys differ. The database password is intentionally absent from the environment schema because the application reads it from the file referenced by `DB_PASSWORD_FILE`.

### Rotating the database password

Run `rotate.sh` only on a stack initially started with `DB_PASSWORD_SECRET_FILE=./secrets/db_password`. It changes the PostgreSQL role password, overwrites the mounted file secret, and terminates old `ticketing` sessions so that `pg.Pool` creates new connections using the updated file. The API container is not restarted, so `uptime_seconds` continues increasing.

```bash
curl http://localhost:3000/health
./rotate.sh
curl http://localhost:3000/health/db
curl http://localhost:3000/health
docker inspect --format 'restart-count={{.RestartCount}}' ticketing-api-api-1
```

The second health request must return `200`, and the restart count must remain `0`. Do not replace the password file manually for an initialized database; use `rotate.sh` so the database role and file stay synchronized.


## Transactions і SQL optimization
