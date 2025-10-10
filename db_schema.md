<img width="699" height="475" alt="image" src="https://github.com/user-attachments/assets/e4aacf23-e4fd-4e2d-8c22-bf44e11769ba" />

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
created_at   timestamp
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
created_at timestamp
}

Table action_types {
id   int [pk]
name varchar(50) [unique, not null]
}
Table user_logs {
id             uuid [pk]
user_id        uuid [ref: > users.id]
action_id      varchar(50) [ref: > action_types.id]
success        boolean
created_at     timestamp
}
Table wallets {
id             uuid [pk]
user_id        uuid [ref: > users.id]
address        varchar [unique, not null]
created_at     timestamp
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
