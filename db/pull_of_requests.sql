SELECT id, email, role_id
FROM wallet.users;

select count(*)
from wallet.users;

UPDATE wallet.transactions
SET status_id = (SELECT id
                 FROM wallet.transaction_statuses
                 WHERE name = 'success')
WHERE tx_hash = '0xabc123';

select count(*)
from wallet.notifications;

insert into wallet.notifications (user_id, type_id, message)
values ('5b8d6ab6-5ef2-47ec-8335-fb82dc8c71ba',
        1,
        'some msg');

DELETE
FROM wallet.notifications
WHERE user_id = (SELECT id
                 FROM wallet.users
                 WHERE email = 'user2@example.com');

-- 5. SELECT — пользователи с балансом больше среднего (подзапрос в WHERE)
SELECT id, email
FROM wallet.users
WHERE id IN (SELECT w.user_id
             FROM wallet.wallets w
             WHERE w.id IN (SELECT b.wallet_id
                            FROM wallet.balances b
                            WHERE b.amount > (SELECT AVG(amount) FROM wallet.balances)));

--pre
SELECT id, email
FROM wallet.users
WHERE email LIKE 'user%';

--post
SELECT id, email
FROM wallet.users
WHERE email LIKE '%.com';

-- podstr
SELECT id, email
FROM wallet.users
WHERE email LIKE '%example%';

-- regex
SELECT id, email
FROM wallet.users
WHERE email ~ '[0-9]+';

-- sub
SELECT tx_hash,
       amount,
       avg_amount,
       CASE
           WHEN amount > avg_amount THEN 'above average'
           ELSE 'below average'
           END AS amount_category
FROM wallet.transactions,
     (SELECT AVG(amount) AS avg_amount FROM wallet.transactions) sub;

-- limit
SELECT *
FROM wallet.user_logs
WHERE user_id = (SELECT id FROM wallet.users WHERE email = 'user1@example.com')
ORDER BY created_at DESC
LIMIT 5;

-->15  <63
select *
from wallet.transactions tr
where tr.amount > 15
  and tr.amount < 63;

select *
from wallet.transactions;

select *
from wallet.transactions tr
where tr.amount between 5 and 10;

INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xabc123224', 1.234567890123456789, '0xFROM2', '0xTO1', ts.id
FROM wallet.users u
         JOIN wallet.transaction_statuses ts ON ts.name = 'pending'
WHERE u.email = 'user1@example.com'
LIMIT 1;

select tx_hash, from_address, count(*) as amount
from wallet.transactions tr
group by tx_hash, tr.from_address;
