import React from "react";
import { Link } from "react-router-dom";
import "../../App.css";
import "./Home.css";

export function Home() {
  return (
    <div id="homeWrap">
      <main>
        <h2>Добро пожаловать на начальную страницу!</h2>
      </main>
      <nav>
        <button className="homeBtn">
          <Link className="Link" to="/login">
            Войти
          </Link>
        </button>
        <button className="homeBtn">
          <Link className="Link" to="/create">
            Создать пользователя
          </Link>
        </button>
      </nav>
    </div>
  );
}
