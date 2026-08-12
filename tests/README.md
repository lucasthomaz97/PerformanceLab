# Unit & Integration Tests

[**English**](#english) &nbsp;|&nbsp; [**Português**](#português-pt-br)

---

## English

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
├── performance/         # k6 load tests (not pytest) - see "Performance & Load Tests"
│   ├── helpers/
│   │   ├── config.js               # BASE_URL, RUN_ID, SCENARIO, DAY_MS, isoDateFromOffset
│   │   ├── general_helpers.js         # randomIntBetween shared helper
│   │   ├── pool_helpers.js  # parseDuration, computePoolConfig, computePerVuConfig, computeSliceLayout, byIdSeedCount (seed-pool + by-id sizing)
│   │   ├── options_helpers.js         # loadOptions() + env-tunable thresholds
│   │   ├── request_helpers.js         # HTTP verb wrappers, logFailure, parseBody, sleepBetween, checkListFields
│   │   ├── scenarios_helpers.js       # shared smoke/load/staircase/soak/spike/average_load/stress/breakpoint profiles
│   │   └── seed_helpers.js     # seed API route (seedViaRoute, seedById, seedPool, resolveSeedKey) + business-route seeders (ensureOneIfEmpty, ensureRows, seedReservationGraph)
│   └── load/
│       ├── users/             # one k6 script per HTTP operation
│       ├── rooms/
│       └── reservations/
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

Requires [k6](https://k6.io/docs/getting-started/installation/) installed (it is not a Python dependency). The server must be running first — start it with a keep-alive timeout above the longest paced sleep, otherwise the server closes idle keep-alive connections mid-run and the paced delete/put tests see `EOF` errors:

```bash
uv run uvicorn api.main:app --reload --timeout-keep-alive 30
```

Every load script also sets `noConnectionReuse: true` (`loadOptions`), so k6 never reuses a keep-alive connection the server may have closed — a defensive guard against the same `EOF` class of errors regardless of server flags.

Run any script as-is to use its default `load` profile:

```bash
# users
k6 run tests/performance/load/users/post_users.js
k6 run tests/performance/load/users/get_users.js                 # list (seeds 1 row if the list is empty)
k6 run tests/performance/load/users/get_user_by_id.js            # get (id picked from a pool sized to the scenario's max VUs)
k6 run tests/performance/load/users/put_user_by_id.js            # update (id picked from a pool sized to the scenario's max VUs)
k6 run tests/performance/load/users/delete_user.js               # delete from a pool created via POST /seed/users in setup()

# rooms (same operations, under rooms/)
k6 run tests/performance/load/rooms/post_rooms.js
k6 run tests/performance/load/rooms/get_rooms.js                 # list (seeds 1 row if the list is empty)
k6 run tests/performance/load/rooms/get_room_by_id.js            # get (id picked from a pool sized to the scenario's max VUs)
k6 run tests/performance/load/rooms/put_room_by_id.js            # update (id picked from a pool sized to the scenario's max VUs)
k6 run tests/performance/load/rooms/delete_room.js               # soft-delete from a pool created via POST /seed/rooms in setup()

# reservations
k6 run tests/performance/load/reservations/post_reservations.js  # create (unique future date windows per iteration to avoid 409s)
k6 run tests/performance/load/reservations/get_user_reservations.js  # list a user's reservations (seeds >=10 users + 1 each)
k6 run tests/performance/load/reservations/get_room_reservations.js  # list a room's reservations (seeds >=10 rooms + 1 each)
k6 run tests/performance/load/reservations/cancel_reservation.js  # cancel from a pool created via POST /seed/reservations in setup()
```

Every script follows the same shape — `k6 run <script> [options]`. All parameters are optional and can be combined:

| Parameter | Purpose | Example |
| --------- | ------- | ------- |
| `-e K6_SCENARIO=<name>` | Load profile: `smoke`, `load`, `staircase`, `soak`, `spike`, `average_load`, `stress`, `breakpoint`, or `all` | `-e K6_SCENARIO=staircase` |
| `-e BASE_URL=<url>` | Target a different server | `-e BASE_URL=http://localhost:8000` |
| `-e K6_SOAK_DURATION=<d>` | Hold time for the `soak` profile | `-e K6_SOAK_DURATION=15m` |
| `-e K6_AVG_LOAD_DURATION=<d>` | Hold time for the `average_load` profile | `-e K6_AVG_LOAD_DURATION=30m` |
| `-e K6_DELETE_POOL_SIZE=<n>` | Override the delete/cancel seed pool (otherwise computed from the profile) | `-e K6_DELETE_POOL_SIZE=5000` |
| `-e K6_PACING_ROOMS=<f>` | Multiply the inter-iteration sleep (normally 500–1500ms) for room delete/put tests (default 5) | `-e K6_PACING_ROOMS=2` |
| `-e K6_PACING_USERS=<f>` | Multiply the inter-iteration sleep for user delete/put tests (default 2.5) | `-e K6_PACING_USERS=1` |
| `-e K6_PACING_RESERVATIONS=<f>` | Multiply the inter-iteration sleep for reservation cancel tests (default 1) | `-e K6_PACING_RESERVATIONS=0.5` |
| `-e K6_POOL_SAFETY=<f>` | Over-provisioning factor for delete/cancel seed pools (default 1.2) | `-e K6_POOL_SAFETY=1.5` |
| `-e K6_SEED_POOL_WARN=<n>` | Warn when a delete/cancel seed pool exceeds this row count (default 75000) | `-e K6_SEED_POOL_WARN=50000` |
| `-e K6_SEED_POOL_MAX=<n>` | Abort when a delete/cancel seed pool exceeds this row count (default 150000) | `-e K6_SEED_POOL_MAX=100000` |
| `-e SEED_API_KEY=<key>` | Override the seed-route auth key (default read from `.env`) | `-e SEED_API_KEY=<value>` |
| `-e K6_P95_MS=<n>` | Relax the p95 latency threshold | `-e K6_P95_MS=1000` |
| `-e K6_ERROR_RATE=<f>` | Relax the error-rate threshold | `-e K6_ERROR_RATE=0.05` |
| `-e K6_FAILURE_LOG_LIMIT=<n>` | Log the body of only the first N failed responses (default 20) | `-e K6_FAILURE_LOG_LIMIT=50` |
| `--out json=<file>` | Export results for analysis | `--out json=results.json` |
| `--vus <n> --duration <d>` | Quick ad-hoc run (overrides the scenario config) | `--vus 1 --duration 1s` |

Combined examples:

```bash
# Pick a profile and a target server
k6 run tests/performance/load/users/post_users.js -e K6_SCENARIO=staircase -e BASE_URL=http://localhost:8000

# Soak with a custom hold duration
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_SOAK_DURATION=15m

# Relaxed thresholds for a slow CI box
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_P95_MS=1000 -e K6_ERROR_RATE=0.05

# One-second sanity check (overrides the load profile)
k6 run --vus 1 --duration 1s tests/performance/load/users/delete_user.js

# Export results for analysis
k6 run tests/performance/load/users/get_users.js --out json=results.json
```

The scripts share the helpers in `tests/performance/helpers/`:

- `general_helpers.js` — `randomIntBetween`
- `request_helpers.js` — `postJson`/`putJson`/`patchJson`/`getJson`/`delJson` (embed the `Content-Type` header), `logFailure`, `parseBody`, `sleepBetween`, `pacedSleep(kind)`, `nextIdFromVus`, `checkListFields`
- `config.js` — `BASE_URL`, `RUN_ID`, `SCENARIO`, `DAY_MS` and `isoDateFromOffset(offsetDays)` (shared per-file preamble)
- `options_helpers.js` — `loadOptions({ setupTimeout })` builds the scenarios + thresholds block every script used to repeat; thresholds are env-tunable (see [Thresholds](#thresholds)); also sets `noConnectionReuse: true` so k6 never reuses a keep-alive connection the server may have closed (avoids `EOF` on the paced delete/put tests)
- `seed_helpers.js` — encapsulates the internal seed API (`seedViaRoute`, `seedById`, `sliceForVus`, `seedPool`, `resolveSeedKey`); the delete/cancel tests' `setup()` is just `return seedPool('rooms' | 'users' | 'reservations')`, and the put-by-id tests seed with `seedById(kind, count)` (fresh rows via `/seed/{kind}`, returning the actual inserted ids). Also provides business-route seeders for the read tests: `ensureOneIfEmpty(kind)` (get_rooms/get_users), `ensureRows(kind, count, prefix)` (get_*_by_id), and `seedReservationGraph(kind, count)` (get_user_reservations/get_room_reservations)
- `pool_helpers.js` — `parseDuration`, `computePoolConfig`, `computePerVuConfig`, `computeSliceLayout`, `byIdSeedCount`, `pacingFactor(kind)`, `guardSeedPoolSize` (seed-pool + by-id sizing, per-entity pacing, and the delete/cancel pool guard)
- `scenarios_helpers.js` — all profiles are centralized so every route test runs identical load shapes

### Profiles

| Profile     | Executor      | Load (VUs)                     | Purpose                                 |
| ----------- | ------------- | ------------------------------ | --------------------------------------- |
| `smoke`     | constant-vus  | 3, 30s                         | Sanity check that the script works      |
| `load`      | ramping-vus   | ramp to 5, hold 30, ramp to 0   | Baseline under typical load             |
| `average_load` | ramping-vus | ramp to 20, hold 10m (default), ramp to 0 | Sustained typical/expected traffic |
| `stress`    | ramping-vus   | 40→80→120→160 (1m ramp + 2m hold each), ramp to 0 | Escalate beyond the knee to find the degradation point |
| `staircase` | ramping-vus   | 5,10,15,20,25,30,40,50 (45s ea)| Find the concurrency knee               |
| `soak`      | ramping-vus   | ramp to 40, hold 10m (default) | Detect connection growth / leaks        |
| `spike`     | ramping-vus   | 0 → 200 (15s), hold 200 (1m)   | Expose pool exhaustion sharply          |
| `breakpoint`| ramping-vus   | steps 50 → 100 → 150 → 200 (2m each)  | Keep increasing until the system fails |

Select with `-e K6_SCENARIO=<name>`. The `staircase` profile holds each step ~45s so percentile metrics are stable.

> **Why the VU levels look low:** this is a study/portfolio project running against a local API on a single machine. The profile values are intentionally small so a run stays feasible on local hardware while still crossing the app's real saturation point (the 15-connection pool / 40-thread pool). Treat them as starting points — raise them (or use the env vars above) to match a real, larger deployment.

Use `-e K6_SCENARIO=all` to run every profile at once (all eight run in parallel). This is an escape hatch for a single combined run: because `spike`, `stress` and `breakpoint` deliberately overwhelm the 15-connection pool, an `all` run will report threshold breaches (thresholds use `abortOnFail: false`, so they are recorded, not aborted). Delete/cancel tests size their seed pool from the *scheduled requests* of all active profiles — each VU reserves rows for its own scheduled active window (not peak concurrency), so the combined pool stays lean.

### Delete/cancel seed pool: sizing & guard

`delete_user.js`, `delete_room.js` and `cancel_reservation.js` size their pools with `seedPool(kind)` so the pool never drains mid-run (only the route under test is hit during load). The estimator models **scheduled requests per VU**, not peak concurrency:

`poolSize = Σ over VUs ( ceil( activeTime_i / pacingSeconds × K6_POOL_SAFETY ) + 1 )`

- `activeTime_i` is VU `i`'s scheduled active window in the ramp profile. k6 starts VUs in order (index 0 first) and stops the last-started first, so the earliest VUs run the whole scenario while the last ones run only seconds. Each VU's window is derived from the profile's ramp crossings (`computePerVuConfig`).
- The `+ 1` reserves the in-flight iteration each VU may finish during `gracefulRampDown`.
- `pacingSeconds` is the entity pacing factor — the inter-iteration **think time**. Sleeps stay random (`500–1500ms`) but are multiplied by the entity factor, so a realistic longer wait also shrinks the pool: the pool only reserves what the run will actually consume.
- `sliceForVus` hands each VU a **disjoint slice sized to its own window** (`computeSliceLayout`) instead of an equal split, so a naive `floor(poolSize / maxVUs)` distribution can never strand the long-running VUs that ramping profiles start first.

Only the **delete/cancel/put** scripts are paced (`pacedSleep`) for realism; get/post tests keep the fast 500–1500ms sleep. Put pools stay small (`byIdSeedCount`, maxVUs-based), so pacing only changes their rhythm.

| Entity | Factor (default) | Sleep range | Realism | Expected pool — load / staircase / soak / stress / breakpoint / all |
| --- | --- | --- | --- | --- |
| Rooms | `K6_PACING_ROOMS` = 5 | 2.5–7.5s | rooms change rarely | 1.2k / 2.0k / 6.2k / 17.3k / 11.6k / 45.5k |
| Users | `K6_PACING_USERS` = 2.5 | 1.25–3.75s | more frequent than rooms | 2.4k / 4.0k / 12.4k / 34.6k / 23.1k / 91.0k |
| Reservations | `K6_PACING_RESERVATIONS` = 1 | 0.5–1.5s | most stressful, baseline | 5.9k / 10.1k / 31.0k / 86.6k / 57.8k / 227.4k |

**Guard.** `guardSeedPoolSize` runs inside `seedPool`: if the computed pool exceeds `K6_SEED_POOL_WARN` (default `75000`) it logs a warning; above `K6_SEED_POOL_MAX` (default `150000`) it aborts `setup()` with guidance (milder profile, `-e K6_DELETE_POOL_SIZE=<n>`, raise `K6_SEED_POOL_*`, or raise the `K6_PACING_*` factor). At defaults: reservations `stress` (86.6k) warns and reservations `all` (227.4k) aborts; rooms/users never trip. An explicit `-e K6_DELETE_POOL_SIZE=<n>` bypasses the guard. If an override is smaller than `maxVUs`, `sliceForVus` aborts with `pool size X < maxVus Y`.

### Delete-test seed pool — users

`delete_user.js` uses the same scenarios. Because `DELETE /users/{id}` permanently removes rows, `setup()` calls the dedicated **`POST /seed/users`** route (not the business `POST /users`) with the shared estimator + entity pacing (see *Delete/cancel seed pool: sizing & guard*). For users the default `K6_PACING_USERS=2.5` yields ~35k rows on `stress` and ~91k on `all`. The route bulk-inserts the users directly into Postgres and returns their ids; each VU is given a disjoint slice sized to its own scheduled active window (see *Delete/cancel seed pool: sizing & guard*), so no two VUs target the same id and none runs out mid-run (no 404 races). Override the computed size with `-e K6_DELETE_POOL_SIZE=<n>`.

`setupTimeout` is set to `10m` (default is 60s) so seeding large pools doesn't abort before VUs start.

The seed route is authenticated: requests must send the `X-Seed-Key` header matching `SEED_API_KEY` from the project `.env`. k6 reads the key from `../../../../.env` (relative to the script under `users/`) automatically, or you can override it with `-e SEED_API_KEY=<value>`.

The load-test routes are only registered when `ENABLE_LOADTEST_ENDPOINTS=true` in `.env` (defaults to off/false when unset), so they are never exposed unless explicitly enabled.

### Delete-test seed pool — rooms

`delete_room.js` uses the same scenarios as `delete_user.js`. `setup()` calls the dedicated **`POST /seed/rooms`** route (not the business `POST /rooms`) with the shared estimator + entity pacing (see *Delete/cancel seed pool: sizing & guard*) — rooms are the slowest-paced (`K6_PACING_ROOMS=5`), so they seed the fewest rows (~17k on `stress`, ~45k on `all`). The route bulk-inserts the rooms directly into Postgres and returns their ids. Each VU is given a disjoint slice sized to its own scheduled active window (see *Delete/cancel seed pool: sizing & guard*), so no two VUs target the same id.

Because `DELETE /rooms/{id}` is a **soft-delete** (sets `is_active=false`, row stays, re-deletes still return 204), the pool never 404s even if an id is deleted twice. `setupTimeout` is `10m`. Override the pool with `-e K6_DELETE_POOL_SIZE=<n>`. The `/seed/rooms` route is authenticated with the `X-Seed-Key` header, read from `../../../../.env` (relative to the script under `rooms/`) or overridable with `-e SEED_API_KEY=<value>`, and is only registered when `ENABLE_LOADTEST_ENDPOINTS=true`.

### Cancel-test seed pool — reservations

`cancel_reservation.js` uses the same scenarios. Because `PATCH /reservations/{id}/cancel` works only once per reservation (a second call returns **400**), `setup()` calls the dedicated **`POST /seed/reservations`** route with the shared estimator + entity pacing (see *Delete/cancel seed pool: sizing & guard*) — reservations have the fastest pacing (`K6_PACING_RESERVATIONS=1`), so they seed the most rows (~87k on `stress`; `all` hits the guard at ~227k). Each VU is given a disjoint slice sized to its own scheduled active window (see *Delete/cancel seed pool: sizing & guard*), so no two VUs cancel the same id and none runs out mid-run. Override with `-e K6_DELETE_POOL_SIZE=<n>`. `setupTimeout` is `10m`.

`POST /seed/reservations` is authenticated with `X-Seed-Key` (read from `../../../../.env` or `-e SEED_API_KEY=<value>`) and only registered when `ENABLE_LOADTEST_ENDPOINTS=true`. Seeding generates its own user + room pools (100 each) plus `quantity` **confirmed** reservations with per-room non-overlapping dates, so it never trips the `no_overlap` GiST exclusion constraint (confirmed reservations on the same room must not have overlapping date ranges — see the schema note below).

### Reservations create test — avoiding 409 collisions

`POST /reservations/` is guarded by the `no_overlap` exclusion constraint: two confirmed reservations on the same room with overlapping dates conflict (the route returns **409** from either the overlap query or an `IntegrityError`). Because 4xx responses fail the `http_req_failed < 1%` threshold, `post_reservations.js` writes each iteration with a **globally unique date window** so they never overlap: `offset = __ITER * maxVus + (__VU - 1)`, `check_in = today + offset`, `check_out = check_in + 1`. Every POST therefore returns `201`. `setup()` reuses the first existing user (a user may hold many reservations) but **always creates a fresh room** (unique name) so leftover confirmed reservations from previous runs can never collide with the new run's windows.

### Thresholds

All three thresholds use `abortOnFail: false` so the test **records** saturation instead of stopping at it:

- `http_req_failed`: `rate < 0.01`
- `http_req_duration`: `p(95) < 500`
- `http_req_waiting`: `p(95) < 500` — time-to-first-byte, the metric that exposes DB-pool queueing

Thresholds are scoped with the `kind:load` tag, so they evaluate only the requests hitting the route under test. Setup/seed requests (`kind:seed`, e.g. the bulk `POST /seed/{kind}` pool insert) are excluded — otherwise the one-shot seed latency would dominate `p(95)` on short runs (e.g. `k6 run --vus 1 --duration 1s delete_user.js`).

Thresholds are centralized in `helpers/options_helpers.js` (`loadOptions()`) and can be relaxed per run without editing files — e.g. a soak on a slow CI box:

```bash
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_P95_MS=1000 -e K6_ERROR_RATE=0.05
```

### Test-ordering caveat

`delete_user.js` permanently removes users, and `delete_room.js` soft-deletes rooms (hidden from `GET /rooms`). The get-by-id tests (`get_user_by_id`, `get_room_by_id`) assume the first `max(10, maxVUs)` ids exist — the pool scales with the active scenario — so running a delete/cancel test first will produce 404s and threshold breaches on later get-by-id runs. `put_user_by_id` / `put_room_by_id` are **not** affected: they seed fresh rows through `POST /seed/{kind}` and target the returned ids, so they work after any prior run. If the load-test DB is not disposable, reseed (or re-run a create/list test) before get-by-id runs.

### Performance tests in CI

A dedicated workflow (`.github/workflows/performance.yml`) guards the k6 scripts:

- **`validate`** runs on every push/PR to `master`: it installs k6 and runs `k6 inspect` over all the scripts in `tests/performance/load/**/*.js`. No server or DB needed — it only fails if a script stops parsing.
- **`smoke`** is manual/opt-in (`workflow_dispatch`): it boots the API against a Postgres service container, health-waits, then runs the `smoke` profile of `get_users.js`, `get_rooms.js`, `post_users.js`, `post_rooms.js` and `post_reservations.js`, failing on threshold breach. Optional `p95-ms` / `error-rate` inputs relax thresholds for slow runners.

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

---

## Português (PT-BR)

Testes unitários usam **pytest** com um banco SQLite em memória para testes de serviço, e Pydantic puro para testes de schema (nenhum banco externo é necessário).

Testes de integração usam o **FastAPI TestClient** (`httpx2`) com o mesmo SQLite em memória para validar a camada HTTP (códigos de status, formatos de resposta, propagação de erros).

### Estrutura

```
tests/
├── integration/         # Testes de integração dos routers (camada HTTP via TestClient)
│   ├── conftest.py      # Rótulos/fixtures do TestClient + override do get_db
│   ├── test_users_api.py
│   ├── test_rooms_api.py
│   └── test_reservations_api.py
├── performance/         # Testes de carga k6 (não pytest) - veja "Testes de Performance & Carga"
│   ├── helpers/
│   │   ├── config.js               # BASE_URL, RUN_ID, SCENARIO, DAY_MS, isoDateFromOffset
│   │   ├── general_helpers.js         # helper compartilhado randomIntBetween
│   │   ├── pool_helpers.js  # parseDuration, computePoolConfig, byIdSeedCount (dimensionamento do seed pool e dos testes por id)
│   │   ├── options_helpers.js         # loadOptions() + thresholds configuráveis via env
│   │   ├── request_helpers.js         # wrappers HTTP, logFailure, parseBody, sleepBetween, checkListFields
│   │   ├── scenarios_helpers.js       # perfils compartilhados smoke/load/staircase/soak/spike/average_load/stress/breakpoint
│   │   └── seed_helpers.js     # rota de seed (seedViaRoute, seedById, seedPool, resolveSeedKey) + seeders por rota de negócio (ensureOneIfEmpty, ensureRows, seedReservationGraph)
│   └── load/
│       ├── users/             # um script k6 por operação HTTP
│       ├── rooms/
│       └── reservations/
└── unit/                # Testes unitários (service/schema/model/config)
    ├── conftest.py      # Fixtures compartilhadas (engine, db_session, user, room, etc.)
    ├── config/          # Testes do módulo de configuração (env simulado, sem DB)
    │   └── test_config.py
    ├── models/          # Testes de modelos ORM (exigem DB)
    │   └── test_models.py
    ├── schemas/         # Testes de validação de schema (sem DB, Pydantic puro)
    │   ├── test_user_schemas.py
    │   ├── test_room_schemas.py
    │   └── test_reservation_schemas.py
    ├── services/        # Testes da camada de serviços (exigem DB)
    │   ├── test_user_service.py
    │   ├── test_room_service.py
    │   └── test_reservation_service.py
```

### Como executar

```bash
# Executar todos os testes (unitários + integração)
uv run pytest tests/ -v

# Executar apenas os testes unitários
uv run pytest tests/unit -v

# Executar apenas os testes de integração
uv run pytest tests/integration -v

# Executar apenas os testes de serviço
uv run pytest tests/unit/services -v

# Executar apenas os testes de schema
uv run pytest tests/unit/schemas -v

# Executar apenas os testes de configuração
uv run pytest tests/unit/config -v

# Executar apenas os testes de modelos
uv run pytest tests/unit/models -v

# Executar um arquivo específico
uv run pytest tests/unit/services/test_user_service.py -v

# Executar testes que correspondem a uma palavra-chave
uv run pytest tests/unit -k "overlap" -v
```

### Fixtures (`conftest.py`)

Fixtures compartilhadas descobertas automaticamente pelo pytest (disponíveis em todos os subdiretórios):

| Fixture          | Descrição                                             |
| ---------------- | ----------------------------------------------------- |
| `engine`         | Engine SQLite em memória                              |
| `db_session`     | Sessão com escopo por teste, com rollback após uso    |
| `user`           | Usuário pré-criado (Alice)                            |
| `second_user`    | Segundo usuário pré-criado (Bob)                      |
| `room`           | Sala pré-criada (101, 2 hóspedes)                     |
| `second_room`    | Segunda sala pré-criada (102, 4 hóspedes)             |

> Os testes de integração (`tests/integration/conftest.py`) fornecem uma fixture `client` (TestClient do FastAPI envolvendo uma nova instância do app) além das mesmas fixtures `user`, `second_user`, `room` e `second_room`.

### Testes de Serviço (`services/`)

### `services/test_user_service.py`

| Classe                | Teste                                         | O que verifica                                 |
| --------------------- | --------------------------------------------- | ---------------------------------------------- |
| **TestCreateUser**    | `test_create_user_success`                    | Criar usuário define id, nome e e-mail          |
|                       | `test_create_user_with_phone`                 | Telefone é armazenado quando informado          |
|                       | `test_create_user_duplicate_email`            | E-mail duplicado retorna 409                    |
| **TestGetUser**       | `test_get_user_success`                       | Buscar usuário existente funciona               |
|                       | `test_get_user_not_found`                     | Usuário inexistente retorna 404                 |
| **TestListUsers**     | `test_list_users_empty`                       | Sem usuários retorna lista vazia                |
|                       | `test_list_users_returns_all`                 | Múltiplos usuários todos retornados             |
|                       | `test_list_users_paginated`                   | Paginação skip/limit funciona                   |
| **TestUpdateUser**    | `test_update_user_name`                       | Nome pode ser atualizado isoladamente           |
|                       | `test_update_user_email`                      | E-mail pode ser atualizado isoladamente         |
|                       | `test_update_user_not_found`                  | Atualizar usuário inexistente retorna 404       |
|                       | `test_update_user_duplicate_email`            | Atualizar para e-mail existente retorna 409     |
| **TestDeleteUser**    | `test_delete_user_success`                    | Usuário é removido (get retorna 404)            |
|                       | `test_delete_user_not_found`                  | Excluir usuário inexistente retorna 404         |
|                       | `test_delete_user_with_active_reservations`   | Excluir usuário com reservas ativas retorna 409 |

### `services/test_room_service.py`

| Classe                | Teste                                                | O que verifica                                           |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| **TestCreateRoom**    | `test_create_room_success`                            | Criar sala define id, padrão `is_active=True`            |
|                       | `test_create_room_with_description`                   | Descrição é armazenada quando informada                  |
|                       | `test_create_room_duplicate_name`                     | Nome de sala duplicado retorna 409                       |
| **TestGetRoom**       | `test_get_room_success`                               | Buscar sala existente funciona                           |
|                       | `test_get_room_not_found`                             | Sala inexistente retorna 404                             |
| **TestListRooms**     | `test_list_rooms_empty`                               | Sem salas retorna lista vazia                            |
|                       | `test_list_rooms_basic`                               | Múltiplas salas ativas todas retornadas                  |
|                       | `test_list_rooms_excludes_inactive`                   | Salas com soft-delete ocultas por padrão                 |
|                       | `test_list_rooms_includes_inactive_when_requested`    | Definir `active_only=False` retorna todas as salas       |
| **TestUpdateRoom**    | `test_update_room_capacity`                           | Capacidade pode ser atualizada                          |
|                       | `test_update_room_name`                               | Nome pode ser atualizado                                 |
|                       | `test_update_room_not_found`                          | Atualizar sala inexistente retorna 404                   |
|                       | `test_update_room_duplicate_name`                     | Atualizar para nome existente retorna 409                |
| **TestDeleteRoom**    | `test_delete_room_soft_delete`                        | Desativação é um soft-delete (`is_active=False`)         |
|                       | `test_delete_room_not_found`                          | Excluir sala inexistente retorna 404                     |
|                       | `test_delete_room_with_active_reservations`           | Excluir sala com reservas ativas retorna 409             |

### `services/test_reservation_service.py`

| Classe                        | Teste                                              | O que verifica                                        |
| ----------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| **TestCreateReservation**     | `test_create_reservation_success`                  | Reserva é criada com status CONFIRMED                  |
|                               | `test_create_reservation_user_not_found`           | Usuário inexistente retorna 404                        |
|                               | `test_create_reservation_room_not_found`           | Sala inexistente retorna 404                           |
|                               | `test_create_reservation_room_inactive`            | Sala inativa retorna 404                               |
|                               | `test_create_overlap_inside`                        | Datas sobrepostas (dentro) bloqueadas com 409          |
|                               | `test_create_overlap_start_before`                  | Datas sobrepostas (início antes) bloqueadas            |
|                               | `test_create_overlap_ends_after`                    | Datas sobrepostas (fim depois) bloqueadas              |
|                               | `test_create_overlap_contains`                      | Datas sobrepostas (contém) bloqueadas                  |
|                               | `test_create_no_overlap_adjacent`                   | Check-out/check-in adjacentes permitidos               |
|                               | `test_create_no_overlap_separate`                   | Datas sem sobreposição permitidas                      |
|                               | `test_create_different_rooms_no_conflict`           | Mesmas datas, salas diferentes permitidas              |
| **TestCancelReservation**     | `test_cancel_confirmed_reservation`                 | Reserva confirmada cancelada (status CANCELLED)        |
|                               | `test_cancel_already_cancelled`                     | Cancelar duas vezes retorna 400                        |
|                               | `test_cancel_completed`                             | Cancelar reserva concluída retorna 400                 |
|                               | `test_cancel_not_found`                             | Reserva inexistente retorna 404                        |
| **TestListUserReservations**  | `test_list_user_reservations`                       | Todas as reservas de um usuário retornadas             |
|                               | `test_list_user_reservations_empty`                 | Usuário sem reservas retorna lista vazia               |
|                               | `test_list_user_reservations_user_not_found`        | Usuário inexistente retorna 404                        |
| **TestListRoomReservations**  | `test_list_room_reservations`                       | Todas as reservas de uma sala retornadas               |
|                               | `test_list_room_reservations_empty`                 | Sala sem reservas retorna lista vazia                  |
|                               | `test_list_room_reservations_room_inactive`         | Sala inativa retorna 404                               |

## Testes de Integração (`integration/`)

Testes da camada HTTP usando o TestClient do FastAPI. Cada teste verifica códigos de status, formatos de resposta e serialização em fluxos felizes. Regras de negócio, casos de borda e caminhos de erro são cobertos pelos testes unitários.

### `integration/test_users_api.py`

| Classe                | Teste                         | O que verifica                         |
| --------------------- | ----------------------------- | -------------------------------------- |
| **TestCreateUser**    | `test_create_user`            | POST /users/ retorna 201 com corpo completo |
| **TestGetUser**       | `test_get_user`               | GET /users/{id} retorna 200            |
| **TestListUsers**     | `test_list_users_paginated`   | GET /users/ com params skip/limit      |
| **TestUpdateUser**    | `test_update_user`            | PUT /users/{id} atualização parcial retorna 200 |
| **TestDeleteUser**    | `test_delete_user`            | DELETE /users/{id} retorna 204, GET confirma a exclusão |

### `integration/test_rooms_api.py`

| Classe                | Teste                            | O que verifica                         |
| --------------------- | -------------------------------- | -------------------------------------- |
| **TestCreateRoom**    | `test_create_room`               | POST /rooms/ retorna 201 com corpo completo |
| **TestGetRoom**       | `test_get_room`                  | GET /rooms/{id} retorna 200            |
| **TestListRooms**     | `test_list_rooms_returns_all`    | GET /rooms/ retorna todas as salas     |
|                       | `test_list_rooms_paginated`      | GET /rooms/ com params skip/limit      |
| **TestUpdateRoom**    | `test_update_room`               | PUT /rooms/{id} atualização parcial retorna 200 |
| **TestDeleteRoom**    | `test_delete_room`               | DELETE /rooms/{id} retorna 204         |

### `integration/test_reservations_api.py`

| Classe                         | Teste                            | O que verifica                                  |
| ------------------------------ | -------------------------------- | ----------------------------------------------- |
| **TestCreateReservation**      | `test_create_reservation`        | POST /reservations/ retorna 201 com corpo completo |
| **TestCancelReservation**      | `test_cancel_reservation`        | PATCH /reservations/{id}/cancel com 200 + status |
| **TestListUserReservations**   | `test_list_user_reservations`    | GET /reservations/user/{id} retorna todas  |
| **TestListRoomReservations**   | `test_list_room_reservations`    | GET /reservations/room/{id} retorna todas  |

## Testes de Schema (`schemas/`)

Testes puros de validação — nenhum banco de dados é necessário. Cada classe valida os validadores de campo do Pydantic.

### `schemas/test_user_schemas.py`

| Classe                | Teste                                        | O que verifica                                    |
| --------------------- | -------------------------------------------- | ------------------------------------------------- |
| **TestUserCreate**    | `test_valid_minimal`                         | Nome e e-mail aceitos, telefone padrão None        |
|                       | `test_valid_with_phone`                      | Telefone com caracteres especiais (+55) aceito     |
|                       | `test_valid_phone_simple_digits`             | Telefone apenas com dígitos aceito                 |
|                       | `test_trailing_whitespace_stripped`          | Espaços em branco do nome removidos na criação      |
|                       | `test_name_empty_raises`                     | Nome vazio gera ValidationError                    |
|                       | `test_name_whitespace_only_raises`           | Nome só com espaços gera ValidationError           |
|                       | `test_name_too_long_raises`                  | Nome > 100 caracteres gera ValidationError         |
|                       | `test_name_max_length_allowed`               | Nome com 100 caracteres aceito                     |
|                       | `test_phone_invalid_format_raises`           | Telefone com letras gera ValidationError           |
|                       | `test_phone_too_short_raises`                | Telefone < 7 caracteres gera ValidationError       |
|                       | `test_phone_too_long_raises`                 | Telefone > 20 caracteres gera ValidationError      |
|                       | `test_phone_none_allowed`                    | Telefone None explícito aceito                     |
| **TestUserUpdate**    | `test_valid_partial_name`                    | Apenas o nome atualizado, demais campos None       |
|                       | `test_valid_partial_email`                   | Apenas o e-mail atualizado                         |
|                       | `test_valid_partial_phone`                   | Apenas o telefone atualizado                       |
|                       | `test_valid_all_fields`                      | Todos os campos opcionais informados de uma vez    |
|                       | `test_name_trailing_whitespace_stripped`     | Espaços do nome removidos na atualização           |
|                       | `test_name_empty_raises`                     | Nome vazio na atualização gera erro                |
|                       | `test_name_too_long_raises`                  | Nome > 100 caracteres na atualização gera erro     |
|                       | `test_phone_too_short_raises`                | Telefone < 7 caracteres na atualização gera erro   |

### `schemas/test_room_schemas.py`

| Classe                | Teste                                        | O que verifica                                    |
| --------------------- | -------------------------------------------- | ------------------------------------------------- |
| **TestRoomCreate**    | `test_valid_minimal`                         | Nome, capacidade, preço aceitos; descrição None    |
|                       | `test_valid_with_description`                | Descrição armazenada quando informada              |
|                       | `test_trailing_whitespace_stripped`          | Espaços do nome removidos                          |
|                       | `test_name_empty_raises`                     | Nome vazio gera ValidationError                    |
|                       | `test_name_whitespace_only_raises`           | Nome só com espaços gera erro                      |
|                       | `test_name_too_long_raises`                  | Nome > 50 caracteres gera erro                     |
|                       | `test_name_max_length_allowed`               | Nome com 50 caracteres aceito                      |
|                       | `test_capacity_zero_raises`                  | Capacidade = 0 gera erro                           |
|                       | `test_capacity_negative_raises`              | Capacidade = -1 gera erro                          |
|                       | `test_price_zero_raises`                     | Preço = 0 gera erro                                |
|                       | `test_price_negative_raises`                 | Preço = -1 gera erro                               |
|                       | `test_description_too_long_raises`           | Descrição > 500 caracteres gera erro               |
|                       | `test_description_max_length_allowed`        | Descrição com 500 caracteres aceita                |
| **TestRoomUpdate**    | `test_valid_partial_name`                    | Apenas o nome atualizado                           |
|                       | `test_valid_partial_capacity`                | Apenas a capacidade atualizada                     |
|                       | `test_valid_partial_price`                   | Apenas o preço atualizado                          |
|                       | `test_valid_all_fields`                      | Todos os campos opcionais de uma vez               |
|                       | `test_name_empty_raises`                     | Nome vazio na atualização gera erro                |
|                       | `test_name_too_long_raises`                  | Nome > 50 caracteres na atualização gera erro      |
|                       | `test_capacity_zero_raises`                  | Capacidade = 0 na atualização gera erro            |
|                       | `test_capacity_negative_raises`              | Capacidade = -1 na atualização gera erro           |
|                       | `test_price_zero_raises`                     | Preço = 0 na atualização gera erro                 |
|                       | `test_price_negative_raises`                 | Preço = -1 na atualização gera erro                |
|                       | `test_description_too_long_raises`           | Descrição > 500 caracteres na atualização gera erro |

### `schemas/test_reservation_schemas.py`

| Classe                        | Teste                          | O que verifica                                |
| ----------------------------- | ------------------------------ | --------------------------------------------- |
| **TestReservationCreate**     | `test_valid`                   | check_in/check_out válidos aceitos             |
|                               | `test_check_in_today_allowed`  | check_in hoje é aceito                         |
|                               | `test_check_in_past_raises`    | check_in anterior a hoje gera ValidationError  |
|                               | `test_check_out_equal_check_in_raises` | check_out == check_in gera erro    |
|                               | `test_check_out_before_check_in_raises` | check_out anterior a check_in gera erro |

## Testes de Config (`config/`)

Testes do módulo de configuração — usam `unittest.mock.patch` para controlar variáveis de ambiente sem um arquivo `.env`. Nenhum banco de dados é necessário.

### `config/test_config.py`

| Classe           | Teste                     | O que verifica                                         |
| ---------------- | ------------------------- | ------------------------------------------------------ |
| **TestConfig**   | `test_defaults`           | Todas as constantes caem para padrões esperados        |
|                  | `test_custom_values`      | Env vars sobrescrevem todos os padrões (DB_PORT como int) |
|                  | `test_partial_override`   | Uma env var isolada mantém as demais no padrão         |
|                  | `test_port_is_int`        | DB_PORT é convertido para int                          |
|                  | `test_dotenv_loaded`      | load_dotenv chamado com caminho e override corretos    |

## Testes de Modelos (`models/`)

Testes de modelos ORM — validam padrões, restrições, cascatas e valores de enum. Exigem um banco SQLite em memória (fixture compartilhada `db_session`).

### `models/test_models.py`

| Classe                      | Teste                                        | O que verifica                                    |
| --------------------------- | -------------------------------------------- | ------------------------------------------------- |
| **TestReservationStatus**   | `test_enum_values`                           | Membros do enum têm valores corretos              |
|                             | `test_is_str_enum`                           | ReservationStatus é subclasse de str              |
|                             | `test_all_members_covered`                   | Os 3 membros esperados estão presentes            |
| **TestRoomDefaults**        | `test_is_active_defaults_to_true`            | Padrão do Room.is_active no nível ORM             |
| **TestReservationDefaults** | `test_status_defaults_to_confirmed`          | Padrão do Reservation.status = CONFIRMED          |
| **TestUserUniqueEmail**     | `test_duplicate_email_raises`                | IntegrityError no nível DB para e-mail duplicado  |
| **TestRoomUniqueName**      | `test_duplicate_name_raises`                 | IntegrityError no nível DB para nome de sala duplicado |
| **TestUserCascadeDelete**   | `test_delete_user_cascades_to_reservations`  | Excluir usuário em cascata exclui reservas        |
| **TestRoomCascadeDelete**   | `test_delete_room_cascades_to_reservations`  | Excluir sala em cascata exclui reservas           |

## Testes de Performance & Carga (`performance/load/`)

Os testes de carga são scripts **k6** (não pytest). Eles apontam para um servidor em execução e foram criados para explorar os limites de concorrência do app — especificamente o pool de conexões do SQLAlchemy (`pool_size=5`, `max_overflow=10`, ou seja, 15 conexões) atrás do pool de 40 threads do anyio usado em endpoints síncronos (veja README "Limitações conhecidas").

### Como executar

Requer [k6](https://k6.io/docs/getting-started/installation/) instalado (não é uma dependência Python). O servidor deve estar em execução primeiro — inicie-o com um `timeout-keep-alive` acima do maior sleep com pacing; caso contrário, o servidor fecha conexões keep-alive ociosas no meio do run e os testes paced de delete/put apresentam erros `EOF`:

```bash
uv run uvicorn api.main:app --reload --timeout-keep-alive 30
```

Além disso, todo script de carga define `noConnectionReuse: true` (`loadOptions`), para o k6 nunca reutilizar uma conexão keep-alive que o servidor possa ter fechado — um guard defensivo contra a mesma classe de erro `EOF`, independentemente dos flags do servidor.

Execute qualquer script como está para usar o perfil `load` padrão:

```bash
# users
k6 run tests/performance/load/users/post_users.js
k6 run tests/performance/load/users/get_users.js                 # listar (faz seed de 1 linha se a lista estiver vazia)
k6 run tests/performance/load/users/get_user_by_id.js            # obter (id de um pool dimensionado para o max VUs do cenário)
k6 run tests/performance/load/users/put_user_by_id.js            # atualizar (id de um pool dimensionado para o max VUs do cenário)
k6 run tests/performance/load/users/delete_user.js               # excluir de um pool criado via POST /seed/users no setup()

# rooms (mesmas operações, em rooms/)
k6 run tests/performance/load/rooms/post_rooms.js
k6 run tests/performance/load/rooms/get_rooms.js                 # listar (faz seed de 1 linha se a lista estiver vazia)
k6 run tests/performance/load/rooms/get_room_by_id.js            # obter (id de um pool dimensionado para o max VUs do cenário)
k6 run tests/performance/load/rooms/put_room_by_id.js            # atualizar (id de um pool dimensionado para o max VUs do cenário)
k6 run tests/performance/load/rooms/delete_room.js               # soft-delete de um pool criado via POST /seed/rooms no setup()

# reservations
k6 run tests/performance/load/reservations/post_reservations.js  # criar (janelas de datas futuras únicas por iteração para evitar 409)
k6 run tests/performance/load/reservations/get_user_reservations.js  # listar reservas de um usuário (faz seed de >=10 usuários + 1 cada)
k6 run tests/performance/load/reservations/get_room_reservations.js  # listar reservas de uma sala (faz seed de >=10 salas + 1 cada)
k6 run tests/performance/load/reservations/cancel_reservation.js  # cancelar de um pool criado via POST /seed/reservations no setup()
```

Todo script segue o mesmo formato — `k6 run <script> [opções]`. Todos os parâmetros são opcionais e podem ser combinados:

| Parâmetro | Finalidade | Exemplo |
| --------- | ---------- | ------- |
| `-e K6_SCENARIO=<nome>` | Perfil de carga: `smoke`, `load`, `staircase`, `soak`, `spike`, `average_load`, `stress`, `breakpoint` ou `all` | `-e K6_SCENARIO=staircase` |
| `-e BASE_URL=<url>` | Apontar para outro servidor | `-e BASE_URL=http://localhost:8000` |
| `-e K6_SOAK_DURATION=<d>` | Tempo de sustentação do perfil `soak` | `-e K6_SOAK_DURATION=15m` |
| `-e K6_AVG_LOAD_DURATION=<d>` | Tempo de sustentação do perfil `average_load` | `-e K6_AVG_LOAD_DURATION=30m` |
| `-e K6_DELETE_POOL_SIZE=<n>` | Sobrescrever o pool de seed dos testes de delete/cancel (caso contrário, calculado pelo perfil) | `-e K6_DELETE_POOL_SIZE=5000` |
| `-e K6_PACING_ROOMS=<f>` | Multiplicar o sleep entre iterações (normalmente 500–1500ms) nos testes de delete/put de salas (padrão 5) | `-e K6_PACING_ROOMS=2` |
| `-e K6_PACING_USERS=<f>` | Multiplicar o sleep entre iterações nos testes de delete/put de usuários (padrão 2.5) | `-e K6_PACING_USERS=1` |
| `-e K6_PACING_RESERVATIONS=<f>` | Multiplicar o sleep entre iterações no teste de cancelamento de reservas (padrão 1) | `-e K6_PACING_RESERVATIONS=0.5` |
| `-e K6_POOL_SAFETY=<f>` | Fator de superdimensionamento dos pools de seed de delete/cancel (padrão 1.2) | `-e K6_POOL_SAFETY=1.5` |
| `-e K6_SEED_POOL_WARN=<n>` | Avisar quando o pool de seed de delete/cancel superar esta contagem (padrão 75000) | `-e K6_SEED_POOL_WARN=50000` |
| `-e K6_SEED_POOL_MAX=<n>` | Abortar quando o pool de seed de delete/cancel superar esta contagem (padrão 150000) | `-e K6_SEED_POOL_MAX=100000` |
| `-e SEED_API_KEY=<chave>` | Sobrescrever a chave de auth da rota de seed (padrão lido do `.env`) | `-e SEED_API_KEY=<valor>` |
| `-e K6_P95_MS=<n>` | Relaxar o limiar de latência p95 | `-e K6_P95_MS=1000` |
| `-e K6_ERROR_RATE=<f>` | Relaxar o limiar de taxa de erro | `-e K6_ERROR_RATE=0.05` |
| `-e K6_FAILURE_LOG_LIMIT=<n>` | Logar o corpo apenas das N primeiras respostas com falha (padrão 20) | `-e K6_FAILURE_LOG_LIMIT=50` |
| `--out json=<arquivo>` | Exportar resultados para análise | `--out json=results.json` |
| `--vus <n> --duration <d>` | Execução rápida ad-hoc (sobrescreve a configuração de cenários) | `--vus 1 --duration 1s` |

Exemplos combinados:

```bash
# Escolher um perfil e um alvo
k6 run tests/performance/load/users/post_users.js -e K6_SCENARIO=staircase -e BASE_URL=http://localhost:8000

# Soak com duração personalizada
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_SOAK_DURATION=15m

# Limiares relaxados para uma máquina lenta
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_P95_MS=1000 -e K6_ERROR_RATE=0.05

# Verificação rápida de 1 segundo (sobrescreve o perfil de carga)
k6 run --vus 1 --duration 1s tests/performance/load/users/delete_user.js

# Exportar resultados para análise
k6 run tests/performance/load/users/get_users.js --out json=results.json
```

Os scripts compartilham os helpers em `tests/performance/helpers/`:

- `general_helpers.js` — `randomIntBetween`
- `request_helpers.js` — `postJson`/`putJson`/`patchJson`/`getJson`/`delJson` (embutem o header `Content-Type`), `logFailure`, `parseBody`, `sleepBetween`, `pacedSleep(kind)`, `nextIdFromVus`, `checkListFields`
- `config.js` — `BASE_URL`, `RUN_ID`, `SCENARIO`, `DAY_MS` e `isoDateFromOffset(offsetDays)` (preâmbulo compartilhado entre scripts)
- `options_helpers.js` — `loadOptions({ setupTimeout })` monta o bloco de cenários + thresholds que todo script repetia; thresholds são configuráveis via env (veja [Thresholds](#thresholds))
- `seed_helpers.js` — encapsula a API interna de seed (`seedViaRoute`, `seedById`, `sliceForVus`, `seedPool`, `resolveSeedKey`); o `setup()` dos testes de delete/cancel vira `return seedPool('rooms' | 'users' | 'reservations')`, e os testes de put por id semeiam com `seedById(kind, count)` (linhas novas via `/seed/{kind}`, retornando os ids realmente inseridos). Também provê seeders por rota de negócio para os testes de leitura: `ensureOneIfEmpty(kind)` (get_rooms/get_users), `ensureRows(kind, count, prefix)` (get_*_by_id) e `seedReservationGraph(kind, count)` (get_user_reservations/get_room_reservations)
- `pool_helpers.js` — `parseDuration`, `computePoolConfig`, `computePerVuConfig`, `computeSliceLayout`, `byIdSeedCount`, `pacingFactor(kind)`, `guardSeedPoolSize` (dimensionamento do seed pool e dos testes por id, pacing por entidade e o guard de pool de delete/cancel)
- `scenarios_helpers.js` — todos os perfis estão centralizados para que cada teste de rota execute formas de carga idênticas

### Perfis

| Perfil      | Executor      | Carga (VUs)                      | Objetivo                                   |
| ----------- | ------------- | -------------------------------- | ------------------------------------------ |
| `smoke`     | constant-vus  | 3, 30s                           | Verificação rápida de que o script funciona |
| `load`      | ramping-vus   | ramp até 5, mantém 30, ramp a 0  | Linha de base sob carga típica             |
| `average_load` | ramping-vus | ramp até 20, mantém 10m (padrão), ramp a 0 | Tráfego típico/esperado sustentado |
| `stress`    | ramping-vus   | 40→80→120→160 (1m de ramp + 2m de sustentação cada), ramp a 0 | Escalar além do "knee" para achar o ponto de degradação |
| `staircase` | ramping-vus   | 5,10,15,20,25,30,40,50 (45s cda) | Encontrar o "knee" de concorrência         |
| `soak`      | ramping-vus   | ramp até 40, mantém 10m (padrão) | Detectar crescimento/ vazamentos de conexão |
| `spike`     | ramping-vus   | 0 → 200 (15s), mantém 200 (1m)  | Expor exaustão do pool de forma acentuada  |
| `breakpoint`| ramping-vus   | etapas 50 → 100 → 150 → 200 (2m cada) | Aumentar continuamente até o sistema falhar |

Selecione com `-e K6_SCENARIO=<nome>`. O perfil `staircase` mantém cada etapa ~45s para que as métricas de percentil fiquem estáveis.

> **Por que os níveis de VU parecem baixos:** este é um projeto de estudo/portfólio executado contra uma API local em uma única máquina. Os valores dos perfis são intencionalmente pequenos para que uma execução seja viável no hardware local e, mesmo assim, cruze o ponto real de saturação do app (pool de 15 conexões / threadpool de 40). Trate-os como pontos de partida — aumente-os (ou use as variáveis de ambiente acima) para refletir um ambiente real maior.

Use `-e K6_SCENARIO=all` para executar todos os perfis de uma vez (os oito rodam em paralelo). Isso é um escape para uma execução combinada única: como `spike`, `stress` e `breakpoint` deliberadamente sobrecarregam o pool de 15 conexões, uma execução `all` reportará violações de limiar (os thresholds usam `abortOnFail: false`, então são registrados, não abortados). Testes de exclusão/cancelamento dimensionam seu pool de seed a partir da concorrência somada de todos os perfis ativos.

### Pool de seed do teste de exclusão — usuários

`delete_user.js` usa os mesmos cenários. Como `DELETE /users/{id}` remove linhas permanentemente, o `setup()` chama a rota dedicada **`POST /seed/users`** (não o `POST /users` de negócio) com o estimador compartilhado + pacing por entidade (veja *Delete/cancel seed pool: sizing & guard*, em inglês) para que o pool nunca se esgote no meio da execução (apenas a rota sob teste é atingida durante a carga). Para usuários o `K6_PACING_USERS=2.5` padrão gera ~35k linhas em `stress` e ~91k em `all`. A rota insere os usuários em massa diretamente no Postgres e retorna seus ids; cada VU recebe uma fatia disjunta dimensionada para sua própria janela ativa (veja *Delete/cancel seed pool: sizing & guard*), para que dois VUs não atinjam o mesmo id e nenhum se esgote no meio do run (sem corridas de 404). Sobrescreva com `-e K6_DELETE_POOL_SIZE=<n>`. Se a sobrescrita for menor que `maxVus`, o `sliceForVus` aborta o `setup()` com um erro claro (`pool size X < maxVus Y`) em vez de disparar requisições inválidas para `/users/undefined`.

`setupTimeout` é definido como `10m` (o padrão é 60s) para que o seed de grandes pools não aborte antes de os VUs iniciarem.

A rota de seed é autenticada: as requisições devem enviar o header `X-Seed-Key` correspondente a `SEED_API_KEY` do `.env` do projeto. O k6 lê a chave de `../../../../.env` (relativo ao script em `users/`) automaticamente, ou você pode sobrescrever com `-e SEED_API_KEY=<valor>`.

As rotas de carga são registradas apenas quando `ENABLE_LOADTEST_ENDPOINTS=true` no `.env` (padrão desligado/falso quando não definido), então nunca são expostas a menos que explicitamente habilitadas.

### Pool de seed do teste de exclusão — salas

`delete_room.js` usa os mesmos cenários que `delete_user.js`. O `setup()` chama a rota dedicada **`POST /seed/rooms`** (não o `POST /rooms` de negócio) com o estimador compartilhado + pacing por entidade (veja *Delete/cancel seed pool: sizing & guard*, em inglês) — salas têm o pacing mais lento (`K6_PACING_ROOMS=5`), então geram menos linhas (~17k em `stress`, ~45k em `all`). A rota insere as salas em massa diretamente no Postgres e retorna seus ids. Cada VU recebe uma fatia disjunta dimensionada para sua própria janela ativa (veja *Delete/cancel seed pool: sizing & guard*), para que dois VUs não atinjam o mesmo id.

Como `DELETE /rooms/{id}` é um **soft-delete** (define `is_active=false`, a linha permanece e re-exclusões ainda retornam 204), o pool nunca retorna 404, mesmo que um id seja excluído duas vezes. `setupTimeout` é `10m`. Sobrescreva o pool com `-e K6_DELETE_POOL_SIZE=<n>`. A rota `/seed/rooms` é autenticada com o header `X-Seed-Key`, lido de `../../../../.env` (relativo ao script em `rooms/`) ou sobrescrevível com `-e SEED_API_KEY=<valor>`, e só é registrada quando `ENABLE_LOADTEST_ENDPOINTS=true`.

### Pool de seed do teste de cancelamento — reservas

`cancel_reservation.js` usa os mesmos cenários. Como `PATCH /reservations/{id}/cancel` funciona apenas uma vez por reserva (uma segunda chamada retorna **400**), o `setup()` chama a rota dedicada **`POST /seed/reservations`** com o estimador compartilhado + pacing por entidade (veja *Delete/cancel seed pool: sizing & guard*, em inglês) — reservas têm o pacing mais rápido (`K6_PACING_RESERVATIONS=1`), então geram mais linhas (~87k em `stress`; `all` atinge o guard em ~227k). Cada VU recebe uma fatia disjunta dimensionada para sua própria janela ativa (veja *Delete/cancel seed pool: sizing & guard*), para que dois VUs não cancelem o mesmo id e nenhum se esgote no meio do run. Sobrescreva com `-e K6_DELETE_POOL_SIZE=<n>`. `setupTimeout` é `10m`.

`POST /seed/reservations` é autenticado com `X-Seed-Key` (lido de `../../../../.env` ou `-e SEED_API_KEY=<valor>`) e só é registrado quando `ENABLE_LOADTEST_ENDPOINTS=true`. O seed gera seus próprios pools de usuários + salas (100 cada) além de `quantity` reservas **confirmadas** com datas sem sobreposição por sala, então nunca viola a restrição de exclusão `no_overlap` (reservas confirmadas na mesma sala não podem ter intervalos de datas sobrepostos — veja a nota sobre schema abaixo).

### Teste de criação de reservas — evitando colisões 409

`POST /reservations/` é protegido pela restrição de exclusão `no_overlap`: duas reservas confirmadas na mesma sala com datas sobrepostas entram em conflito (a rota retorna **409** tanto pela query de sobreposição quanto por um `IntegrityError`). Como respostas 4xx reprovam o limiar `http_req_failed < 1%`, o `post_reservations.js` grava cada iteração com uma **janela de datas globalmente única** para nunca sobrepor: `offset = __ITER * maxVus + (__VU - 1)`, `check_in = hoje + offset`, `check_out = check_in + 1`. Cada POST, portanto, retorna `201`. O `setup()` reutiliza o primeiro usuário existente (um usuário pode ter muitas reservas), mas **sempre cria uma sala nova** (nome único) para que reservas confirmadas de execuções anteriores nunca colidam com as janelas da nova execução.

### Thresholds

Todos os três limiares usam `abortOnFail: false` para que o teste **registre** a saturação em vez de parar nela:

- `http_req_failed`: `rate < 0.01`
- `http_req_duration`: `p(95) < 500`
- `http_req_waiting`: `p(95) < 500` — time-to-first-byte, a métrica que expõe o enfileiramento no pool do DB

Os limiares são filtrados pela tag `kind:load`, avaliando apenas as requisições da rota sob teste. Requisições de setup/seed (`kind:seed`, ex.: o insert em massa `POST /seed/{kind}`) ficam de fora — caso contrário a latência única do seed dominaria o `p(95)` em execuções curtas (ex.: `k6 run --vus 1 --duration 1s delete_user.js`).

Os limiares são centralizados em `helpers/options_helpers.js` (`loadOptions()`) e podem ser relaxados por execução sem editar arquivos — ex.: soak numa máquina lenta:

```bash
k6 run tests/performance/load/users/get_users.js -e K6_SCENARIO=soak -e K6_P95_MS=1000 -e K6_ERROR_RATE=0.05
```

### Caveat da ordem dos testes

`delete_user.js` remove usuários permanentemente e `delete_room.js` aplica soft-delete em salas (ocultas do `GET /rooms`). Os testes de get por id (`get_user_by_id`, `get_room_by_id`) assumem que existem os primeiros `max(10, maxVUs)` ids — o pool é dimensionado pelo cenário ativo —; rodar um teste de delete/cancel antes deles gera 404s e violações de limiar nos runs seguintes. `put_user_by_id` / `put_room_by_id` **não** são afetados: eles semeiam linhas novas via `POST /seed/{kind}` e usam os ids retornados, então funcionam após qualquer run anterior. Se o DB de carga não for descartável, faça novo seed (ou rode um teste de create/list) antes dos testes de get por id.

### Testes de performance no CI

Um workflow dedicado (`.github/workflows/performance.yml`) protege os scripts k6:

- **`validate`** roda em todo push/PR para `master`: instala o k6 e executa `k6 inspect` em todos os scripts de `tests/performance/load/**/*.js`. Nenhum servidor nem banco é necessário — falha apenas se um script deixar de parsear.
- **`smoke`** é manual/opt-in (`workflow_dispatch`): inicializa a API com um container de serviço Postgres, aguarda a saúde e roda o perfil `smoke` de `get_users.js`, `get_rooms.js`, `post_users.js`, `post_rooms.js` e `post_reservations.js`, falhando em violação de limiar. Inputs opcionais `p95-ms` / `error-rate` afrouxam os limiares para runners lentos.

### Como ler o "knee"

Quando a concorrência excede a capacidade do pool/threadpool, as requisições se enfileiram dentro do app antes de atingir o banco. Sintomas:

1. O `http_req_waiting` (TTFB) p95 rompe o limiar de 500ms enquanto o `http_req_blocked` permanece perto de 0 (keep-alive; a espera é no servidor, não na rede).
2. A vazão (`http_reqs`/RPS) atinge um platô mesmo com VUs aumentando.
3. No extremo, requisições excedem `pool_timeout` (padrão 30s) e retornam 500; o log do console mostra `TimeoutError` / `OperationalError` no corpo da resposta — a assinatura de exaustão do pool.

Knee esperado: em algum ponto da faixa de 15–40 VUs para este app (pool = 15 conexões, threadpool = 40).

### Correlacionando com o DB (opcional)

O k6 mostra o sintoma; confirme a causa durante uma execução consultando o Postgres:

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'performancelab';
```

Conexões limitadas a 15 enquanto a latência aumenta = contenção no pool (não no threadpool).
