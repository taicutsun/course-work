<img width="970" height="740" alt="image" src="https://github.com/user-attachments/assets/11e7b78c-a962-4890-a4f1-6f0561525aba" />

<summary>
  dml code 
  <details>
    <pre>
      <code>
      Table users {
  id             uuid [pk]
  email          varchar [unique, not null]
  password  varchar [not null]
  role_id        int [ref: > roles.id]
  created_at     timestamp [default: `now()`]
  updated_at     timestamp
}

Table roles {
  id             int [pk]
  name           varchar(20) [unique, not null] // ADMIN, USER
}


Table transaction_statuses {
  id   int [pk]
  name varchar(20) [unique, not null] // pending, success, error
}

Table transactions {
  id           uuid [pk]
  user_id      uuid [ref: > users.id]
  tx_hash      varchar [unique, not null]
  amount       numeric(36,18)
  from_address varchar
  to_address   varchar
  status_id    int [ref: > transaction_statuses.id]
  created_at   timestamp [default: `now()`]
  updated_at   timestamp
}


Table transaction_metadata {
  id             uuid [pk]
  transaction_id uuid [ref: > transactions.id]
  formed_at      timestamp
  signature      varchar
  extra_data     json
}

Table notification_types {
  id   int [pk]
  name varchar(50) [unique, not null] // transaction, balance, system
}

Table notifications {
  id         uuid [pk]
  user_id    uuid [ref: > users.id]
  type_id    int [ref: > notification_types.id]
  message    text
  read       boolean [default: false]
  created_at timestamp [default: `now()`]
}


Table audit_logs {
  id             uuid [pk]
  user_id        uuid [ref: > users.id]
  action_type    varchar(50)
  entity_type    varchar(50)
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
  created_at     timestamp [default: `now()`]
}

Table balances {
  id             uuid [pk]
  wallet_id      uuid [ref: > wallets.id]
  amount         numeric [default: 0]
  updated_at     timestamp
}

</code>
</pre>
</details>
</summary>
