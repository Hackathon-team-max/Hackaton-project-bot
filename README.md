# Hackaton-project-bot

Проект состоит из C++17-сервера `max_bot`, React/Vite frontend и SQLite-модуля `Database`.

- `server/main.cpp` запускает HTTP-сервер и получение событий MAX через Long Polling.
- `server/server.cpp` содержит HTTP-обработчики; сейчас доступен `GET /api/ping`.
- `server/Database.h` и `server/Database.cpp` предоставляют функции работы с БД.
- `server/User.h` и `server/Document.h` описывают данные пользователей и документов.
- `frontend/` содержит мини-приложение.

Модуль БД подключён к сборке сервера, но пока не вызывается из `main` или HTTP-обработчиков. Frontend уже обращается к `/api/user/:userId`, `/api/user/profile` и `/api/universities/:uniId/documents`, однако в текущем C++-сервере эти маршруты ещё не реализованы. Запросы услуг и задач используют демонстрационные данные при недоступности API или ответе 404. Для сохранения профиля в SQLite требуется связать HTTP-обработчики с `Database`; при этом API использует `full_name`, а модель БД хранит ФИО раздельно.

## Развёртывание сервера

### Зависимости и CMake

Требуются CMake 3.15+, компилятор C++17, SQLite3 и libcurl с заголовками и библиотеками. Команды ниже выполняются из корня проекта, если не указано иное.

На Ubuntu/Debian установите зависимости:

```sh
sudo apt-get update
sudo apt-get install -y build-essential cmake libsqlite3-dev libcurl4-openssl-dev ca-certificates curl
```

Соберите сервер:

```sh
cmake -S server -B build/server -DCMAKE_BUILD_TYPE=Release
cmake --build build/server --config Release --parallel
```

`server/CMakeLists.txt` уже настроен:

- `database` — статическая библиотека из `Database.cpp`, с публичными заголовками и требованием C++17;
- SQLite подключается через `find_package(SQLite3 REQUIRED)` и `SQLite3::SQLite3`, с поддержкой старого имени `SQLite::SQLite3`;
- `max_bot` линкуется с `database`, `CURL::libcurl`, `Threads::Threads`, а на Windows также с `ws2_32`.

Отдельная сборка библиотеки после конфигурации:

```sh
cmake --build build/server --target database --config Release
```

На Windows используйте окружение выбранного компилятора, например Developer PowerShell для Visual Studio. Установленные SQLite и libcurl должны соответствовать архитектуре и toolchain. Если CMake не находит их, передайте пути к префиксам установки:

```powershell
cmake -S server -B build/server '-DCMAKE_PREFIX_PATH=C:/deps/sqlite;C:/deps/curl'
cmake --build build/server --config Release --parallel
```

### Переменные окружения и запуск

| Переменная | Назначение |
| --- | --- |
| `BOT_TOKEN` | Обязательный токен бота MAX |
| `PORT` | HTTP-порт; по умолчанию `8080` |

Сервер читает окружение процесса; файл `.env` самостоятельно не загружает. Для Long Polling нужен исходящий доступ к MAX API.

Linux:

```sh
export BOT_TOKEN='YOUR_MAX_BOT_TOKEN'
export PORT=8080
./build/server/max_bot
```

Windows, генератор Visual Studio:

```powershell
$env:BOT_TOKEN = 'YOUR_MAX_BOT_TOKEN'
$env:PORT = '8080'
.\build\server\Release\max_bot.exe
```

У одноконфигурационных генераторов Windows файл обычно находится в `build/server/max_bot.exe`.

Сервер слушает `0.0.0.0:8080`. В другом терминале можно проверить доступность:

```sh
curl http://127.0.0.1:8080/api/ping
```

Ожидаемый ответ: `{"ok":true}`. Этот маршрут подтверждает доступность HTTP-сервера, но не подключение к MAX или БД.

### Постоянный запуск через systemd

Следующие действия выполняются на Linux-сервере с systemd. Создайте системного пользователя и каталоги при первой установке:

