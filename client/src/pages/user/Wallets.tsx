import React, { useState } from "react";
import "../../App.css";
import "./User.css";
import { Link } from "react-router-dom";
import { NavBar } from "../nav/NavBar";
import {
  useCreateWalletMutation,
  useGetUserWalletsQuery,
} from "../../api/apiSlice";

function WalletsPage() {
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [success, setSuccess] = useState("");

  const {
    data: wallets = [],
    isLoading,
    error,
    refetch,
  } = useGetUserWalletsQuery();
  const [createWallet, { isLoading: isCreating }] = useCreateWalletMutation();

  // For simplicity, we'll show wallets without individual balance queries
  // Balance can be refreshed manually or fetched when needed

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newWalletAddress.trim()) {
      return;
    }

    try {
      await createWallet({ address: newWalletAddress }).unwrap();
      setSuccess("Кошелек успешно создан");
      setNewWalletAddress("");
      refetch(); // Refresh wallets list
    } catch (err) {
      console.error("Wallet creation failed:", err);
    }
  };

  const handleRefreshBalance = async (walletAddress: string) => {
    refetch(); // Refresh all data including balances
  };

  return (
    <div>
      <header>
        <h1>
          Управление кошельками
          <NavBar />
        </h1>
      </header>

      <div className="wallets-container">
        {/* Create Wallet Form */}
        <div className="create-wallet-form">
          <h2>Создать новый кошелек</h2>
          <form onSubmit={handleCreateWallet}>
            <div className="form-group">
              <label htmlFor="walletAddress">Адрес кошелька:</label>
              <input
                type="text"
                id="walletAddress"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <button type="submit" className="loginBtn" disabled={isCreating}>
              {isCreating ? "Создание..." : "Создать кошелек"}
            </button>
          </form>

          {error && <div className="errorMass">Ошибка загрузки кошельков</div>}
          {success && <div className="successMass">{success}</div>}
        </div>

        {/* Wallets List */}
        <div className="wallets-list">
          <h2>Мои кошельки</h2>
          {isLoading && wallets.length === 0 ? (
            <div>Загрузка...</div>
          ) : wallets.length === 0 ? (
            <div>У вас пока нет кошельков</div>
          ) : (
            <div className="wallets-grid">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="wallet-card">
                  <div className="wallet-info">
                    <h3>Кошелек</h3>
                    <p className="wallet-address">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </p>
                    <p className="wallet-balance">
                      Баланс: Нажмите "Обновить баланс"
                    </p>
                    <p className="wallet-date">
                      Создан: {new Date(wallet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="wallet-actions">
                    <button
                      className="refresh-btn"
                      onClick={() => handleRefreshBalance(wallet.address)}
                    >
                      Обновить баланс
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="navigation-links">
        <Link className="link" to="/user">
          ← Назад к главной
        </Link>
      </div>
    </div>
  );
}

export default WalletsPage;
