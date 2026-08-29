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

| Covered | Domain requirement | Where it will be used |
| :---: | --- | --- |
| [x] | At least two user roles with different permissions | **HW #24** — resource-level RBAC |
| [x] | A limited resource that users compete for, such as inventory, seats, or time slots | **HW #14** — transaction under concurrent load |
| [x] | An operation with an irreversible side effect, such as payment, reservation, or charge | **HW #22** — outbox pattern and idempotency keys |
| [x] | An event that requires notifying someone | **HW #18** — real-time communication; **HW #19** — message queue |
| [x] | An entity with files, such as photos, documents, or avatars | **HW #26** — S3 and presigned URLs |
| [x] | Data that is read frequently and changed rarely | **HW #23** — cache-aside with Redis |
| [x] | Four to six related entities and at least one complex query | **HW #12–13** — schema, indexes, and N+1 query prevention |

## Architecture decisions

The compute model consists of a stateless NestJS API and separate workers running in Docker or Kubernetes. PostgreSQL with TypeORM is the source of truth, while Redis supports caching and BullMQ workloads. RabbitMQ handles asynchronous commands, Kafka distributes domain events, and the Transactional Outbox pattern with idempotency keys ensures reliable processing. Authentication and authorization use OAuth 2.0/OIDC, JWTs, RBAC, and resource ownership checks. The system is deployed on AWS, uses S3 for object storage and GitHub Actions with OIDC for delivery, and provides observability through Prometheus, Grafana, and OpenTelemetry.

## Trade-offs

The system starts as a modular monolith rather than independently deployed microservices because this keeps transactions, local development, and operations simpler until scaling or team boundaries justify the additional complexity. PostgreSQL remains the system of record for reservations and tickets; Redis is used only for caching and background-job coordination, so cache loss may temporarily reduce performance but cannot cause ticket overselling. The MVP intentionally excludes interactive seating maps, ticket resale, and refunds because these capabilities introduce separate inventory, ownership-transfer, and payment-reversal workflows. The initial design instead prioritizes the core invariant that the same inventory unit must never be sold twice.

## User stories

1. **As a user**, I want to search and browse published upcoming events by category, location, and date so that I can find an event I would like to attend.
2. **As a user**, I want selected tickets to be reserved exclusively for a limited time during checkout so that I can complete payment without another buyer taking them.
3. **As a user**, I want to pay for an active reservation and receive my ticket after successful payment so that I can attend the event.
4. **As an organizer**, I want to create and publish an event and configure its ticket types, prices, and quantities so that users can discover it and purchase tickets.
