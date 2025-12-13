import React from "react";
import "../../App.css";
import "./SendMoney.css";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  changeBal,
  selectUserBalance,
  selectUserIndex,
} from "../../app/appSlice";
import { NavBar } from "../nav/NavBar";
import {
  useGetPublicKeysQuery,
  useSendEtherWithTrackingMutation,
} from "../../api/apiSlice";

export function SendMoney() {
  const dispatch = useAppDispatch();

  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [msg, setMsg] = useState("");
  const [cryptoType, setCryptoType] = useState("ETH"); // Default crypto type
  const { data: publicKeys, isLoading: keysLoading } = useGetPublicKeysQuery();
  const [sendEther, { isLoading: isSending }] =
    useSendEtherWithTrackingMutation();

  const cryptoOptions = [
    { id: "ETH", name: "Ethereum" },
    { id: "BTC", name: "Bitcoin" },
    { id: "LTC", name: "LiteCoin" },
  ];

  const balance: number = useAppSelector(selectUserBalance);
  const cryptoI: number = useAppSelector(selectUserIndex);

  const handleSendEther = async () => {
    if (amount <= 0 || !address) return;

    let converted: number = amount;
    if (cryptoType === "BTC") converted = amount * 42.93;
    else if (cryptoType === "LTC") converted = amount * 0.037;

    try {
      const result = await sendEther({
        signerId: cryptoI.toString(),
        to: address,
        amountEther: converted.toString(),
      }).unwrap();

      dispatch(changeBal(converted));
      setMsg(result.msg || "Транзакция отправлена");
    } catch (error) {
      setMsg("Ошибка отправки транзакции");
      console.error("Send ether failed:", error);
    }
  };

  return (
    <>
      <h1>
        перевод средств <NavBar />{" "}
      </h1>

      <div className="container">
        <div className="left-panel">
          <div className="balance">ваш баланс {balance} ETH</div>
          <form>
            <label className="form-label">Выберите криптовалюту:</label>
            <select
              value={cryptoType}
              onChange={(e) => setCryptoType(e.target.value)}
              className="form-select"
            >
              {cryptoOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            <label className="form-label">количество</label>
            <input
              type="text"
              name="amount"
              className="form-input"
              min="0"
              pattern="[0-9]*"
              onChange={(e) => setAmount(parseFloat(e.target.value))}
            />
            <label className="form-label">адресс получателя</label>
            <select
              style={{
                width: "50%",
                marginBottom: "20px",
                borderRadius: "5px",
              }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={keysLoading}
            >
              <option value="">Выберите адрес</option>
              {publicKeys?.map((publicKey) => (
                <option key={publicKey} value={publicKey}>
                  {publicKey}
                </option>
              ))}
            </select>
            {amount > 0 && address !== "" ? (
              <button
                disabled={isSending}
                className="send-button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSendEther();
                }}
              >
                {isSending ? "Отправка..." : "отправить ефир"}
              </button>
            ) : (
              <div className="error-message">
                неправильный ввод количества или адресса
              </div>
            )}
            <div>{msg}</div>
          </form>
        </div>
      </div>
    </>
  );
}
