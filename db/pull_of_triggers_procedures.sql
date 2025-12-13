CREATE OR REPLACE FUNCTION wallet.fn_update_balance_on_tx()
    RETURNS TRIGGER AS
$$
BEGIN
    -- only run if status is 'success'
    IF NEW.status_id = (SELECT id FROM wallet.transaction_statuses WHERE name = 'success') THEN
        -- Deduct from sender
        UPDATE wallet.balances
        SET amount = amount - NEW.amount
        WHERE wallet_id = (SELECT id FROM wallet.wallets WHERE address = NEW.from_address);

        -- Credit to receiver
        UPDATE wallet.balances
        SET amount = amount + NEW.amount
        WHERE wallet_id = (SELECT id FROM wallet.wallets WHERE address = NEW.to_address);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance_on_tx
    AFTER INSERT
    ON wallet.transactions
    FOR EACH ROW
EXECUTE FUNCTION wallet.fn_update_balance_on_tx();

--Notification Auto‑Insert on Transaction Status Change
CREATE OR REPLACE FUNCTION wallet.fn_notify_on_status_change()
    RETURNS TRIGGER AS
$$
DECLARE
    notif_type_id INT;
BEGIN
    SELECT id INTO notif_type_id FROM wallet.notification_types WHERE name = 'transaction';

    INSERT INTO wallet.notifications (user_id, type_id, message)
    VALUES (NEW.user_id, notif_type_id, 'Transaction ' || NEW.tx_hash || ' is now ' ||
                                        (SELECT name FROM wallet.transaction_statuses WHERE id = NEW.status_id));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_status_change
    AFTER UPDATE OF status_id
    ON wallet.transactions
    FOR EACH ROW
    WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id)
EXECUTE FUNCTION wallet.fn_notify_on_status_change();

--Audit Log on User Actions
CREATE OR REPLACE FUNCTION wallet.fn_audit_user_log()
    RETURNS TRIGGER AS
$$
BEGIN
    UPDATE wallet.user_logs
    SET created_at = now()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_user_log
    AFTER INSERT
    ON wallet.user_logs
    FOR EACH ROW
EXECUTE FUNCTION wallet.fn_audit_user_log();

--Prevent Negative Balances
CREATE OR REPLACE FUNCTION wallet.fn_check_balance_nonnegative()
    RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.amount < 0 THEN
        RAISE EXCEPTION 'Balance cannot be negative';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_balance_nonnegative
    BEFORE UPDATE OR INSERT
    ON wallet.balances
    FOR EACH ROW
EXECUTE FUNCTION wallet.fn_check_balance_nonnegative();

--Auto‑Generate Metadata Timestamp
CREATE OR REPLACE FUNCTION wallet.fn_set_metadata_timestamp()
    RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.formed_at IS NULL THEN
        NEW.formed_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_metadata_timestamp
    BEFORE INSERT
    ON wallet.transaction_metadata
    FOR EACH ROW
EXECUTE FUNCTION wallet.fn_set_metadata_timestamp();

------------------------------------------------------

--Register User
CREATE OR REPLACE PROCEDURE wallet.sp_register_user(
    p_email VARCHAR,
    p_password VARCHAR,
    p_role_name VARCHAR DEFAULT 'USER'
)
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_role_id INT;
BEGIN
    SELECT id INTO v_role_id FROM wallet.roles WHERE name = p_role_name;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % not found', p_role_name;
    END IF;

    INSERT INTO wallet.users (email, password, role_id)
    VALUES (p_email, p_password, v_role_id);
END;
$$;
CALL wallet.sp_register_user('alice@example.com', 'pw123', 'USER');

--Create Transaction
CREATE OR REPLACE PROCEDURE wallet.sp_create_transaction(
    p_user_email VARCHAR,
    p_tx_hash VARCHAR,
    p_amount NUMERIC,
    p_from VARCHAR,
    p_to VARCHAR,
    p_status_name VARCHAR
)
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_user_id   UUID;
    v_status_id INT;
BEGIN
    SELECT id INTO v_user_id FROM wallet.users WHERE email = p_user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found', p_user_email;
    END IF;

    SELECT id INTO v_status_id FROM wallet.transaction_statuses WHERE name = p_status_name;
    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Status % not found', p_status_name;
    END IF;

    INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id)
    VALUES (v_user_id, p_tx_hash, p_amount, p_from, p_to, v_status_id);
END;
$$;
CALL wallet.sp_create_transaction('alice@example.com', '0xTX123', 10, '0xFROM', '0xTO', 'pending');

--Update Transaction Status
CREATE OR REPLACE PROCEDURE wallet.sp_update_transaction_status(
    p_tx_hash VARCHAR,
    p_new_status VARCHAR
)
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_status_id INT;
BEGIN
    SELECT id INTO v_status_id FROM wallet.transaction_statuses WHERE name = p_new_status;
    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Status % not found', p_new_status;
    END IF;

    UPDATE wallet.transactions
    SET status_id  = v_status_id,
        updated_at = now()
    WHERE tx_hash = p_tx_hash;
END;
$$;
CALL wallet.sp_update_transaction_status('0xTX123', 'success');

--Log User Action
CREATE OR REPLACE PROCEDURE wallet.sp_log_user_action(
    p_user_email VARCHAR,
    p_action_name VARCHAR,
    p_success BOOLEAN
)
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_user_id   UUID;
    v_action_id INT;
BEGIN
    SELECT id INTO v_user_id FROM wallet.users WHERE email = p_user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found', p_user_email;
    END IF;

    SELECT id INTO v_action_id FROM wallet.action_types WHERE name = p_action_name;
    IF v_action_id IS NULL THEN
        RAISE EXCEPTION 'Action % not found', p_action_name;
    END IF;

    INSERT INTO wallet.user_logs (user_id, action_id, success)
    VALUES (v_user_id, v_action_id, p_success);
END;
$$;
CALL wallet.sp_log_user_action('alice@example.com', 'LOGIN', true);


--Adjust Balance (MANUAL)
CREATE OR REPLACE PROCEDURE wallet.sp_adjust_balance(
    p_wallet_address VARCHAR,
    p_delta NUMERIC
)
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_wallet_id UUID;
BEGIN
    SELECT id INTO v_wallet_id FROM wallet.wallets WHERE address = p_wallet_address;
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet % not found', p_wallet_address;
    END IF;

    UPDATE wallet.balances
    SET amount     = amount + p_delta,
        updated_at = now()
    WHERE wallet_id = v_wallet_id;
END;
$$;
CALL wallet.sp_adjust_balance('0xWALLET1', 50);

CALL wallet.sp_adjust_balance('0xWALLET1', 10);
