-- =========================
-- Seed data for wallet schema
-- =========================

-- Roles
INSERT INTO wallet.roles (name)
VALUES ('ADMIN'),
       ('USER')
ON CONFLICT DO NOTHING;

-- Users
INSERT INTO wallet.users (email, password, role_id)
VALUES ('admin@example.com', 'hashed_admin_pw', 1),
       ('user1@example.com', 'hashed_user1_pw', 2),
       ('user2@example.com', 'hashed_user2_pw', 2)
ON CONFLICT DO NOTHING;

-- Transaction Statuses
INSERT INTO wallet.transaction_statuses (name)
VALUES ('pending'),
       ('success'),
       ('error')
ON CONFLICT DO NOTHING;

-- Transactions
INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xabc123', 1.234567890123456789, '0xFROM1', '0xTO1', ts.id
FROM wallet.users u
         JOIN wallet.transaction_statuses ts ON ts.name = 'pending'
WHERE u.email = 'user1@example.com'
LIMIT 1;

INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xdef456', 5.000000000000000000, '0xFROM2', '0xTO2', ts.id
FROM wallet.users u
         JOIN wallet.transaction_statuses ts ON ts.name = 'success'
WHERE u.email = 'user2@example.com'
LIMIT 1;

-- Transaction Metadata
INSERT INTO wallet.transaction_metadata (transaction_id, formed_at, signature, extra_data)
SELECT t.id, now(), 'sig123', '{"note":"first tx"}'
FROM wallet.transactions t
WHERE t.tx_hash = '0xabc123';

-- Notification Types
INSERT INTO wallet.notification_types (name)
VALUES ('transaction'),
       ('balance'),
       ('system');

-- Notifications
INSERT INTO wallet.notifications (user_id, type_id, message)
SELECT u.id, nt.id, 'Your transaction is pending'
FROM wallet.users u
         JOIN wallet.notification_types nt ON nt.name = 'transaction'
WHERE u.email = 'user1@example.com';

-- Action Types
INSERT INTO wallet.action_types (name)
VALUES ('LOGIN'),
       ('LOGOUT'),
       ('CREATE_WALLET'),
       ('TRANSFER');

-- User Logs
INSERT INTO wallet.user_logs (user_id, action_id, success)
SELECT u.id, at.id, true
FROM wallet.users u
         JOIN wallet.action_types at ON at.name = 'LOGIN'
WHERE u.email = 'admin@example.com';

-- Wallets
INSERT INTO wallet.wallets (user_id, address)
SELECT u.id, '0xWALLET1'
FROM wallet.users u
WHERE u.email = 'user1@example.com';

INSERT INTO wallet.wallets (user_id, address)
SELECT u.id, '0xWALLET2'
FROM wallet.users u
WHERE u.email = 'user2@example.com';

-- Balances
INSERT INTO wallet.balances (wallet_id, amount)
SELECT w.id, 100.50
FROM wallet.wallets w
WHERE w.address = '0xWALLET1';

INSERT INTO wallet.balances (wallet_id, amount)
SELECT w.id, 250.00
FROM wallet.wallets w
WHERE w.address = '0xWALLET2';


-- =========================
-- Seed data for wallet schema (extended for JOIN/AGG/Window demos)
-- =========================

-- Roles
INSERT INTO wallet.roles (name)
VALUES ('ADMIN'),
       ('USER'),
       ('MANAGER')
ON CONFLICT DO NOTHING;

-- Users
INSERT INTO wallet.users (email, password, role_id)
VALUES ('admin@example.com', 'pw_admin', 1),
       ('user1@example.com', 'pw1', 2),
       ('user2@example.com', 'pw2', 2),
       ('user3@example.com', 'pw3', 3)
ON CONFLICT DO NOTHING;

-- Transaction Statuses
INSERT INTO wallet.transaction_statuses (name)
VALUES ('pending'),
       ('success'),
       ('failed')
ON CONFLICT DO NOTHING;

