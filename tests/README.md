# Unit & Integration Tests

Unit tests use **pytest** with an in-memory SQLite database for service tests, and pure Pydantic for schema tests (no external database needed).

Integration tests use **FastAPI TestClient** (`httpx2`) with the same in-memory SQLite to validate the HTTP layer (status codes, response shapes, error propagation).

## Structure

```
tests/
├── integration/         # Router integration tests (HTTP layer via TestClient)
│   ├── conftest.py      # TestClient fixture + get_db override
│   ├── test_users_api.py
│   ├── test_rooms_api.py
│   └── test_reservations_api.py
└── unit/                # Unit tests (service/schema/model/config)
    ├── conftest.py      # Shared fixtures (engine, db_session, user, room, etc.)
    ├── config/          # Config module tests (mocked env, no DB)
    │   └── test_config.py
    ├── models/          # ORM model tests (require DB)
    │   └── test_models.py
    ├── schemas/         # Schema validation tests (no DB, pure Pydantic)
    │   ├── test_user_schemas.py
    │   ├── test_room_schemas.py
    │   └── test_reservation_schemas.py
    ├── services/        # Service-layer tests (require DB)
    │   ├── test_user_service.py
    │   ├── test_room_service.py
    │   └── test_reservation_service.py
```

## How to run

```bash
# Run all tests (unit + integration)
uv run pytest tests/ -v

# Run unit tests only
uv run pytest tests/unit -v

# Run integration tests only
uv run pytest tests/integration -v

# Run service tests only
uv run pytest tests/unit/services -v

# Run schema tests only
uv run pytest tests/unit/schemas -v

# Run config tests only
uv run pytest tests/unit/config -v

# Run model tests only
uv run pytest tests/unit/models -v

# Run a specific file
uv run pytest tests/unit/services/test_user_service.py -v

# Run tests matching a keyword
uv run pytest tests/unit -k "overlap" -v
```

## Fixtures (`conftest.py`)

Shared fixtures auto-discovered by pytest (available in all subdirectories):

| Fixture           | Description                                   |
| ----------------- | --------------------------------------------- |
| `engine`          | In-memory SQLite engine                       |
| `db_session`      | Session scoped to each test, rolls back after |
| `user`            | Pre-created user (Alice)                      |
| `second_user`     | Pre-created second user (Bob)                 |
| `room`            | Pre-created room (101, 2 guests)              |
| `second_room`     | Pre-created second room (102, 4 guests)       |

> Integration tests (`tests/integration/conftest.py`) provide a `client` fixture (FastAPI TestClient wrapping a fresh app instance) plus the same `user`, `second_user`, `room`, and `second_room` fixtures.

## Service Tests (`services/`)

### `services/test_user_service.py`

| Class                | Test                                        | What it verifies                              |
| -------------------- | ------------------------------------------- | --------------------------------------------- |
| **TestCreateUser**   | `test_create_user_success`                  | Creating a user sets id, name, email           |
|                      | `test_create_user_with_phone`               | Phone is stored when provided                  |
|                      | `test_create_user_duplicate_email`          | Duplicate email returns 409                    |
| **TestGetUser**      | `test_get_user_success`                     | Fetching an existing user works                |
|                      | `test_get_user_not_found`                   | Nonexistent user returns 404                   |
| **TestListUsers**    | `test_list_users_empty`                     | No users returns empty list                    |
|                      | `test_list_users_returns_all`               | Multiple users all returned                    |
|                      | `test_list_users_paginated`                 | skip/limit pagination works                    |
| **TestUpdateUser**   | `test_update_user_name`                     | Name can be updated in isolation               |
|                      | `test_update_user_email`                    | Email can be updated in isolation              |
|                      | `test_update_user_not_found`                | Updating nonexistent user returns 404          |
|                      | `test_update_user_duplicate_email`          | Updating to existing email returns 409         |
| **TestDeleteUser**   | `test_delete_user_success`                  | User is removed (get returns 404)              |
|                      | `test_delete_user_not_found`                | Deleting nonexistent user returns 404          |
|                      | `test_delete_user_with_active_reservations` | Deleting user with active reservations returns 409 |

### `services/test_room_service.py`

