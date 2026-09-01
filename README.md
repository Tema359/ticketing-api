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

A `Payment` records the financial transaction for a reservation and tracks its processing status. A successful payment confirms the reservation and authorizes the creation of the corresponding tickets.

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

The project uses **Option B — runtime validation at the API boundary**, not consumer-driven Pact. The NestJS application validates requests and responses against `openapi/openapi.yaml` using `express-openapi-validator` for all five event and reservation operations, with data stored in memory. A global exception filter converts validator errors, malformed JSON, and application exceptions into `application/problem+json`; invalid server responses produce a sanitized `500` problem response. Swagger UI at `/api` and its documentation assets are excluded from API validation. The `Idempotency-Key` header is required by the schema, but replay deduplication and key/body conflict detection are not implemented yet.

## Local setup and startup

### Prerequisites

- Node.js **22.23.2** and npm **10 or later**.

### Install dependencies

```bash
npm install
```

### Start in development mode

```bash
npm run start:dev
```

### Build and start without watch mode

```bash
npm run build
npm start
```

The default port is **3000**:

- Swagger UI: [http://localhost:3000/api](http://localhost:3000/api)
- Events endpoint: [http://localhost:3000/events](http://localhost:3000/events)
- Swagger JSON: [http://localhost:3000/api-json](http://localhost:3000/api-json)

```bash
curl -i 'http://localhost:3000/events?limit=2'
```

Expect `200 OK` and a JSON object containing `items` and `next_cursor`. The root path `/` is not an API endpoint.

### Regenerate the OpenAPI contract when needed

Only after intentional Swagger metadata changes:

```bash
npm run openapi:generate
npx --no-install redocly lint openapi/openapi.yaml
npm run test:contract
```

`openapi:generate` builds the project and overwrites `openapi/openapi.yaml`. Review the YAML diff before accepting the updated contract. This is not a required installation step.

### Available npm scripts

| Command                    | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `npm run start:dev`        | Compile and run with automatic rebuilds on source changes.    |
| `npm run build`            | Compile TypeScript into `dist/`.                              |
| `npm run format`           | Format supported project files with Prettier.                 |
| `npm run format:check`     | Check formatting without changing files.                      |
| `npm start`                | Run the previously compiled application.                      |
| `npm run typecheck`        | Check TypeScript without emitting files.                      |
| `npm run test:contract`    | Compile and run the contract tests.                           |
| `npm run openapi:generate` | Build and regenerate the YAML contract from Swagger metadata. |