```sh
sudo useradd --system --home-dir /var/lib/max-bot --shell /usr/sbin/nologin max-bot
sudo install -d /opt/max-bot
sudo install -d -o max-bot -g max-bot /var/lib/max-bot
sudo install -m 0755 build/server/max_bot /opt/max-bot/max_bot
sudo install -m 0600 /dev/null /etc/max-bot.env
sudoedit /etc/max-bot.env
```

Содержимое `/etc/max-bot.env`:

```ini
BOT_TOKEN=YOUR_MAX_BOT_TOKEN
PORT=8080
```

Создайте `/etc/systemd/system/max-bot.service`:

```ini
[Unit]
Description=MAX bot server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=max-bot
Group=max-bot
WorkingDirectory=/var/lib/max-bot
EnvironmentFile=/etc/max-bot.env
ExecStart=/opt/max-bot/max_bot
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Включите службу:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now max-bot
sudo systemctl status max-bot
sudo journalctl -u max-bot -f
```

После изменения исходников пересоберите проект, остановите службу, замените бинарный файл и запустите её снова:

```sh
cmake --build build/server --config Release --parallel
sudo systemctl stop max-bot
sudo install -m 0755 build/server/max_bot /opt/max-bot/max_bot
sudo systemctl start max-bot
```

## Развёртывание frontend

Установите Node.js 22 и npm. Из корня проекта:

```sh
cd frontend
npm ci
cp .env.example .env
```

Переменные frontend:

| Переменная | Назначение |
| --- | --- |
| `BACKEND_URL` | Адрес API, добавляемый перед `/api/...`, и цель dev-прокси; оставьте пустым для одного домена с frontend |
| `ADMIN_PASSWORD` | Пароль клиентской демонстрационной формы входа в админ-панель |
| `VITE_API_TARGET` | Резервная цель dev-прокси, если `BACKEND_URL` пуст; по умолчанию `http://localhost:8080` |
| `VITE_PORT` | Порт Vite при разработке; по умолчанию `5173` |

Значения `VITE_*`, а также `BACKEND_URL` и `ADMIN_PASSWORD`, перечисленные в `envPrefix` Vite, встраиваются при сборке и доступны браузеру. `ADMIN_PASSWORD` не обеспечивает серверную авторизацию; токен `BOT_TOKEN` туда помещать нельзя. Изменение переменных требует новой сборки frontend.

Для одного домена задайте в `.env`:

```dotenv
BACKEND_URL=
ADMIN_PASSWORD=YOUR_DEMO_ADMIN_PASSWORD
```

Соберите статику:

```sh
npm run build
```