| Class                | Test                                               | What it verifies                                    |
| -------------------- | -------------------------------------------------- | --------------------------------------------------- |
| **TestCreateRoom**   | `test_create_room_success`                         | Creating a room sets id, defaults `is_active=True`  |
|                      | `test_create_room_with_description`                | Description is stored when provided                 |
|                      | `test_create_room_duplicate_name`                  | Duplicate room name returns 409                     |
| **TestGetRoom**      | `test_get_room_success`                            | Fetching an existing room works                     |
|                      | `test_get_room_not_found`                          | Nonexistent room returns 404                        |
| **TestListRooms**    | `test_list_rooms_empty`                            | No rooms returns empty list                         |
|                      | `test_list_rooms_basic`                            | Multiple active rooms all returned                  |
|                      | `test_list_rooms_excludes_inactive`                | Soft-deleted rooms hidden by default                |
|                      | `test_list_rooms_includes_inactive_when_requested` | Setting `active_only=False` returns all rooms       |
| **TestUpdateRoom**   | `test_update_room_capacity`                        | Capacity can be updated                             |
|                      | `test_update_room_name`                            | Name can be updated                                 |
|                      | `test_update_room_not_found`                       | Updating nonexistent room returns 404               |
|                      | `test_update_room_duplicate_name`                  | Updating to existing name returns 409               |
| **TestDeleteRoom**   | `test_delete_room_soft_delete`                     | Deactivation is a soft delete (`is_active=False`)   |
|                      | `test_delete_room_not_found`                       | Deleting nonexistent room returns 404               |
|                      | `test_delete_room_with_active_reservations`        | Deleting room with active reservations returns 409  |

### `services/test_reservation_service.py`

| Class                        | Test                                              | What it verifies                                       |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| **TestCreateReservation**    | `test_create_reservation_success`                 | Reservation is created with status CONFIRMED            |
|                              | `test_create_reservation_user_not_found`          | Nonexistent user returns 404                           |
|                              | `test_create_reservation_room_not_found`          | Nonexistent room returns 404                           |
|                              | `test_create_reservation_room_inactive`           | Inactive room returns 404                              |
|                              | `test_create_overlap_inside`                      | Overlapping dates (inside) blocked with 409            |
|                              | `test_create_overlap_start_before`                | Overlapping dates (starts before) blocked              |
|                              | `test_create_overlap_ends_after`                  | Overlapping dates (ends after) blocked                 |
|                              | `test_create_overlap_contains`                    | Overlapping dates (contains) blocked                   |
|                              | `test_create_no_overlap_adjacent`                 | Adjacent check-out/check-in allowed                    |
|                              | `test_create_no_overlap_separate`                 | Non-overlapping dates allowed                          |
|                              | `test_create_different_rooms_no_conflict`         | Same dates, different rooms allowed                    |
| **TestCancelReservation**    | `test_cancel_confirmed_reservation`               | Confirmed reservation cancelled (status CANCELLED)     |
|                              | `test_cancel_already_cancelled`                   | Cancelling twice returns 400                           |
|                              | `test_cancel_completed`                           | Cancelling completed reservation returns 400           |
|                              | `test_cancel_not_found`                           | Nonexistent reservation returns 404                    |
| **TestListUserReservations** | `test_list_user_reservations`                     | All reservations for a user returned                   |
|                              | `test_list_user_reservations_empty`               | User with no reservations returns empty list           |
|                              | `test_list_user_reservations_user_not_found`      | Nonexistent user returns 404                           |
| **TestListRoomReservations** | `test_list_room_reservations`                     | All reservations for a room returned                   |
|                              | `test_list_room_reservations_empty`               | Room with no reservations returns empty list           |
|                              | `test_list_room_reservations_room_inactive`       | Inactive room returns 404                              |

## Integration Tests (`integration/`)

HTTP-layer tests using FastAPI TestClient. Each test verifies status codes, response shapes, and serialization for happy-path flows. Business rules, edge cases, and error paths are covered by unit tests instead.

### `integration/test_users_api.py`

| Class                | Test                        | What it verifies                        |
| -------------------- | --------------------------- | --------------------------------------- |
| **TestCreateUser**   | `test_create_user`          | POST /users/ returns 201 with full body |
| **TestGetUser**      | `test_get_user`             | GET /users/{id} returns 200             |
| **TestListUsers**    | `test_list_users_paginated` | GET /users/ with skip/limit params      |
| **TestUpdateUser**   | `test_update_user`          | PUT /users/{id} partial update returns 200 |
| **TestDeleteUser**   | `test_delete_user`          | DELETE /users/{id} returns 204, GET confirms deletion |

### `integration/test_rooms_api.py`

