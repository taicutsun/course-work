SELECT u.id, u.email, r.name AS role_name
FROM wallet.users u
         JOIN wallet.roles r ON u.role_id = r.id;

SELECT u.id, u.email, n.message
FROM wallet.users u
         LEFT JOIN wallet.notifications n ON u.id = n.user_id;

SELECT n.id, n.message, u.email
FROM wallet.notifications n
         RIGHT JOIN wallet.users u ON n.user_id = u.id;

SELECT u.email, n.message
FROM wallet.users u
         FULL JOIN wallet.notifications n ON u.id = n.user_id;

SELECT u.email, r.name AS role_name
FROM wallet.users u
         CROSS JOIN wallet.roles r;

--self
SELECT t1.id, t1.tx_hash, t2.tx_hash AS other_tx
FROM wallet.transactions t1
         JOIN wallet.transactions t2 ON t1.user_id = t2.user_id
WHERE t1.id <> t2.id;

--aggregate
SELECT ts.name AS status_name, COUNT(*) AS tx_count
FROM wallet.transactions t
         JOIN wallet.transaction_statuses ts ON t.status_id = ts.id
GROUP BY ts.name;

SELECT u.email, AVG(b.amount) AS avg_balance
FROM wallet.users u
         JOIN wallet.wallets w ON u.id = w.user_id
         JOIN wallet.balances b ON w.id = b.wallet_id
GROUP BY u.email;

-- window
SELECT t.user_id,
       t.tx_hash,
       t.amount,
       RANK() OVER (PARTITION BY t.user_id ORDER BY t.amount DESC) AS rank_per_user
FROM wallet.transactions t;

SELECT t.user_id,
       t.tx_hash,
       t.amount,
       SUM(t.amount) OVER (PARTITION BY t.user_id)                      AS total_amount,
       ROUND(t.amount / SUM(t.amount) OVER (PARTITION BY t.user_id), 4) AS share
FROM wallet.transactions t;

--having
SELECT u.email
FROM wallet.users u
         JOIN wallet.notifications n ON u.id = n.user_id
GROUP BY u.email
HAVING COUNT(n.id) > 2;

-- union
SELECT u.email, u.password
FROM wallet.users u
UNION
SELECT w.from_address, w.to_address
FROM wallet.transactions w;

SELECT tx_hash, amount, 'success' AS category
FROM wallet.transactions t
         JOIN wallet.transaction_statuses ts ON t.status_id = ts.id
WHERE ts.name = 'success'
UNION
SELECT tx_hash, amount, 'failed' AS category
FROM wallet.transactions t
         JOIN wallet.transaction_statuses ts ON t.status_id = ts.id
WHERE ts.name = 'failed';

-- exists
SELECT u.id, u.email
FROM wallet.users u
WHERE EXISTS (SELECT 1
              FROM wallet.transactions t
              WHERE t.user_id = u.id);

-- INSERT INTO SELECT
INSERT INTO wallet.notifications (user_id, type_id, message)
SELECT u.id, nt.id, 'High balance alert'
FROM wallet.users u
         JOIN wallet.wallets w ON u.id = w.user_id
         JOIN wallet.balances b ON w.id = b.wallet_id
         JOIN wallet.notification_types nt ON nt.name = 'system'
WHERE b.amount > 100;

-- CASE
SELECT tx_hash,
       amount,
       CASE
           WHEN amount < 10 THEN 'small'
           WHEN amount BETWEEN 10 AND 100 THEN 'medium'
           ELSE 'large'
           END AS amount_category
FROM wallet.transactions;

-- EXPLAIN
EXPLAIN
SELECT u.email, COUNT(t.id) AS tx_count
FROM wallet.users u
         JOIN wallet.transactions t ON u.id = t.user_id
GROUP BY u.email;

--view
CREATE VIEW test AS
SELECT *
FROM wallet.users;

select *, count(w.address) as count
from wallet.users u
         left join wallet.wallets w on u.id = w.user_id
group by u.id, u.email, u.password, u.role_id, u.created_at, u.updated_at, w.id, w.user_id, w.address, w.created_at