-- Transactions (multiple per user for window functions)
INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xaaa111', 5, 'A1', 'B1', ts.id
FROM wallet.users u JOIN wallet.transaction_statuses ts ON ts.name='success'
WHERE u.email='user1@example.com';
INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xaaa222', 50, 'A2', 'B2', ts.id
FROM wallet.users u JOIN wallet.transaction_statuses ts ON ts.name='failed'
WHERE u.email='user1@example.com';
INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xbbb111', 200, 'C1', 'D1', ts.id
FROM wallet.users u JOIN wallet.transaction_statuses ts ON ts.name='success'
WHERE u.email='user2@example.com';
INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xbbb222', 15, 'C2', 'D2', ts.id
FROM wallet.users u JOIN wallet.transaction_statuses ts ON ts.name='pending'
WHERE u.email='user2@example.com';
INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
SELECT u.id, '0xccc111', 300, 'E1', 'F1', ts.id
FROM wallet.users u JOIN wallet.transaction_statuses ts ON ts.name='success'
WHERE u.email='user3@example.com';

-- Transaction Metadata
INSERT INTO wallet.transaction_metadata (transaction_id, signature, extra_data)
SELECT id, 'sigA', '{"note":"u1 small"}'::json FROM wallet.transactions WHERE tx_hash='0xaaa111';
INSERT INTO wallet.transaction_metadata (transaction_id, signature, extra_data)
SELECT id, 'sigB', '{"note":"u2 big"}'::json FROM wallet.transactions WHERE tx_hash='0xbbb111';

-- Notification Types
INSERT INTO wallet.notification_types (name)
VALUES ('transaction'),
       ('balance'),
       ('system')
ON CONFLICT DO NOTHING;

-- Notifications (enough for HAVING > 2)
INSERT INTO wallet.notifications (user_id, type_id, message)
SELECT u.id, nt.id, 'Tx pending' FROM wallet.users u JOIN wallet.notification_types nt ON nt.name='transaction'
WHERE u.email='user1@example.com';
INSERT INTO wallet.notifications (user_id, type_id, message)
SELECT u.id, nt.id, 'Balance low' FROM wallet.users u JOIN wallet.notification_types nt ON nt.name='balance'
WHERE u.email='user1@example.com';
INSERT INTO wallet.notifications (user_id, type_id, message)
SELECT u.id, nt.id, 'System alert' FROM wallet.users u JOIN wallet.notification_types nt ON nt.name='system'
WHERE u.email='user1@example.com';
INSERT INTO wallet.notifications (user_id, type_id, message)
SELECT u.id, nt.id, 'Tx success' FROM wallet.users u JOIN wallet.notification_types nt ON nt.name='transaction'
WHERE u.email='user2@example.com';

-- Action Types
INSERT INTO wallet.action_types (name)
VALUES ('LOGIN'),
       ('LOGOUT'),
       ('TRANSFER')
ON CONFLICT DO NOTHING;

-- User Logs
INSERT INTO wallet.user_logs (user_id, action_id, success)
SELECT u.id, at.id, true FROM wallet.users u JOIN wallet.action_types at ON at.name='LOGIN'
WHERE u.email='admin@example.com';

-- Wallets
INSERT INTO wallet.wallets (user_id, address)
SELECT u.id, '0xWALLET1' FROM wallet.users u WHERE u.email='user1@example.com';
INSERT INTO wallet.wallets (user_id, address)
SELECT u.id, '0xWALLET2' FROM wallet.users u WHERE u.email='user2@example.com';
INSERT INTO wallet.wallets (user_id, address)
SELECT u.id, '0xWALLET3' FROM wallet.users u WHERE u.email='user3@example.com';

-- Balances (varied for INSERT INTO ... SELECT demo)
INSERT INTO wallet.balances (wallet_id, amount)
SELECT id, 120 FROM wallet.wallets WHERE address='0xWALLET1';
INSERT INTO wallet.balances (wallet_id, amount)
SELECT id, 80 FROM wallet.wallets WHERE address='0xWALLET2';
INSERT INTO wallet.balances (wallet_id, amount)
SELECT id, 300 FROM wallet.wallets WHERE address='0xWALLET3';