| Class                | Test                           | What it verifies                        |
| -------------------- | ------------------------------ | --------------------------------------- |
| **TestCreateRoom**   | `test_create_room`             | POST /rooms/ returns 201 with full body |
| **TestGetRoom**      | `test_get_room`                | GET /rooms/{id} returns 200             |
| **TestListRooms**    | `test_list_rooms_returns_all`  | GET /rooms/ returns all rooms           |
|                      | `test_list_rooms_paginated`    | GET /rooms/ with skip/limit params      |
| **TestUpdateRoom**   | `test_update_room`             | PUT /rooms/{id} partial update returns 200 |
| **TestDeleteRoom**   | `test_delete_room`             | DELETE /rooms/{id} returns 204          |

### `integration/test_reservations_api.py`

| Class                         | Test                           | What it verifies                                  |
| ----------------------------- | ------------------------------ | ------------------------------------------------- |
| **TestCreateReservation**     | `test_create_reservation`      | POST /reservations/ returns 201 with full body    |
| **TestCancelReservation**     | `test_cancel_reservation`      | PATCH /reservations/{id}/cancel with 200 + status |
| **TestListUserReservations**  | `test_list_user_reservations`  | GET /reservations/user/{id} returns all           |
| **TestListRoomReservations**  | `test_list_room_reservations`  | GET /reservations/room/{id} returns all           |

## Schema Tests (`schemas/`)

Pure validation tests — no database required. Each class validates Pydantic field validators.

### `schemas/test_user_schemas.py`

| Class                | Test                                        | What it verifies                                    |
| -------------------- | ------------------------------------------- | --------------------------------------------------- |
| **TestUserCreate**   | `test_valid_minimal`                        | Name and email accepted, phone defaults to None      |
|                      | `test_valid_with_phone`                     | Phone with special chars (+55 format) accepted       |
|                      | `test_valid_phone_simple_digits`            | Phone with plain digits accepted                     |
|                      | `test_trailing_whitespace_stripped`         | Name whitespace stripped on creation                 |
|                      | `test_name_empty_raises`                    | Empty name raises ValidationError                    |
|                      | `test_name_whitespace_only_raises`          | Whitespace-only name raises ValidationError          |
|                      | `test_name_too_long_raises`                 | Name > 100 chars raises ValidationError              |
|                      | `test_name_max_length_allowed`              | Name = 100 chars is accepted                         |
|                      | `test_phone_invalid_format_raises`          | Phone with letters raises ValidationError            |
|                      | `test_phone_too_short_raises`               | Phone < 7 chars raises ValidationError               |
|                      | `test_phone_too_long_raises`                | Phone > 20 chars raises ValidationError              |
|                      | `test_phone_none_allowed`                   | Explicit None phone accepted                         |
| **TestUserUpdate**   | `test_valid_partial_name`                   | Only name updated, other fields remain None          |
|                      | `test_valid_partial_email`                  | Only email updated                                   |
|                      | `test_valid_partial_phone`                  | Only phone updated                                   |
|                      | `test_valid_all_fields`                     | All optional fields provided at once                 |
|                      | `test_name_trailing_whitespace_stripped`    | Name whitespace stripped on update                   |
|                      | `test_name_empty_raises`                    | Empty name on update raises                          |
|                      | `test_name_too_long_raises`                 | Name > 100 chars on update raises                    |
|                      | `test_phone_too_short_raises`               | Phone < 7 chars on update raises                     |

### `schemas/test_room_schemas.py`

| Class                | Test                                        | What it verifies                                    |
| -------------------- | ------------------------------------------- | --------------------------------------------------- |
| **TestRoomCreate**   | `test_valid_minimal`                        | Name, capacity, price accepted; description None     |
|                      | `test_valid_with_description`               | Description stored when provided                     |
|                      | `test_trailing_whitespace_stripped`         | Name whitespace stripped                             |
|                      | `test_name_empty_raises`                    | Empty name raises ValidationError                    |
|                      | `test_name_whitespace_only_raises`          | Whitespace-only name raises                          |
|                      | `test_name_too_long_raises`                 | Name > 50 chars raises                               |
|                      | `test_name_max_length_allowed`              | Name = 50 chars accepted                             |
|                      | `test_capacity_zero_raises`                 | Capacity = 0 raises                                  |
|                      | `test_capacity_negative_raises`             | Capacity = -1 raises                                 |
|                      | `test_price_zero_raises`                    | Price = 0 raises                                     |
|                      | `test_price_negative_raises`                | Price = -1 raises                                    |
|                      | `test_description_too_long_raises`          | Description > 500 chars raises                       |
|                      | `test_description_max_length_allowed`       | Description = 500 chars accepted                     |
| **TestRoomUpdate**   | `test_valid_partial_name`                   | Only name updated                                    |
|                      | `test_valid_partial_capacity`               | Only capacity updated                                |
|                      | `test_valid_partial_price`                  | Only price updated                                   |
|                      | `test_valid_all_fields`                     | All optional fields at once                          |
|                      | `test_name_empty_raises`                    | Empty name on update raises                          |
|                      | `test_name_too_long_raises`                 | Name > 50 chars on update raises                     |
|                      | `test_capacity_zero_raises`                 | Capacity = 0 on update raises                        |
|                      | `test_capacity_negative_raises`             | Capacity = -1 on update raises                       |
|                      | `test_price_zero_raises`                    | Price = 0 on update raises                           |
|                      | `test_price_negative_raises`                | Price = -1 on update raises                          |
|                      | `test_description_too_long_raises`          | Description > 500 chars on update raises             |

