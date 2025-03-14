# Веб-приложение для управления крипто валютой на основе HardHat
# Описание проекта
Приложение предназначено для удобного обмена криптовалютой. Оно предоставляет пользователям возможность регистрироваться, обменеватся криптовалютой. 
# Чуйко Григорий Витальевич
# группа №353505
# Архитектура системы
Приложение построено по модели клиент-сервер:

Клиент (Веб) отвечает за отображение данных, взаимодействие с пользователем, отправку запросов и получение данных с сервера.
Сервер (Nest js) хранит информацию о блокчейне, пользователях.
JWT используется для аутентификации пользователей через email/пароль.
# Диаграмма классов
.......
# Функциональные возможности

1. Регистрация и авторизация
 -Регистрация нового пользователя с вводом имени, email, пароля.
 -Подтверждение email.
 -Авторизация через email + пароль.
2. Обмен криптовалютой
 - Hardhat для запуска блокчейна
 - Solidity для смарт-контракта

# Описание моделей данных
Приложение использует PostgreSQL для хранения данных пользователей, транзакций.
# Cтек технологий
 - Frontend: React, TS
 - Backend: NestJs, PostgreSQL
 - Blockchain: Hardhat
