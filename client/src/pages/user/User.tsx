/* eslint-disable jsx-a11y/alt-text */
import React, { useEffect, useState } from "react";
import "./User.css";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import {
  selectUserName,
  selectUserBalance,
  selectUserIndex,
  setBalance,
} from "../../app/appSlice";
import { NavBar } from "../nav/NavBar";
import { api } from "../../api/interceptor";
import { useCreateUserMutation } from "../../api/apiSlice";

function UserPage() {
  const dispatch = useAppDispatch();

  const username: string = useAppSelector(selectUserName);
  const cryptoI = useAppSelector(selectUserIndex);
  const balance: number = useAppSelector(selectUserBalance);

  useEffect(() => {
    api
      .get(`/blockchain/balance/${cryptoI}`)
      .then((res: any) => {
        dispatch(setBalance(res.data.balance));
      })
      .catch((error) => {
        console.error("Failed to fetch balance:", error);
      });
  }, [dispatch, cryptoI]);

  return (
    <div>
      <header>
        <h1>
          Здравствуйте {username}, ваш баланс {balance} ETH
          <NavBar />
        </h1>
      </header>
      <ul>
        <li className="liU">
          <Link className="link" to="/user">
            Главная
          </Link>
        </li>
        <li className="liU">
          <Link className="link" to="/user/sendMoney">
            Перевод средств
          </Link>
        </li>
        <li className="liU">
          <Link className="link" to="/user/wallets">
            Управление кошельками
          </Link>
        </li>
        <li className="liU">
          <Link className="link" to="/user/transactions">
            История транзакций
          </Link>
        </li>
        <li className="liU">
          <Link className="link" to="/user/notifications">
            Уведомления
          </Link>
        </li>
        <li className="liU">
          <Link className="link" to="/">
            Выйти
          </Link>
        </li>
      </ul>
    </div>
  );
}

//for new User
function Create() {
  const [newemail, setNewEmail] = useState("");
  const [newpass, setNewPass] = useState("");
  const [secpass, setSecPass] = useState("");
  const [donExist, setDonExist] = useState(false);
  const [createUser, { isLoading, isError }] = useCreateUserMutation();

  const handleCreateUser = async () => {
    if (newemail && newpass && newpass === secpass) {
      try {
        const result = await createUser({
          email: newemail,
          password: newpass,
        }).unwrap();
        setDonExist(result.dontExist);
      } catch (error) {
        console.error("User creation failed:", error);
      }
    }
  };

  return (
    <>
      <div id="createWrap">
        <div className="greating">Введите данные для создания пользователя</div>
        <form>
          <label>Email</label>
          <input
            type="email"
            name="email"
            id="email"
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Введите email"
          />
          <label>Пароль</label>
          <input
            type="password"
            name="password"
            id="addPass"
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Введите пароль"
          />
          <label>Подтвердите пароль</label>
          <input
            type="password"
            name="password"
            id="confirmPass"
            onChange={(e) => setSecPass(e.target.value)}
            placeholder="Подтвердите пароль"
          />
        </form>
        <div>
          <button
            className="loginBtn"
            onClick={handleCreateUser}
            disabled={isLoading}
          >
            {isLoading ? "Создание..." : "Создать пользователя"}
          </button>
          {isError && (
            <div className="errorMass">Ошибка создания пользователя</div>
          )}
          {donExist && (
            <div className="errorMass">Пользователь уже существует</div>
          )}
        </div>
        <div className="errorMass">
          {secpass === newpass
            ? ""
            : "Проверьте поля: подтверждения пароля и пароль"}
          {donExist === false
            ? ""
            : "Пользователь с текущим email уже существует"}
        </div>
        <div>
          <button className="backBtn">
            <Link className="Link" to="/">
              Назад
            </Link>
          </button>
        </div>
      </div>
    </>
  );
}

export { UserPage, Create };