### `schemas/test_reservation_schemas.py`

| Class                        | Test                          | What it verifies                                |
| ---------------------------- | ----------------------------- | ----------------------------------------------- |
| **TestReservationCreate**    | `test_valid`                  | Valid check_in/check_out accepted                |
|                              | `test_check_in_today_allowed` | check_in = today is accepted                     |
|                              | `test_check_in_past_raises`   | check_in before today raises ValidationError     |
|                              | `test_check_out_equal_check_in_raises` | check_out == check_in raises         |
|                              | `test_check_out_before_check_in_raises` | check_out before check_in raises     |

## Config Tests (`config/`)

Configuration module tests — uses `unittest.mock.patch` to control environment variables without a `.env` file. No database required.

### `config/test_config.py`

| Class           | Test                   | What it verifies                                 |
| --------------- | ---------------------- | ------------------------------------------------ |
| **TestConfig**  | `test_defaults`        | All constants fall back to expected defaults      |
|                 | `test_custom_values`   | Env vars override all defaults (DB_PORT as int)  |
|                 | `test_partial_override` | Single env var leaves others at default          |
|                 | `test_port_is_int`     | DB_PORT is coerced to int                        |
|                 | `test_dotenv_loaded`   | load_dotenv called with correct path & override  |

## Model Tests (`models/`)

ORM model tests — validates defaults, constraints, cascades, and enum values. Requires an in-memory SQLite database (shared `db_session` fixture).

### `models/test_models.py`

| Class                      | Test                                        | What it verifies                                    |
| -------------------------- | ------------------------------------------- | --------------------------------------------------- |
| **TestReservationStatus**  | `test_enum_values`                          | Enum members have correct values                    |
|                            | `test_is_str_enum`                          | ReservationStatus is a str subclass                 |
|                            | `test_all_members_covered`                  | All 3 expected members present                      |
| **TestRoomDefaults**       | `test_is_active_defaults_to_true`           | Room.is_active default at ORM level                 |
| **TestReservationDefaults** | `test_status_defaults_to_confirmed`        | Reservation.status default = CONFIRMED              |
| **TestUserUniqueEmail**    | `test_duplicate_email_raises`               | DB-level IntegrityError on duplicate email           |
| **TestRoomUniqueName**     | `test_duplicate_name_raises`                | DB-level IntegrityError on duplicate room name      |
| **TestUserCascadeDelete**  | `test_delete_user_cascades_to_reservations` | Deleting user cascades to reservations              |
| **TestRoomCascadeDelete**  | `test_delete_room_cascades_to_reservations` | Deleting room cascades to reservations              |

## Performance & Load Tests (`performance/load/`)

Load tests are **k6** scripts (not pytest). They target a running server and are designed to explore the app's concurrency limits — specifically the SQLAlchemy connection pool (`pool_size=5`, `max_overflow=10`, i.e. 15 connections) behind the 40-thread anyio pool used for sync endpoints (see README "Known limitations").

### How to run

