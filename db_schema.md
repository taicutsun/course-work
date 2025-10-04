<img width="918" height="694" alt="2025-10-04_11-08-13" src="https://github.com/user-attachments/assets/01f3d993-f779-4242-bc51-89624277259e" />

<details>
  dml code 
  <summary>
    Table users {
  id             uuid [pk]
  email          varchar [unique, not null]
  password_hash  varchar [not null]
  email_verified boolean [default: false]
  role           varchar(20) [not null] // ADMIN / USER
  status         varchar(20) [default: 'ACTIVE'] // ACTIVE / BLOCKED
  created_at     timestamp [default: `now()`]
  updated_at     timestamp
}

Table sessions {
  id             uuid [pk]
  name           varchar [not null]
  description    text
  start_time     timestamp
  end_time       timestamp
  mode           varchar(20) // anonymous / non-anonymous
  selection_type varchar(20) // single / multiple
  selection_limit int
  published      boolean [default: false]
  created_by     uuid [ref: > users.id]
  created_at     timestamp [default: `now()`]
}

Table tokens {
  id             uuid [pk]
  network        varchar [not null]
  name           varchar [not null]
  contract_address varchar [not null]
  description    text
  display_order  int
  created_at     timestamp [default: `now()`]
  updated_at     timestamp
}

Table transactions {
  id             uuid [pk]
  user_id        uuid [ref: > users.id]
  token_id       uuid [ref: > tokens.id]
  tx_hash        varchar [unique, not null]
  tx_type        varchar(20) // transfer / swap / staking
  amount         numeric(36,18)
  from_address   varchar
  to_address     varchar
  status         varchar(20) // pending / success / error
  created_at     timestamp [default: `now()`]
  updated_at     timestamp
}

Table transaction_metadata {
  id             uuid [pk]
  transaction_id uuid [ref: > transactions.id]
  formed_at      timestamp
  signature      varchar
  extra_data     json
}

Table notifications {
  id             uuid [pk]
  user_id        uuid [ref: > users.id]
  type           varchar(50) // transaction, balance, system
  message        text
  read           boolean [default: false]
  created_at     timestamp [default: `now()`]
}

Table audit_logs {
  id             uuid [pk]
  user_id        uuid [ref: > users.id]
  action_type    varchar(50) // login, create, update, delete, role_change, tx_execute
  entity_type    varchar(50) // user, token, transaction, session
  entity_id      uuid
  success        boolean
  ip_address     varchar
  user_agent     text
  wallet_address varchar
  created_at     timestamp [default: `now()`]
}

Table wallets {
  id             uuid [pk]
  user_id        uuid [ref: > users.id]
  address        varchar [unique, not null]
  network        varchar
  created_at     timestamp [default: `now()`]
}

Table balances {
  id             uuid [pk]
  wallet_id      uuid [ref: > wallets.id]
  token_id       uuid [ref: > tokens.id]
  amount         numeric(36,18) [default: 0]
  updated_at     timestamp
}

Table system_settings {
  id             uuid [pk]
  name           text
  value          text
  updated_at     timestamp
}

  </summary>
</details>
