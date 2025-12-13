// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
//import "hardhat/console.sol";

//npx hardhat ignition deploy ./ignition/modules/Lock.ts --network localhost

contract Lock {
    address payable public owner;
    
    // Transaction status enum to match database schema
    enum TransactionStatus { PENDING, CONFIRMED, FAILED, CANCELLED }
    
    // Struct to store transaction data matching database schema
    struct Transaction {
        string txHash;
        address from;
        address to;
        uint256 amount;
        TransactionStatus status;
        uint256 timestamp;
        uint256 formedAt;
        string signature;
        bool exists;
    }
    
    // Struct for wallet management
    struct Wallet {
        address walletAddress;
        uint256 balance;
        uint256 createdAt;
        bool exists;
    }
    
    // Mappings to track data
    mapping(string => Transaction) public transactions;
    mapping(address => Wallet) public wallets;
    mapping(address => string[]) public userTransactions;
    
    // Arrays to track all transactions and wallets
    string[] public allTransactionHashes;
    address[] public allWallets;
    
    // Events to match database schema
    event TransactionCreated(
        string indexed txHash,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event TransactionStatusUpdated(
        string indexed txHash,
        TransactionStatus oldStatus,
        TransactionStatus newStatus,
        uint256 timestamp
    );
    
    event WalletCreated(
        address indexed walletAddress,
        uint256 initialBalance,
        uint256 timestamp
    );
    
    event BalanceUpdated(
        address indexed walletAddress,
        uint256 oldBalance,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event EtherForwarded(
        address indexed from, 
        address indexed to, 
        uint amount,
        string txHash
    );
    
    event Withdrawal(uint amount, uint when);

    constructor() payable {
        owner = payable(msg.sender);
    }
    
    // Function to create/register a wallet
    function createWallet(address walletAddress) external {
        require(!wallets[walletAddress].exists, "Wallet already exists");
        require(walletAddress != address(0), "Invalid wallet address");
        
        wallets[walletAddress] = Wallet({
            walletAddress: walletAddress,
            balance: 0,
            createdAt: block.timestamp,
            exists: true
        });
        
        allWallets.push(walletAddress);
        
        emit WalletCreated(walletAddress, 0, block.timestamp);
    }
    
    // Function to create a transaction record
    function createTransaction(
        string memory txHash,
        address to,
        uint256 amount,
        uint256 formedAt,
        string memory signature
    ) external {
        require(bytes(transactions[txHash].txHash).length == 0, "Transaction already exists");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(wallets[msg.sender].exists, "Sender wallet not registered");
        require(wallets[to].exists, "Recipient wallet not registered");
        require(wallets[msg.sender].balance >= amount, "Insufficient balance");
        
        transactions[txHash] = Transaction({
            txHash: txHash,
            from: msg.sender,
            to: to,
            amount: amount,
            status: TransactionStatus.PENDING,
            timestamp: block.timestamp,
            formedAt: formedAt,
            signature: signature,
            exists: true
        });
        
        allTransactionHashes.push(txHash);
        userTransactions[msg.sender].push(txHash);
        userTransactions[to].push(txHash);
        
        emit TransactionCreated(txHash, msg.sender, to, amount, block.timestamp);
    }
    
    // Function to confirm and execute a transaction
    function confirmTransaction(string memory txHash) external {
        require(transactions[txHash].exists, "Transaction does not exist");
        require(transactions[txHash].status == TransactionStatus.PENDING, "Transaction not pending");
        require(transactions[txHash].from == msg.sender || msg.sender == owner, "Not authorized");
        
        Transaction storage transaction = transactions[txHash];
        address from = transaction.from;
        address to = transaction.to;
        uint256 amount = transaction.amount;
        
        require(wallets[from].balance >= amount, "Insufficient balance");
        
        // Update balances
        wallets[from].balance -= amount;
        wallets[to].balance += amount;
        
        // Update transaction status
        transaction.status = TransactionStatus.CONFIRMED;
        
        // Transfer ether
        bool success = payable(to).send(amount);
        require(success, "Transfer failed");
        
        emit BalanceUpdated(from, wallets[from].balance + amount, wallets[from].balance, block.timestamp);
        emit BalanceUpdated(to, wallets[to].balance - amount, wallets[to].balance, block.timestamp);
        emit TransactionStatusUpdated(txHash, TransactionStatus.PENDING, TransactionStatus.CONFIRMED, block.timestamp);
        emit EtherForwarded(from, to, amount, txHash);
    }
    
    // Function to fail a transaction
    function failTransaction(string memory txHash) external {
        require(transactions[txHash].exists, "Transaction does not exist");
        require(transactions[txHash].status == TransactionStatus.PENDING, "Transaction not pending");
        require(transactions[txHash].from == msg.sender || msg.sender == owner, "Not authorized");
        
        TransactionStatus oldStatus = transactions[txHash].status;
        transactions[txHash].status = TransactionStatus.FAILED;
        
        emit TransactionStatusUpdated(txHash, oldStatus, TransactionStatus.FAILED, block.timestamp);
    }
    
    // Function to cancel a transaction
    function cancelTransaction(string memory txHash) external {
        require(transactions[txHash].exists, "Transaction does not exist");
        require(transactions[txHash].status == TransactionStatus.PENDING, "Transaction not pending");
        require(transactions[txHash].from == msg.sender || msg.sender == owner, "Not authorized");
        
        TransactionStatus oldStatus = transactions[txHash].status;
        transactions[txHash].status = TransactionStatus.CANCELLED;
        
        emit TransactionStatusUpdated(txHash, oldStatus, TransactionStatus.CANCELLED, block.timestamp);
    }
    
    // Function to get transaction details
    function getTransaction(string memory txHash) external view returns (
        address from,
        address to,
        uint256 amount,
        TransactionStatus status,
        uint256 timestamp,
        uint256 formedAt,
        string memory signature
    ) {
        require(transactions[txHash].exists, "Transaction does not exist");
        
        Transaction memory transaction = transactions[txHash];
        return (
            transaction.from,
            transaction.to,
            transaction.amount,
            transaction.status,
            transaction.timestamp,
            transaction.formedAt,
            transaction.signature
        );
    }
    
    // Function to get wallet balance
    function getWalletBalance(address walletAddress) external view returns (uint256) {
        require(wallets[walletAddress].exists, "Wallet does not exist");
        return wallets[walletAddress].balance;
    }
    
    // Function to get user transactions
    function getUserTransactions(address user) external view returns (string[] memory) {
        return userTransactions[user];
    }
    
    // Function to get all transaction hashes
    function getAllTransactionHashes() external view returns (string[] memory) {
        return allTransactionHashes;
    }
    
    // Function to get all wallet addresses
    function getAllWallets() external view returns (address[] memory) {
        return allWallets;
    }
    
    // Function to forward Ether sent to this contract to another address (legacy support)
    function forwardEther(address payable _to) external payable {
        require(msg.sender != _to, "Cant transfer ether to yourself");
        require(msg.value > 0, "No Ether sent");
         
        bool success = _to.send(msg.value);
        require(success, "Transfer failed");

        // Create a simple transaction record for legacy compatibility
        string memory txHash = string(abi.encodePacked(block.timestamp, msg.sender, _to, msg.value));
        
        if (!wallets[msg.sender].exists) {
            wallets[msg.sender] = Wallet({
                walletAddress: msg.sender,
                balance: 0,
                createdAt: block.timestamp,
                exists: true
            });
            allWallets.push(msg.sender);
        }
        
        if (!wallets[_to].exists) {
            wallets[_to] = Wallet({
                walletAddress: _to,
                balance: 0,
                createdAt: block.timestamp,
                exists: true
            });
            allWallets.push(_to);
        }

        emit EtherForwarded(msg.sender, _to, msg.value, txHash);
    }

    function withdraw() public {
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
    
    // Function to receive Ether
    receive() external payable {
        // Auto-create wallet if it doesn't exist
        if (!wallets[msg.sender].exists) {
            wallets[msg.sender] = Wallet({
                walletAddress: msg.sender,
                balance: msg.value,
                createdAt: block.timestamp,
                exists: true
            });
            allWallets.push(msg.sender);
            emit WalletCreated(msg.sender, msg.value, block.timestamp);
        } else {
            wallets[msg.sender].balance += msg.value;
            emit BalanceUpdated(msg.sender, wallets[msg.sender].balance - msg.value, wallets[msg.sender].balance, block.timestamp);
        }
    }
    
    // Fallback function
    fallback() external payable {
        // Same logic as receive
        if (!wallets[msg.sender].exists) {
            wallets[msg.sender] = Wallet({
                walletAddress: msg.sender,
                balance: msg.value,
                createdAt: block.timestamp,
                exists: true
            });
            allWallets.push(msg.sender);
            emit WalletCreated(msg.sender, msg.value, block.timestamp);
        } else {
            wallets[msg.sender].balance += msg.value;
            emit BalanceUpdated(msg.sender, wallets[msg.sender].balance - msg.value, wallets[msg.sender].balance, block.timestamp);
        }
    }
}
