import React from "react";
import "../../App.css";
import "./SendMoney.css";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  changeBal,
  selectUserBalance,
  selectUserIndex,
} from "../../app/appSlice";
import { NavBar } from "../nav/NavBar";
import { axGetPublicKeys} from "../../api/api";
import {api} from "../../api/interceptor";

export function SendMoney() {
  const dispatch = useAppDispatch();

  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [checkForInput, setCheckForInput] = useState(false);
  const [click, setClick] = useState(0);
  const [msg, setMsg] = useState("");
  const [cryptoType, setCryptoType] = useState("ETH"); // Default crypto type
  const [publicKeys, setPublicKeys] = useState<string[]>();
const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const cryptoOptions = [
    { id: "ETH", name: "Ethereum" },
    { id: "BTC", name: "Bitcoin" },
    { id: "LTC", name: "LiteCoin" },
  ];

  const balance: number = useAppSelector(selectUserBalance);
  const cryptoI: number = useAppSelector(selectUserIndex);


  useEffect(() => {
    axGetPublicKeys().then((res) => {
     setPublicKeys(res);
    });
  }, []);

  useEffect(() => {
    if (amount > 0) setCheckForInput(true);
    else setCheckForInput(false);

    if (click > 0) {
      setIsButtonDisabled(true);
      let converted: number = amount;

      if (cryptoType === "BTC") converted = amount * 42.93;
      else if (cryptoType === "LTC") converted = amount * 0.037;

      api
        .post('/blockchain/sendEther', {
          signerId: cryptoI || 0,
          to: address,
          amountEther: converted.toString(),
        })
        .then((res) => {
          setIsButtonDisabled(false);

          dispatch(changeBal(converted));
          setMsg(res.data.msg);
          setClick(0);
        })
    }
  }, [amount, address, click, cryptoType, cryptoI, dispatch]);

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
            <select style={{width: "50%", marginBottom:'20px',borderRadius:'5px'}}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}>
              {publicKeys?.map((publicKey)=>(
                  <option value={publicKey}>{publicKey}</option>
              ))}
            </select>
            {checkForInput && address !== "" ? (
              <button
                disabled={isButtonDisabled}
                className="send-button"
                onClick={(e) => {
                  e.preventDefault();
                  setClick(click + 1);
                }}
              >
                отправить ефир
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