Результат находится в `frontend/dist`. Для публикации отдавайте содержимое этого каталога через nginx или статический хостинг. `npm run preview` предназначен для локального просмотра сборки, а не постоянного размещения приложения. Подробнее: [развёртывание Vite](https://vite.dev/guide/static-deploy.html).

### Пример nginx: frontend и API на одном домене

Команды снова выполняются из корня проекта:

```sh
sudo apt-get install -y nginx
sudo install -d /var/www/max-bot
sudo cp -a frontend/dist/. /var/www/max-bot/
```

Создайте `/etc/nginx/sites-available/max-bot`, заменив `app.example.com` своим доменом:

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/max-bot;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

У `proxy_pass` здесь нет завершающего `/`: путь `/api/ping` передаётся серверу целиком. См. [документацию nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

Включите конфигурацию при первой установке:

```sh
sudo ln -s /etc/nginx/sites-available/max-bot /etc/nginx/sites-enabled/max-bot
sudo nginx -t
sudo systemctl reload nginx
```

Направьте DNS домена на сервер и настройте HTTPS-сертификат на nginx или внешнем прокси перед публикацией мини-приложения. Публичный трафик направляйте через прокси; внутренний порт `8080` ограничьте правилами сети. Ссылка открытия приложения сейчас задана в `server/bot_logic.cpp` через заглушку `https://vercel.app` — замените её адресом размещённого приложения.

При локальном `npm run dev` прокси в `frontend/vite.config.ts` сохраняет префикс `/api`. С пустым `BACKEND_URL` браузер обращается к Vite, а прокси перенаправляет запросы на `VITE_API_TARGET` или `http://localhost:8080`.

### Команды frontend

Все команды выполняются из каталога `frontend/`:

| Команда | Назначение |
| --- | --- |
| `npm ci` | Установка зависимостей из lock-файла (для разработки — `npm install`) |
| `npm run dev` | Dev-сервер Vite с HMR; по умолчанию `http://localhost:5173` |
| `npm run build` | Проверка типов (`tsc`) и продакшен-сборка в `dist/` |
| `npm run preview` | Локальный просмотр уже собранного `dist/` |
| `npx tsc --noEmit` | Только проверка типов без сборки |

Минимальный цикл после клонирования:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

### Режимы: Preview и Production

Режим задаётся переменной окружения `VITE_APP_MODE` (значение `preview` или `production`; по умолчанию — `preview`) и читается ровно в одном месте — `frontend/src/config/app.ts`. Остальной код узнаёт режим через слой репозиториев и не проверяет переменную самостоятельно. Изменение режима требует перезапуска dev-сервера или пересборки.

| Данные | Preview | Production |
| --- | --- | --- |
| Пользователь (`/api/user/...`) | Реальный API | Реальный API |
| Документы вуза (`/api/universities/:id/documents`) | Реальный API | Реальный API |
| Заявки (список, подача, чеклист) | localStorage, ключ `max_preview_applications` | HTTP `/api/applications` |
| Каталог услуг и админ-изменения | localStorage, ключи `max_custom_services` и `max_tasks_history` | HTTP `/api/services` |

В Preview при первом обращении в localStorage записываются seed-данные: заявка «Документы для поступления» (МГТУ им. Н.Э. Баумана) и список вузов (`max_preview_universities`). Документы в заявке не хранятся — чеклист всегда запрашивает их у backend по `universityId`, поэтому актуальность списка обеспечивает сервер.

В Production fallback на mock отсутствует: если endpoint ещё не реализован на бэкенде, пользователь видит сообщение об ошибке, а не тихо получает демо-данные. Это намеренно — такие ошибки видно до релиза.

Сброс preview-данных: очисти ключи `max_preview_*` в localStorage браузера (DevTools → Application → Local Storage), seed запишется заново при следующем открытии.

### Архитектура frontend

Слойность по направлению «страница → репозиторий → источник данных»; React-компоненты не знают, откуда пришли данные:

```text
frontend/src/
├── api/            # Только HTTP: client.ts (запросы), errors.ts (ApiError), types.ts (типы API)
├── config/app.ts   # Единственное чтение VITE_APP_MODE
├── repositories/   # Выбор реализации по режиму: applications, documents, services, universities, users
├── storage/        # Ключи и чтение/запись localStorage (preview-репозитории)
├── mocks/          # Seed-данные preview-режима (заявки, вузы, услуги)
├── integrations/max/ # MAX Bridge: window.WebApp, user_id, отправка сообщений в бот
├── lib/            # Чеклисты, тема, схемы форм, справочник вузов
├── pages/          # Страницы-роуты (в т.ч. pages/admin/ — админка)
└── components/     # Переиспользуемые UI-примитивы
```

Правило добавления данных: новый источник подключается в `repositories/<entity>/` двумя реализациями (`mock` для preview, `real` для production) и фабрикой в `index.ts` по `appMode`. Запросы к HTTP — только через `api/client.ts`, mock-данные — только в `mocks/`.

### Маршруты

Роутинг hash-based (`HashRouter`), приложение работает на статическом хостинге без server-side редиректов.

| Путь | Страница |
| --- | --- |
| `/#/` | Главная: профиль, список заявок и истории |
| `/#/profile` | Профиль и документы выбранного вуза |
| `/#/service/:id` | Документы вуза и подача заявки (сюда же ведёт deep-link бота `/#/?service=<id>`) |
| `/#/task/:id` | Чеклист документов заявки |
| `/#/task/:id/result` | Результаты чеклиста |
| `/#/admin`, `/#/admin/login` | Админ-панель (демо-вход, см. `ADMIN_PASSWORD`) |

Приложение открывается и вне MAX: без моста пользователь называется «Гость», профиль не подгружается, но остальная навигация и preview-данные работают.

## Подключение базы данных

SQLite работает с локальным файлом, отдельный сервер БД не нужен. Подключение создаётся кодом:

```cpp
#include "Database.h"

Database db("application.db");
```

Путь считается от текущей рабочей директории. При указанной выше службе systemd относительный файл будет находиться в `/var/lib/max-bot`. Каталог должен существовать и быть доступен пользователю процесса для записи. Файл храните вне каталога сборки и сохраняйте при обновлении приложения. Параметра окружения `DB_PATH` в проекте пока нет — путь передаётся конструктору.

`Database` создаёт таблицы `users`, `documents` и индекс документов при первом открытии. Старая схема `users` с колонкой `id` несовместима: конструктор вернёт ошибку без изменения прежних данных. Автоматической миграции нет; используйте новый файл или подготовьте перенос отдельно.

Внутренние функции:

| Функция | Ответственность |
| --- | --- |
| `Database(filename)` | Открывает соединение, проверяет и создаёт схему |
| `~Database()` | Закрывает соединение без исключений |
| `createTables()` | Проверяет схему и создаёт недостающие таблицы и индекс в одной транзакции |
| `validateSchema()` | Проверяет имена и типы столбцов, `NOT NULL` и первичные ключи |
| `throwError(operation)` | Формирует `std::runtime_error` с контекстом и сообщением SQLite |
| Внутренняя обёртка `Statement` | Подготавливает SQL, связывает параметры, читает результат и освобождает statement |

Остальной код обращается только к публичным методам `Database`. Копирование объекта запрещено; если один экземпляр используется несколькими потоками, обращения необходимо защищать внешним mutex.

### Пользователи: User и методы Database

| Поле C++ | Колонка SQLite | Назначение |
| --- | --- | --- |
| `std::int64_t userId` | `user_id` | ID из MAX; задаётся кодом вручную |
| `std::string lastName` | `last_name` | Фамилия |
| `std::string firstName` | `first_name` | Имя |
| `std::string patronymic` | `patronymic` | Отчество |
| `std::string address` | `address` | Адрес |
| `std::string snils` | `snils` | СНИЛС |
| `std::string email` | `email` | Почта |
| `std::string passport` | `passport` | Паспорт одной строкой |
| `std::optional<std::string> universityId` | `university_id` | Код вуза, например `msu`; `std::nullopt` означает SQL `NULL` |
| `std::string updatedAt` | `updated_at` | Назначаемое SQLite время UTC в ISO 8601 |

ФИО хранится раздельно. Метод `User::fullName()` соединяет непустые части пробелами; столбца `full_name` нет. Текст передаётся в UTF-8, пустое отчество допустимо. СНИЛС и паспорт сохраняют ведущие нули. Проверки их формата и уникальности нет.

| Публичный метод | Что делает |
| --- | --- |
| `bool addUser(const User& user)` | Вставляет пользователя; при повторном `userId` возвращает `false`, не перезаписывая запись |
| `std::optional<User> getUser(std::int64_t id)` | Возвращает пользователя или `std::nullopt` |
| `bool updateUser(const User& user)` | Обновляет личные данные, вуз и время по `user.userId`; возвращает `false`, если записи нет |
| `bool deleteUser(std::int64_t id)` | Удаляет пользователя; возвращает `false`, если записи нет |
| `bool userExists(std::int64_t id)` | Проверяет наличие пользователя |
| `std::vector<User> getAllUsers()` | Возвращает всех пользователей без гарантии порядка |

`user_id` — `INTEGER PRIMARY KEY` без `AUTOINCREMENT`; ID всегда передаётся явно. Входное значение `updatedAt` игнорируется: при вставке и обновлении время назначает SQLite, например `2026-09-27T10:15:30.123Z`. Чтобы получить новое время, перечитайте запись. Для снятия выбора вуза передайте `universityId = std::nullopt`.

### Документы: Document и методы Database

| Поле C++ | Колонка SQLite | Назначение |
| --- | --- | --- |
| `std::int64_t id` | `id` | ID, назначаемый SQLite |
| `std::string universityId` | `university_id` | Непустой код вуза |
| `DocumentCategory category` | `category` | `Mandatory` → `mandatory`; `Additional` → `additional` |
| `std::string title` | `title` | Название |
| `std::string description` | `description` | Описание |
| `int order` | `order` | Порядок отображения |
| `std::string url` | `url` | Ссылка на Госуслуги |

| Публичный метод | Что делает |
| --- | --- |
| `std::int64_t addDocument(const Document& document)` | Вставляет документ и возвращает созданный ID; входной `document.id` игнорируется |
| `std::optional<Document> getDocument(std::int64_t id)` | Возвращает документ или `std::nullopt` |
| `bool updateDocument(const Document& document)` | Обновляет все поля кроме ID по `document.id`; возвращает `false`, если записи нет |
| `bool deleteDocument(std::int64_t id)` | Удаляет документ; возвращает `false`, если записи нет |
| `std::vector<Document> getDocuments(const std::string& universityId, std::optional<DocumentCategory> category = std::nullopt)` | Возвращает документы вуза, при необходимости отфильтрованные по категории |

`getDocuments` сортирует результат по `order`, затем по `id` по возрастанию. В SQL имя `"order"` заключено в кавычки. Создаётся индекс `(university_id, category, "order", id)`.

ID документа назначается через `INTEGER PRIMARY KEY` без `AUTOINCREMENT`; после удаления ID может использоваться повторно. Переданный объект `addDocument` не изменяет — сохраните возвращённый ID самостоятельно. Категория ограничена двумя значениями через `CHECK`. Формат URL модуль не проверяет.

В БД нет таблицы-справочника вузов и внешних ключей. Коды для интерфейса перечислены в `frontend/src/lib/universities.ts`, например `msu` и `bmstu`. Удаление пользователя не удаляет документы, а удаление документа не изменяет пользователей.

### Результаты и ошибки

- Пустая выборка возвращается как `std::nullopt` или пустой вектор.
- Обновление существующей записи прежними значениями возвращает `true`.
- Технические ошибки SQLite и несовместимая схема вызывают `std::runtime_error`.
- Пустой код вуза в операциях с документами и недопустимая категория вызывают `std::invalid_argument`.
- Перед разыменованием результата `getUser` или `getDocument` проверяйте `optional`.

### Пример работы с БД

```cpp
#include "Database.h"
#include <exception>
#include <iostream>

int main()
{
    try
    {
        Database db("application.db");

        User user;
        user.userId = 5000000000LL;
        user.lastName = "Ivanov";
        user.firstName = "Alex";
        user.address = "Amsterdam";
        user.snils = "001-002-003 04";
        user.email = "alex@example.com";
        user.passport = "0012 003456";
        user.universityId = "msu";

        if (!db.addUser(user))
            std::cout << "User already exists\n";

        if (auto loaded = db.getUser(user.userId))
        {
            std::cout << loaded->fullName() << '\n';
            loaded->address = "Rotterdam";
            if (!db.updateUser(*loaded))
                std::cout << "User no longer exists\n";
        }

        Document document;
        document.universityId = "msu";
        document.category = DocumentCategory::Mandatory;
        document.title = "Application";
        document.order = 1;
        document.url = "https://www.gosuslugi.ru/";
        document.id = db.addDocument(document);

        if (auto loaded = db.getDocument(document.id))
        {
            loaded->description = "Updated instructions";
            if (!db.updateDocument(*loaded))
                std::cout << "Document no longer exists\n";
        }

        for (const auto& item : db.getDocuments("msu", DocumentCategory::Mandatory))
            std::cout << item.order << ": " << item.title << '\n';

        if (!db.deleteDocument(document.id))
            std::cout << "Document no longer exists\n";
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
```

Для отдельного примера сохраните код в `server/example.cpp` и добавьте в конец `server/CMakeLists.txt`:

```cmake
add_executable(database_example example.cpp)
target_link_libraries(database_example PRIVATE database)
```

Затем соберите цель `database_example`. Она получает заголовки, C++17 и зависимость SQLite через цель `database`.

## Лицензия

Код проекта распространяется под GNU General Public License v3.0 (`GPL-3.0-only`). Полный текст приведён в [LICENSE](LICENSE).

Сторонние библиотеки сохраняют собственные лицензии и уведомления об авторских правах.
