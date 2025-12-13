import React, { useState } from "react";
import "../../App.css";
import "./User.css";
import { Link } from "react-router-dom";
import { NavBar } from "../nav/NavBar";
import {
  useGetUserTransactionsQuery,
  useConfirmTransactionMutation,
} from "../../api/apiSlice";
import { Transaction, TransactionStatus } from "../../types/transaction.types";

function TransactionsPage() {
  const [success, setSuccess] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useGetUserTransactionsQuery();
  const [confirmTransaction, { isLoading: isConfirming }] =
    useConfirmTransactionMutation();

  const handleViewTransaction = async (txHash: string) => {
    try {
      // For individual transaction details, we'll use the existing data from the list
      const transaction = transactions.find((tx) => tx.txHash === txHash);
      if (transaction) {
        setSelectedTransaction(transaction);
      }
    } catch (err) {
      console.error("Error viewing transaction:", err);
    }
  };

  const handleConfirmTransaction = async (txHash: string) => {
    try {
      await confirmTransaction({ txHash }).unwrap();
      setSuccess("Транзакция успешно подтверждена");
      refetch(); // Reload transactions
      if (selectedTransaction?.txHash === txHash) {
        handleViewTransaction(txHash); // Update selected transaction
      }
    } catch (err) {
      console.error("Error confirming transaction:", err);
    }
  };

  const getStatusColor = (status: TransactionStatus | string) => {
    switch (status) {
      case TransactionStatus.CONFIRMED:
        return "#28a745"; // green
      case TransactionStatus.PENDING:
        return "#ffc107"; // yellow
      case TransactionStatus.FAILED:
        return "#dc3545"; // red
      case TransactionStatus.CANCELLED:
        return "#6c757d"; // gray
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status: TransactionStatus | string) => {
    switch (status) {
      case TransactionStatus.CONFIRMED:
        return "Подтверждена";
      case TransactionStatus.PENDING:
        return "В ожидании";
      case TransactionStatus.FAILED:
        return "Не удалась";
      case TransactionStatus.CANCELLED:
        return "Отменена";
      default:
        return status;
    }
  };

  return (
    <div>
      <header>
        <h1>
          История транзакций
          <NavBar />
        </h1>
      </header>

      <div className="transactions-container">
        {/* Transactions List */}
        <div className="transactions-list">
          <h2>Мои транзакции</h2>
          {isLoading && transactions.length === 0 ? (
            <div>Загрузка...</div>
          ) : transactions.length === 0 ? (
            <div>У вас пока нет транзакций</div>
          ) : (
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Хеш транзакции</th>
                    <th>Сумма</th>
                    <th>От</th>
                    <th>Кому</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="tx-hash">
                        {transaction.txHash.slice(0, 10)}...
                        {transaction.txHash.slice(-8)}
                      </td>
                      <td>{transaction.amount} ETH</td>
                      <td>
                        {transaction.fromAddress
                          ? `${transaction.fromAddress.slice(
                              0,
                              6
                            )}...${transaction.fromAddress.slice(-4)}`
                          : "-"}
                      </td>
                      <td>
                        {transaction.toAddress
                          ? `${transaction.toAddress.slice(
                              0,
                              6
                            )}...${transaction.toAddress.slice(-4)}`
                          : "-"}
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: getStatusColor(
                              transaction.status || "PENDING"
                            ),
                          }}
                        >
                          {getStatusText(transaction.status || "PENDING")}
                        </span>
                      </td>
                      <td>
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() =>
                            handleViewTransaction(transaction.txHash)
                          }
                        >
                          Просмотр
                        </button>
                        {transaction.status === TransactionStatus.PENDING && (
                          <button
                            className="confirm-btn"
                            onClick={() =>
                              handleConfirmTransaction(transaction.txHash)
                            }
                            disabled={isConfirming}
                          >
                            {isConfirming ? "Подтверждение..." : "Подтвердить"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div className="transaction-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Детали транзакции</h3>
                <button
                  className="close-btn"
                  onClick={() => setSelectedTransaction(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="transaction-detail">
                  <label>Хеш транзакции:</label>
                  <span>{selectedTransaction.txHash}</span>
                </div>
                <div className="transaction-detail">
                  <label>Сумма:</label>
                  <span>{selectedTransaction.amount} ETH</span>
                </div>
                <div className="transaction-detail">
                  <label>От:</label>
                  <span>{selectedTransaction.fromAddress || "-"}</span>
                </div>
                <div className="transaction-detail">
                  <label>Кому:</label>
                  <span>{selectedTransaction.toAddress || "-"}</span>
                </div>
                <div className="transaction-detail">
                  <label>Статус:</label>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(
                        selectedTransaction.status || "PENDING"
                      ),
                    }}
                  >
                    {getStatusText(selectedTransaction.status || "PENDING")}
                  </span>
                </div>
                <div className="transaction-detail">
                  <label>Дата создания:</label>
                  <span>
                    {new Date(selectedTransaction.createdAt).toLocaleString()}
                  </span>
                </div>
                {selectedTransaction.updatedAt && (
                  <div className="transaction-detail">
                    <label>Дата обновления:</label>
                    <span>
                      {new Date(selectedTransaction.updatedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedTransaction.formedAt && (
                  <div className="transaction-detail">
                    <label>Сформирована:</label>
                    <span>
                      {new Date(selectedTransaction.formedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedTransaction.signature && (
                  <div className="transaction-detail">
                    <label>Подпись:</label>
                    <span className="signature">
                      {selectedTransaction.signature}
                    </span>
                  </div>
                )}
                {selectedTransaction.extraData && (
                  <div className="transaction-detail">
                    <label>Доп. данные:</label>
                    <pre>
                      {JSON.stringify(selectedTransaction.extraData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {selectedTransaction.status === TransactionStatus.PENDING && (
                  <button
                    className="confirm-btn"
                    onClick={() =>
                      handleConfirmTransaction(selectedTransaction.txHash)
                    }
                    disabled={isConfirming}
                  >
                    {isConfirming
                      ? "Подтверждение..."
                      : "Подтвердить транзакцию"}
                  </button>
                )}
                <button
                  className="close-btn"
                  onClick={() => setSelectedTransaction(null)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && <div className="errorMass">Ошибка загрузки транзакций</div>}
      {success && <div className="successMass">{success}</div>}

      <div className="navigation-links">
        <Link className="link" to="/user">
          ← Назад к главной
        </Link>
      </div>

      <style>{`
        .transactions-container {
          padding: 20px;
        }
        
        .transactions-table {
          margin-top: 20px;
        }
        
        .transactions-table table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .transactions-table th,
        .transactions-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .transactions-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .tx-hash {
          font-family: monospace;
          font-size: 12px;
        }
        
        .status-badge {
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .view-btn, .confirm-btn {
          margin-right: 5px;
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .view-btn {
          background-color: #007bff;
          color: white;
        }
        
        .confirm-btn {
          background-color: #28a745;
          color: white;
        }
        
        .transaction-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
        
        .transaction-detail {
          margin-bottom: 15px;
        }
        
        .transaction-detail label {
          font-weight: bold;
          margin-right: 10px;
        }
        
        .signature {
          font-family: monospace;
          font-size: 12px;
          word-break: break-all;
        }
        
        .modal-footer {
          margin-top: 20px;
          text-align: right;
        }
        
        .successMass {
          color: #28a745;
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
}

export default TransactionsPage;
