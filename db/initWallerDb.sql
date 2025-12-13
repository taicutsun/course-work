CREATE SCHEMA IF NOT EXISTS wallet;

CREATE TABLE wallet.roles
(
    id   SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE wallet.users
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR UNIQUE NOT NULL,
    password   VARCHAR        NOT NULL,
    role_id    INT            NOT NULL REFERENCES wallet.roles (id),
    created_at TIMESTAMP        DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE TABLE wallet.transaction_statuses
(
    id   SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE wallet.transactions
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID           NOT NULL REFERENCES wallet.users (id),
    tx_hash      VARCHAR UNIQUE NOT NULL,
    amount       NUMERIC(36, 18),
    from_address VARCHAR,
    to_address   VARCHAR,
    status_id    INT            NOT NULL REFERENCES wallet.transaction_statuses (id),
    created_at   TIMESTAMP        DEFAULT now(),
    updated_at   TIMESTAMP
);

CREATE TABLE wallet.transaction_metadata
(
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES wallet.transactions (id) ON DELETE CASCADE,
    formed_at      TIMESTAMP,
    signature      VARCHAR,
    extra_data     JSON
);

CREATE TABLE wallet.notification_types
(
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE wallet.notifications
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES wallet.users (id),
    type_id    INT  NOT NULL REFERENCES wallet.notification_types (id),
    message    TEXT,
    read       BOOLEAN          DEFAULT false,
    created_at TIMESTAMP        DEFAULT now()
);

CREATE TABLE wallet.action_types
(
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE wallet.user_logs
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES wallet.users (id),
    action_id  INT  NOT NULL REFERENCES wallet.action_types (id),
    success    BOOLEAN,
    created_at TIMESTAMP        DEFAULT now()
);

CREATE TABLE wallet.wallets
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID           NOT NULL REFERENCES wallet.users (id),
    address    VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMP        DEFAULT now()
);

CREATE TABLE wallet.balances
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id  UUID NOT NULL REFERENCES wallet.wallets (id) ON DELETE CASCADE,
    amount     NUMERIC          DEFAULT 0,
    updated_at TIMESTAMP
);
/*
INNER JOIN

Классический INNER JOIN
-CROSS JOIN → частный случай INNER без условия (ON true)
-SELF JOIN → INNER или OUTER, но к одной и той же таблице
-NATURAL JOIN → INNER или OUTER, где условие строится автоматически по совпадающим колонкам

OUTER JOIN
-LEFT OUTER JOIN
-RIGHT OUTER JOIN
-FULL OUTER JOIN
*/