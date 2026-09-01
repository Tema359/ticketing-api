import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApplication } from '../dist/application.js';
import { EventsService } from '../dist/events/events.service.js';

let app;
let baseUrl;
before(async () => {
  app = await createApplication();
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});
after(async () => { await app?.close(); });

async function expectProblem(response, status) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /^application\/problem\+json/);
  const body = await response.json();
  assert.equal(body.status, status);
  for (const field of ['type', 'title', 'detail', 'instance']) {
    assert.equal(typeof body[field], 'string');
    assert.ok(body[field].length > 0);
  }
  assert.equal(body.type, 'about:blank');
  return body;
}

test('accepts valid requests and follows the next cursor', async () => {
  const first = await fetch(`${baseUrl}/events?limit=2`);
  assert.equal(first.status, 200);
  const page = await first.json();
  assert.equal(page.items.length, 2);
  assert.equal(typeof page.next_cursor, 'string');
  const last = await fetch(`${baseUrl}/events?limit=2&cursor=${page.next_cursor}`);
  const result = await last.json();
  assert.equal(last.status, 200);
  assert.equal(result.items.length, 1);
  assert.equal(result.next_cursor, null);
  assert.ok(!page.items.some((item) => item.id === result.items[0].id));
});

test('rejects invalid query values and unknown parameters', async () => {
  for (const query of ['limit=0', 'limit=101', 'limit=1.5', 'limit=abc', 'limit=1&limit=2', 'unexpected=value', 'cursor=invalid']) {
    await expectProblem(await fetch(`${baseUrl}/events?${query}`), 400);
  }
});

test('rejects invalid UUIDs and translates missing resources into Problem', async () => {
  await expectProblem(await fetch(`${baseUrl}/events/not-a-uuid`), 400);
  await expectProblem(await fetch(`${baseUrl}/events/00000000-0000-4000-8000-000000000000`), 404);
  await expectProblem(await fetch(`${baseUrl}/does-not-exist`), 404);
});

test('requires Idempotency-Key and validates request body without coercion', async () => {
  const url = `${baseUrl}/reservations`;
  const missingHeader = await expectProblem(await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Title', description: 'Description' }),
  }), 400);
  assert.equal(missingHeader.detail, "request/headers must have required property 'idempotency-key'");
  for (const body of [{ title: 'Title' }, { title: 123, description: 'Description' }, { title: 'Title', description: null }]) {
    const problem = await expectProblem(await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-key' },
      body: JSON.stringify(body),
    }), 400);
    assert.match(problem.detail, /request\/body/);
    if (!('description' in body)) {
      assert.equal(problem.detail, "request/body must have required property 'description'");
    }
  }
});

test('malformed JSON is returned as Problem', async () => {
  await expectProblem(await fetch(`${baseUrl}/reservations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-key' },
    body: '{broken',
  }), 400);
});

test('creates, reads, and deletes an in-memory reservation', async () => {
  const created = await fetch(`${baseUrl}/reservations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'create-test' },
    body: JSON.stringify({ title: 'Title', description: 'Description' }),
  });
  assert.equal(created.status, 201);
  assert.match(created.headers.get('content-type'), /^application\/json/);
  const reservation = await created.json();
  assert.equal(reservation.title, 'Title');
  assert.equal(reservation.description, 'Description');
  assert.match(reservation.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const location = created.headers.get('location');
  assert.equal(location, `/reservations/${reservation.id}`);
  const found = await fetch(`${baseUrl}${location}`);
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), reservation);
  const removed = await fetch(`${baseUrl}${location}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  await expectProblem(await fetch(`${baseUrl}${location}`), 404);
});

test('rejects an invalid server response instead of leaking it to the client', async () => {
  const service = app.get(EventsService);
  const original = service.findAll;
  try {
    service.findAll = () => ({ items: [{ id: 'invalid-uuid', title: 123 }], next_cursor: null });
    const problem = await expectProblem(await fetch(`${baseUrl}/events`), 500);
    assert.equal(problem.detail, 'The server could not produce a valid response.');
  } finally {
    service.findAll = original;
  }
});

test('Swagger remains available outside the validated API paths', async () => {
  const response = await fetch(`${baseUrl}/api-json`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).openapi, '3.0.0');
});
