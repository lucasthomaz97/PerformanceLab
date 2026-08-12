# PerformanceLab

> Room reservation management / Gerenciamento de reservas de salas

[**English**](#english) &nbsp;|&nbsp; [**Português**](#português-pt-br)

---

## English

### Description

REST API for room, user and reservation management. Built with **FastAPI**, **SQLAlchemy** and **PostgreSQL**. This project serves as a base to study performance testing and load testing.

### Features

- **Rooms** — Full CRUD with soft-delete
- **Users** — Full CRUD with email and phone validation
- **Reservations** — Create with date conflict check, cancel, list by user and by room

### Project structure

```
api/
├── main.py                 # FastAPI app, lifespan with create_all
├── config.py               # Config (DB_* env vars)
├── database.py             # SQLAlchemy engine, session, declarative base
├── models/
│   ├── user.py             # User model
│   ├── room.py             # Room model
│   └── reservation.py      # Reservation model + ReservationStatus enum
├── schemas/
│   ├── user.py             # Pydantic: UserCreate, UserUpdate, UserResponse
│   ├── room.py             # Pydantic: RoomCreate, RoomUpdate, RoomResponse
│   └── reservation.py      # Pydantic: ReservationCreate, ReservationResponse
├── services/
│   ├── user_service.py     # User business rules
│   ├── room_service.py     # Room business rules
│   └── reservation_service.py  # Reservation business rules
└── routers/
    ├── users.py            # /users endpoints
    ├── rooms.py            # /rooms endpoints
    └── reservations.py     # /reservations endpoints
```

### Requirements

- Python >= 3.14
- Running PostgreSQL
- Managed with [uv](https://docs.astral.sh/uv/)

### Setup

1. Clone the repository.
2. Copy the environment file and edit with your credentials:

```
cp .env.example .env
```

3. Create the database in PostgreSQL:

```sql
CREATE DATABASE performancelab;
```

4. Install dependencies:

```
uv sync
```

5. Run:

```
uv run uvicorn api.main:app --reload
```

Tables are created automatically on startup via `Base.metadata.create_all`.

### Endpoints

| Method   | Route                                  | Description              |
| -------- | -------------------------------------- | ------------------------ |
| `POST`   | `/users/`                              | Create user              |
| `GET`    | `/users/`                              | List users               |
| `GET`    | `/users/{id}`                          | Get user                 |
| `PUT`    | `/users/{id}`                          | Update user              |
| `DELETE` | `/users/{id}`                          | Delete user              |
| `POST`   | `/rooms/`                              | Create room              |
| `GET`    | `/rooms/`                              | List rooms               |
| `GET`    | `/rooms/{id}`                          | Get room                 |
| `PUT`    | `/rooms/{id}`                          | Update room              |
| `DELETE` | `/rooms/{id}`                          | Deactivate room          |
| `POST`   | `/reservations/`                       | Create reservation       |
| `PATCH`  | `/reservations/{id}/cancel`            | Cancel reservation       |
| `GET`    | `/reservations/user/{user_id}`         | List user reservations   |
| `GET`    | `/reservations/room/{room_id}`         | List room reservations   |

### Business rules

- **User email** must be unique.
- **Room name** must be unique.
- **Capacity** must be >= 1.
- **Price** must be > 0.
- **check_in** must be today or in the future.
- **check_out** must be after check_in.
- A room cannot have **overlapping reservations** (status = confirmed).
- A reservation can only be cancelled if its status is **confirmed**.
- A user can only be deleted if they have **no active reservations**.
- A room can only be deactivated if it has **no active reservations**.

### Known limitations

- **DB connection pool is not tuned for high concurrency.** `api/database.py` uses SQLAlchemy's default pool (`pool_size=5`, `max_overflow=10`), and endpoints are sync `def`, so FastAPI runs them on anyio's threadpool (capped at 40 threads). Under concurrent load (e.g. 50 VUs), requests queue on both the threadpool and the connection pool, so latency climbs regardless of endpoint. Load tests in `tests/performance/load/` are designed to expose this. Fixes to consider: raise `pool_size`/`max_overflow` (ideally env-driven), enable `pool_pre_ping`, or migrate to an async engine and `async def` endpoints.

### Tests

Tests are in `tests/` (unit tests in `tests/unit/`, integration tests in `tests/integration/`). Run all with:

```
uv run pytest tests/ -v
```

See [tests/README.md](tests/README.md) for a full description of every test.

### CI/CD

Every push and pull request to `master` runs:

1. **Lint** — `ruff check .`
2. **Type check** — `mypy api/`
3. **Test with coverage** — `pytest tests/ -v --cov=api --cov-report=term-missing` against a PostgreSQL 17 service container
4. **Coverage artifact** uploaded on every run

### Interactive docs

- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Português (PT-BR)

### Descrição

API REST para gerenciamento de salas, usuários e reservas. Desenvolvida com **FastAPI**, **SQLAlchemy** e **PostgreSQL**. Este projeto serve como base para estudar testes de performance e testes de carga.

### Funcionalidades

- **Salas** — CRUD completo com soft-delete (desativação)
- **Usuários** — CRUD completo com validação de e-mail e telefone
- **Reservas** — Criação com verificação de conflito de datas, cancelamento, listagem por usuário e por sala

### Estrutura do projeto

```
api/
├── main.py                 # App FastAPI, lifespan com create_all
├── config.py               # Config (DB_* via variáveis de ambiente)
├── database.py             # Engine SQLAlchemy, Sessão, Base declarativa
├── models/
│   ├── user.py             # Modelo User
│   ├── room.py             # Modelo Room
│   └── reservation.py      # Modelo Reservation + enum ReservationStatus
├── schemas/
│   ├── user.py             # Pydantic: UserCreate, UserUpdate, UserResponse
│   ├── room.py             # Pydantic: RoomCreate, RoomUpdate, RoomResponse
│   └── reservation.py      # Pydantic: ReservationCreate, ReservationResponse
├── services/
│   ├── user_service.py     # Regras de negócio de usuário
│   ├── room_service.py     # Regras de negócio de sala
│   └── reservation_service.py  # Regras de negócio de reserva
└── routers/
    ├── users.py            # Endpoints /users
    ├── rooms.py            # Endpoints /rooms
    └── reservations.py     # Endpoints /reservations
```

### Requisitos

- Python >= 3.14
- PostgreSQL rodando
- Gerenciado com [uv](https://docs.astral.sh/uv/)

### Configuração

1. Clone o repositório.
2. Copie o arquivo de ambiente e edite com suas credenciais:

```
cp .env.example .env
```

3. Crie o banco de dados no PostgreSQL:

```sql
CREATE DATABASE performancelab;
```

4. Instale as dependências:

```
uv sync
```

5. Execute:

```
uv run uvicorn api.main:app --reload
```

As tabelas são criadas automaticamente na inicialização via `Base.metadata.create_all`.

### Endpoints

| Método   | Rota                                   | Descrição                 |
| -------- | -------------------------------------- | ------------------------- |
| `POST`   | `/users/`                              | Criar usuário             |
| `GET`    | `/users/`                              | Listar usuários           |
| `GET`    | `/users/{id}`                          | Obter usuário             |
| `PUT`    | `/users/{id}`                          | Atualizar usuário         |
| `DELETE` | `/users/{id}`                          | Excluir usuário           |
| `POST`   | `/rooms/`                              | Criar sala                |
| `GET`    | `/rooms/`                              | Listar salas              |
| `GET`    | `/rooms/{id}`                          | Obter sala                |
| `PUT`    | `/rooms/{id}`                          | Atualizar sala            |
| `DELETE` | `/rooms/{id}`                          | Desativar sala            |
| `POST`   | `/reservations/`                       | Criar reserva             |
| `PATCH`  | `/reservations/{id}/cancel`            | Cancelar reserva          |
| `GET`    | `/reservations/user/{user_id}`         | Reservas de um usuário    |
| `GET`    | `/reservations/room/{room_id}`         | Reservas de uma sala      |

### Regras de negócio

- **E-mail do usuário** deve ser único.
- **Nome da sala** deve ser único.
- **Capacidade** da sala deve ser >= 1.
- **Preço** da sala deve ser > 0.
- **check_in** deve ser hoje ou no futuro.
- **check_out** deve ser posterior a check_in.
- Uma sala não pode ter reservas com **datas sobrepostas** (status = confirmed).
- Uma reserva só pode ser cancelada se estiver com status **confirmed**.
- Um usuário só pode ser excluído se **não tiver reservas ativas**.
- Uma sala só pode ser desativada se **não tiver reservas ativas**.

### Limitações conhecidas

- **Pool de conexões não configurado para alta concorrência.** `api/database.py` usa o pool padrão do SQLAlchemy (`pool_size=5`, `max_overflow=10`), e os endpoints são `def` síncronos, então o FastAPI os executa no threadpool do anyio (limitado a 40 threads). Sob carga concorrente (ex.: 50 VUs), as requisições ficam enfileiradas tanto no threadpool quanto no pool de conexões, fazendo a latência aumentar independentemente do endpoint. Os testes de carga em `tests/performance/load/` foram criados para expor isso. Correções a considerar: aumentar `pool_size`/`max_overflow` (idealmente via variáveis de ambiente), habilitar `pool_pre_ping`, ou migrar para engine assíncrono e endpoints `async def`.

### Testes

Os testes estão em `tests/` (testes unitários em `tests/unit/`, testes de integração em `tests/integration/`). Execute todos com:

```
uv run pytest tests/ -v
```

Consulte [tests/README.md](tests/README.md) para a descrição completa de cada teste.

### CI/CD

Cada push e pull request para `master` executa:

1. **Lint** — `ruff check .`
2. **Type check** — `mypy api/`
3. **Testes com cobertura** — `pytest tests/ -v --cov=api --cov-report=term-missing` em container PostgreSQL 17
4. **Artefato de cobertura** enviado a cada execução

### Documentação interativa

- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
