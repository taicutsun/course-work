import React from "react";
import "../../App.css";
import "./Login.css";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
//redux imports
import { useAppDispatch } from "../../app/hooks";
import { setUser, UserState } from "../../app/appSlice";
import { useLoginMutation } from "../../api/apiSlice";

interface ErrMassProps {
  isError: boolean;
}

function LogMass(props: ErrMassProps) {
  if (props.isError) {
    return (
      <>
        <div className="errorMass">Email или пароль неверный</div>
      </>
    );
  } else return <></>;
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loginMutation, { isError, isLoading }] = useLoginMutation();

  //for sending to server
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState(false);

  const handleLogin = async () => {
    try {
      const result = await loginMutation({ email, password: pass }).unwrap();

      const userState: Omit<UserState, "balance"> = {
        username: result.user.email,
        password: pass,
        logged: "pending",
        cryptoI: result.user.role_id,
      };

      dispatch(setUser(userState));

      // Small delay to ensure cookies are set before redirect
      setTimeout(() => {
        setStatus(true);
      }, 100);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (status) {
    return <Navigate to="/user" />;
  }

  return (
    <>
      <div id="mainWrap">
        <div className="greating">Вход</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Введите email"
            disabled={isLoading}
          />
          <label>Пароль</label>
          <input
            type="password"
            name="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Введите пароль"
            disabled={isLoading}
          />
          <button type="submit" className="loginBtn" disabled={isLoading}>
            {isLoading ? "Загрузка..." : "Войти"}
          </button>
        </form>
        <LogMass isError={isError} />
        <div>
          <button className="backBtn">
            <Link className="Link" to="/">
              Назад
            </Link>
          </button>
        </div>
        <div>
          <Link className="Link" to="/create">
            Создать аккаунт
          </Link>
        </div>
      </div>
    </>
  );
}
