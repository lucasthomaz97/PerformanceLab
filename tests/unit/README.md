# Unit Tests

Uses **pytest** with an in-memory SQLite database for service tests, and pure Pydantic for schema tests (no external database needed).

## Structure

```
tests/unit/
├── conftest.py          # Shared fixtures (engine, db_session, user, room, etc.)
├── services/            # Service-layer tests (require DB)
│   ├── test_user_service.py
│   ├── test_room_service.py
│   └── test_reservation_service.py
├── schemas/             # Schema validation tests (no DB, pure Pydantic)
│   ├── test_user_schemas.py
│   ├── test_room_schemas.py
│   └── test_reservation_schemas.py
└── README.md
```

## How to run

```bash
# Run all unit tests
uv run pytest tests/unit -v

# Run service tests only
uv run pytest tests/unit/services -v

# Run schema tests only
uv run pytest tests/unit/schemas -v

# Run a specific file
uv run pytest tests/unit/services/test_user_service.py -v

# Run tests matching a keyword
uv run pytest tests/unit -k "overlap" -v
```

## Fixtures (`conftest.py`)

Shared fixtures auto-discovered by pytest (available in both `services/` and `schemas/` subdirectories):

| Fixture           | Description                                   |
| ----------------- | --------------------------------------------- |
| `engine`          | In-memory SQLite engine                       |
| `db_session`      | Session scoped to each test, rolls back after |
| `user`            | Pre-created user (Alice)                      |
| `second_user`     | Pre-created second user (Bob)                 |
| `room`            | Pre-created room (101, 2 guests)              |
| `second_room`     | Pre-created second room (102, 4 guests)       |
| `reservation_data` | DTO for creating a reservation (user + room) |
| `reservation`     | Pre-created reservation (user + room)         |

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
