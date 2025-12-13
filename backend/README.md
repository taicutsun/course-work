# Crypto Wallet Backend
## Database Setup
Database must be initialized with SQL files from `/db` directory:
```bash
# Initialize database with schema and triggers
psql -U postgres -d WalletDb -f db/initWallerDb.sql
psql -U postgres -d WalletDb -f db/pull_of_triggers_procedures.sql
```

## Environment Variables
Create `.env` file in project root:
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres

# Blockchain
RPC_URL=http://localhost:8545
OWNER_KEY=your_private_key

# JWT
ACCESS_TOKEN_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

## Installation
```bash
npm install

npm run start:dev
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/token` - Refresh access token

### Users
- `POST /users/create` - Create new user
- `GET /users/me/wallets` - Get user wallets
- `GET /users/me/notifications` - Get user notifications
- `PUT /users/me/notifications/:id/read` - Mark notification as read
- `GET /users/me/role` - Get user role
- `PUT /users/me/role` - Update user role
- `GET /users/me/logs` - Get user activity logs

### Blockchain
- `GET /blockchain/publicKeys` - Get public keys
- `GET /blockchain/balance?cryptoI=id` - Get balance
- `POST /blockchain/sendEther` - Send ether
- `POST /blockchain/createWallet` - Create wallet
- `GET /blockchain/wallet/:address/balance` - Get wallet balance
- `GET /blockchain/user/transactions` - Get user transactions
- `GET /blockchain/transaction/:txHash` - Get transaction details
- `POST /blockchain/confirmTransaction` - Confirm transaction
- `GET /blockchain/user/wallets` - Get user wallets
- `GET /blockchain/transaction-statuses` - Get transaction statuses

## Features
- Email-based authentication with JWT
- Wallet management
- Transaction tracking with status updates
- Real-time notifications
- User activity logging
- Blockchain integration with enhanced contract features
- Automatic balance updates via database triggers