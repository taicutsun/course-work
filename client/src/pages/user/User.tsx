/* eslint-disable jsx-a11y/alt-text */
import React, {useEffect,useState} from "react";
import "../../App.css";
import "./User.css";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import {
  CheckUserPass,
  createUser,
  selectUserName,
  selectUserBalance, selectUserIndex, setBalance,
} from "../../app/appSlice";
import { NavBar } from "../nav/NavBar";
import {api} from "../../api/interceptor";

function UserPage() {
  const dispatch = useAppDispatch();

  const username: string = useAppSelector(selectUserName);
  const cryptoI = useAppSelector(selectUserIndex);
  const balance: number = useAppSelector(selectUserBalance);

   useEffect( () => {
     api.get('/blockchain/getBalance', {
      params: { cryptoI },
    }).then((res:any)=>{
      dispatch(setBalance(res.data.balance));
     })
  }, [dispatch,cryptoI]);

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
          <Link className="link" to="/">
            Выйти
          </Link>
        </li>
      </ul>
    </div>
  );
}
//for logged user

//for flag
let donExist: boolean = false;

function setExist(value: boolean): void {
  donExist = value;
}

//set func

//for new User
function Create() {
  const dispatch = useAppDispatch();
  const [newuser, setNewUsername] = useState("");
  const [newpass, setNewPass] = useState("");
  const [secpass, setSecPass] = useState("");
  const [click, setClick] = useState(0);

  const user: CheckUserPass = {
    username: newuser,
    password: newpass,
    secPass: secpass,
  };

  useEffect(() => {
    if (
      newuser !== "" &&
      newpass === secpass &&
      newpass !== "" &&
      donExist !== true
    ) {
      //have to rework click>1(not smart solution)
      console.log(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [click]);

  return (
    <>
      <div id="createWrap">
        <div className="greating">Введите данные для создания пользователя</div>
        <form>
          <label>Имя</label>
          <input
            type="text"
            name="username"
            id="username"
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <label>пароль</label>
          <input
            type="text"
            name="password"
            id="addPass"
            onChange={(e) => setNewPass(e.target.value)}
          />
          <label>подтвердите пароль</label>
          <input
            type="text"
            name="password"
            id="addPass"
            onChange={(e) => setSecPass(e.target.value)}
          />
        </form>
        <div>
          {" "}
          <button
            className="loginBtn"
            onClick={() => {
              dispatch(createUser(user));
              setClick(click + 1);
            }}
          >
            "Создать пользователя"
          </button>
        </div>
        <div className="errorMass">
          {secpass === newpass
            ? ""
            : "проверте поля : подтверждения пароля и пароль"}
          {donExist === false
            ? ""
            : "пользователь с текущим именем не существует"}
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
//for new User

export { UserPage, Create, setExist };