Requires [k6](https://k6.io/docs/getting-started/installation/) installed (it is not a Python dependency). The server must be running first (e.g. `uv run uvicorn api.main:app`).

```bash
# Default profile (load)
k6 run tests/performance/load/users/get_users.js

# Get a user by id (id derived from __VU last digit, 0 -> 10)
k6 run tests/performance/load/users/get_user_by_id.js

# Update a user by id (id derived from __VU last digit, 0 -> 10)
k6 run tests/performance/load/users/put_user_by_id.js

# Delete users from a pool created via the /seed/users route in setup()
k6 run tests/performance/load/users/delete_user.js

# Override the delete seed pool size (otherwise computed from the profile)
k6 run tests/performance/load/users/delete_user.js -e K6_DELETE_POOL_SIZE=5000

# Pick a profile and target
k6 run tests/performance/load/users/post_users.js \
  -e K6_SCENARIO=staircase \
  -e BASE_URL=http://localhost:8000

# Soak with a custom hold duration
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_SOAK_DURATION=15m

# Export results for analysis
k6 run tests/performance/load/users/get_users.js --out json=results.json
```

Rooms overload every `users` counterpart with a `rooms/` folder:

```bash
# Create rooms (name includes RUN_ID to stay unique)
k6 run tests/performance/load/rooms/post_rooms.js

# List rooms (seeds 1 room in setup() if the list is empty)
k6 run tests/performance/load/rooms/get_rooms.js

# Get a room by id (id derived from __VU last digit, 0 -> 10)
k6 run tests/performance/load/rooms/get_room_by_id.js

# Update a room by id (id derived from __VU last digit, 0 -> 10)
k6 run tests/performance/load/rooms/put_room_by_id.js

# Delete rooms (seeds a soft-delete pool via POST /seed/rooms in setup())
k6 run tests/performance/load/rooms/delete_room.js
```

Reservations live under `tests/performance/load/reservations/`:

```bash
# Create reservations (unique future date windows per iteration to avoid 409s)
k6 run tests/performance/load/reservations/post_reservations.js

# List a user's reservations (seeds ≥10 users + 1 reservation each in setup())
k6 run tests/performance/load/reservations/get_user_reservations.js

# List a room's reservations (seeds ≥10 rooms + 1 reservation each in setup())
k6 run tests/performance/load/reservations/get_room_reservations.js

# Cancel reservations from a pool created via POST /seed/reservations in setup()
k6 run tests/performance/load/reservations/cancel_reservation.js
```

The scripts share the `randomIntBetween` helper from `tests/performance/load/helpers.js`; the delete/cancel tests additionally use `tests/performance/load/delete_helpers.js` (`resolveSeedKey`, `parseDuration`, `computePoolConfig`). All profiles are centralized in `tests/performance/helpers/scenarios.js` so every route test runs identical load shapes.

### Profiles

| Profile     | Executor      | Load (VUs)                     | Purpose                                 |
| ----------- | ------------- | ------------------------------ | --------------------------------------- |
| `smoke`     | constant-vus  | 3, 30s                         | Sanity check that the script works      |
| `load`      | ramping-vus   | ramp to 5, hold 30, ramp to 0   | Baseline under typical load             |
| `staircase` | ramping-vus   | 5,10,15,20,25,30,40,50 (45s ea)| Find the concurrency knee               |
| `soak`      | ramping-vus   | ramp to 40, hold 10m (default) | Detect connection growth / leaks        |
| `spike`     | ramping-vus   | 0 → 200 (15s), hold 200 (1m)   | Expose pool exhaustion sharply          |

Select with `-e K6_SCENARIO=<name>`. The `staircase` profile holds each step ~45s so percentile metrics are stable.

Use `-e K6_SCENARIO=all` to run every profile at once (all five run in parallel). This is an escape hatch for a single combined run: because `spike` deliberately overwhelms the 15-connection pool, an `all` run will report threshold breaches (thresholds use `abortOnFail: false`, so they are recorded, not aborted). Destructive/cancel tests size their seed pool from the summed concurrency of all active profiles.

### Delete-test seed pool — users

`delete_user.js` uses the same scenarios. Because `DELETE /users/{id}` permanently removes rows, `setup()` calls the dedicated **`POST /seed/users`** route (not the business `POST /users`) with a quantity derived from the scenario so the pool never drains mid-run (only the route under test is hit during load):

`quantity = maxVUs * (totalSeconds / AVG_ITER_SECONDS) * 1.2`, where `AVG_ITER_SECONDS = 1.0` (sleep is 500–1500ms, so real iterations are slightly slower — over-provisioning is the safe direction). The route bulk-inserts the users directly into Postgres and returns their ids; each VU is given a disjoint slice (`floor(poolSize / maxVUs)`) so no two VUs target the same id (no 404 races). Override with `-e K6_DELETE_POOL_SIZE=<n>`. Expect large seed counts on `soak`/`staircase` (e.g. ~7.9k on `load`, ~22k on `staircase`, ~33k on `soak`).

`setupTimeout` is set to `10m` (default is 60s) so seeding large pools doesn't abort before VUs start.

The seed route is authenticated: requests must send the `X-Seed-Key` header matching `SEED_API_KEY` from the project `.env`. k6 reads the key from `../../../../.env` (relative to the script under `users/`) automatically, or you can override it with `-e SEED_API_KEY=<value>`.

The load-test routes are only registered when `ENABLE_LOADTEST_ENDPOINTS=true` in `.env` (defaults to off/false when unset), so they are never exposed unless explicitly enabled.

### Delete-test seed pool — rooms

`delete_room.js` uses the same scenarios as `delete_user.js`. `setup()` calls the dedicated **`POST /seed/rooms`** route (not the business `POST /rooms`) with the same pool formula (`quantity = maxVUs * (totalSeconds / AVG_ITER_SECONDS) * 1.2`), bulk-inserting the rooms directly into Postgres and returning their ids. Each VU is given a disjoint slice (`floor(poolSize / maxVUs)`) so no two VUs target the same id.

Because `DELETE /rooms/{id}` is a **soft-delete** (sets `is_active=false`, row stays, re-deletes still return 204), the pool never 404s even if an id is deleted twice. `setupTimeout` is `10m`. Override the pool with `-e K6_DELETE_POOL_SIZE=<n>`. The `/seed/rooms` route is authenticated with the `X-Seed-Key` header, read from `../../../../.env` (relative to the script under `rooms/`) or overridable with `-e SEED_API_KEY=<value>`, and is only registered when `ENABLE_LOADTEST_ENDPOINTS=true`.

### Cancel-test seed pool — reservations

`cancel_reservation.js` uses the same scenarios. Because `PATCH /reservations/{id}/cancel` works only once per reservation (a second call returns **400**), `setup()` calls the dedicated **`POST /seed/reservations`** route with a quantity from the same pool formula as the delete tests (`quantity = maxVUs * (totalSeconds / AVG_ITER_SECONDS) * 1.2`). Each VU is given a disjoint slice (`floor(poolSize / maxVUs)`) so no two VUs cancel the same id. Override with `-e K6_DELETE_POOL_SIZE=<n>`. `setupTimeout` is `10m`.

`POST /seed/reservations` is authenticated with `X-Seed-Key` (read from `../../../../.env` or `-e SEED_API_KEY=<value>`) and only registered when `ENABLE_LOADTEST_ENDPOINTS=true`. Seeding generates its own user + room pools (100 each) plus `quantity` **confirmed** reservations with per-room non-overlapping dates, so it never trips the `no_overlap` GiST exclusion constraint (confirmed reservations on the same room must not have overlapping date ranges — see the schema note below).

### Reservations create test — avoiding 409 collisions

`POST /reservations/` is guarded by the `no_overlap` exclusion constraint: two confirmed reservations on the same room with overlapping dates conflict (the route returns **409** from either the overlap query or an `IntegrityError`). Because 4xx responses fail the `http_req_failed < 1%` threshold, `post_reservations.js` writes each iteration with a **globally unique date window** so they never overlap: `offset = __ITER * maxVus + (__VU - 1)`, `check_in = today + offset`, `check_out = check_in + 1`. Every POST therefore returns `201`. `setup()` seeds a single active user + room (via the business `POST /users`/`POST /rooms` or reuses existing rows).

### Thresholds

All three thresholds use `abortOnFail: false` so the test **records** saturation instead of stopping at it:

- `http_req_failed`: `rate < 0.01`
- `http_req_duration`: `p(95) < 500`
- `http_req_waiting`: `p(95) < 500` — time-to-first-byte, the metric that exposes DB-pool queueing

### How to read the knee

When concurrency exceeds the pool/threadpool capacity, requests queue inside the app before hitting the DB. Symptoms:

1. `http_req_waiting` (TTFB) p95 breaks the 500ms threshold while `http_req_blocked` stays near 0 (keep-alive; the wait is server-side, not network).
2. Throughput (`http_reqs`/RPS) plateaus even as VUs increase.
3. At the extreme, requests exceed `pool_timeout` (30s default) and return 500s; the console log shows `TimeoutError` / `OperationalError` in the response body — the pool-exhaustion signature.

Expected knee: somewhere in the 15–40 VU range for this app (pool = 15 connections, threadpool = 40).

### Correlating with the DB (optional)

k6 shows the symptom; confirm the cause during a run by polling Postgres:

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'performancelab';
```

Connections capping at 15 while latency climbs = pool contention (not the threadpool).
