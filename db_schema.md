<img width="981" height="708" alt="image" src="https://github.com/user-attachments/assets/7e5e76db-cf01-4b33-bf26-56375faed7d7" />


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
is_read       boolean [default: false]
created_at timestamp
}
Table action_types {
id   int [pk]
name varchar(50) [unique, not null]
}
Table user_logs {
id             uuid [pk]
user_id        uuid [ref: > users.id]
action_id      int [ref: > action_types.id]
is_success        boolean
created_at     timestamp
}
Table wallets {
id                 uuid [pk]
user_id            uuid [ref: > users.id]
address            varchar [unique, not null]
balance            numeric [default: 0]
created_at         timestamp
last_updated_at_balance timestamp
}

</code>
</pre>
</details>
</summary>
