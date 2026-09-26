# Hackaton-project-bot

Проект включает frontend и C++17-сервер `max_bot`. В `server` реализован отдельный модуль SQLite для хранения пользователей.

## Сборка сервера

Требуются:

- CMake 3.15 или новее;
- компилятор с поддержкой C++17;
- SQLite3 и libcurl с заголовочными файлами и библиотеками для выбранного компилятора;
- поддержка потоков, определяемая CMake через `Threads`.

Из корня репозитория:

```sh
cmake -S server -B build/server
cmake --build build/server --config Release
```

Если зависимости установлены в нестандартное место, передайте их префиксы через `-DCMAKE_PREFIX_PATH="<sqlite-prefix>;<curl-prefix>"` при конфигурации. На Windows архитектура и формат библиотек должны соответствовать выбранному toolchain.

CMake создаёт статическую библиотеку `database` и подключает её к `max_bot`. SQLite обнаруживается через `find_package(SQLite3 REQUIRED)`: используется цель `SQLite3::SQLite3`, а для старых версий CMake — `SQLite::SQLite3`. Исходники SQLite в репозитории не дублируются.

Для сборки только модуля после конфигурации:

```sh
cmake --build build/server --target database --config Release
```

При запуске бота требуется переменная окружения `BOT_TOKEN`; порт HTTP-сервера задаётся через `PORT` и по умолчанию равен `8080`. Сам модуль базы не требует токена или подключения к сети. Пока бот и HTTP-обработчики не вызывают `Database`: файл базы создаётся только при явном создании объекта класса.

## Модуль Database

| Файл | Назначение |
| --- | --- |
| `server/User.h` | Структура пользователя |
| `server/Database.h` | Публичный C++ интерфейс, без подключения `sqlite3.h` |
| `server/Database.cpp` | Соединение, SQL, bind-параметры и обработка ошибок |
| `server/CMakeLists.txt` | Сборка библиотеки и подключение зависимостей |

`Database(filename)` открывает или создаёт базу и таблицу `users`. Относительный путь к файлу считается от текущей рабочей директории процесса; родительская папка должна существовать. Значение `":memory:"` создаёт базу в памяти на время жизни объекта.

Соединение закрывается в деструкторе, который не выбрасывает исключений. Копирование запрещено. При ошибке конструктора соединение освобождается. Внутренняя RAII-обёртка вызывает `sqlite3_finalize` для statements, в том числе при исключениях. Все пользовательские значения передаются через bind-параметры.

Если один экземпляр используется несколькими потоками, вызывающий код должен сериализовать обращения, например внешним mutex.

### Данные пользователя

| Поле C++ | Тип | Столбец SQLite | Содержание |
| --- | --- | --- | --- |
| `id` | `std::int64_t` | `id` | ID, назначаемый вызывающим кодом |
| `lastName` | `std::string` | `last_name` | Фамилия |
| `firstName` | `std::string` | `first_name` | Имя |
| `patronymic` | `std::string` | `patronymic` | Отчество |
| `address` | `std::string` | `address` | Адрес |
| `snils` | `std::string` | `snils` | СНИЛС |
| `email` | `std::string` | `email` | Почта |
| `passport` | `std::string` | `passport` | Паспорт одной строкой, включая серию и номер |

Текст передаётся в UTF-8. СНИЛС и паспорт хранятся строками, поэтому ведущие нули и разделители сохраняются. Пустые строки разрешены, в том числе для отсутствующего отчества. Проверки формата и уникальности СНИЛС, почты и паспорта нет.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    patronymic TEXT NOT NULL,
    address TEXT NOT NULL,
    snils TEXT NOT NULL,
    email TEXT NOT NULL,
    passport TEXT NOT NULL
);
```

`AUTOINCREMENT` не используется. `addUser` всегда явно передаёт `id`; например, допустимы `5738291` и `5000000000`.

Модуль рассчитан на эту схему. `CREATE TABLE IF NOT EXISTS` не изменяет уже существующую таблицу; миграция старых баз, в частности с единым полем `name`, не реализована.

### Методы и ошибки

| Метод | Результат |
| --- | --- |
| `bool addUser(const User& user)` | `true` при вставке; `false` при повторном ID, без перезаписи записи |
| `std::optional<User> getUser(std::int64_t id)` | Пользователь или `std::nullopt`, если запись отсутствует |
| `bool updateUser(const User& user)` | Обновляет все строковые поля по ID; `false`, если записи нет. Прежние значения также дают `true` для существующей записи |
| `bool deleteUser(std::int64_t id)` | `true` при удалении; `false`, если записи нет |
| `bool userExists(std::int64_t id)` | Наличие записи |
| `std::vector<User> getAllUsers()` | Все записи без гарантии порядка; пустой вектор для пустой таблицы |

Технические ошибки SQLite вызывают `std::runtime_error` с названием операции и сообщением `sqlite3_errmsg`. Например, ошибка открытия файла или блокировка базы не маскируются под отсутствие пользователя. Перед разыменованием результата `getUser` обязательно проверяйте `optional`.

### Пример использования

Пример можно поместить в отдельный исполняемый файл, подключённый к CMake-цели `database`.

```cpp
#include "Database.h"

#include <iostream>
#include <stdexcept>

int main()
{
    try
    {
        Database db("users.db");
        User user{
            5000000000LL,
            "Ivanov",
            "Alex",
            "",
            "Amsterdam",
            "001-002-003 04",
            "alex@example.test",
            "0012 003456"
        };

        if (!db.addUser(user))
            std::cout << "User already exists\n";

        if (auto loaded = db.getUser(user.id))
        {
            std::cout << loaded->id << ": " << loaded->firstName << '\n';
            loaded->address = "Rotterdam";
            if (!db.updateUser(*loaded))
                std::cout << "User no longer exists\n";
        }

        std::cout << "Exists: " << db.userExists(user.id) << '\n';
        std::cout << "Total users: " << db.getAllUsers().size() << '\n';

        // db.deleteUser(user.id);
    }
    catch (const std::runtime_error& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
```

Если `example.cpp` расположен рядом с `server/CMakeLists.txt`, добавьте в конец этого файла:

```cmake
add_executable(database_example example.cpp)
target_link_libraries(database_example PRIVATE database)
```

Цель `database` передаёт потребителю путь к заголовкам и требование C++17; зависимость SQLite учитывается при линковке.

## Выполненные проверки модуля

Полная сборка `max_bot` проверена на Windows с GCC 16.2.0, CMake 4.4.3 и SQLite 3.53.4. Модуль также скомпилирован с `-Wall -Wextra -Wpedantic -Werror`.

Локальная тестовая программа выполнила 591 проверку: CRUD всех полей, дубликаты, отсутствующие записи, повторное открытие, 64-битные ID, Unicode, кавычки, пустые строки, ведущие нули, ошибки открытия, блокировки и восстановления после ошибок. После завершения объём выделенной SQLite памяти вернулся к исходному значению; файлы баз удалось удалить после закрытия соединений.

Тестовая программа, тестовые базы и переносимые инструменты использовались вне репозитория и не входят в его состав. Встроенная CTest-цель для этих проверок пока не добавлена.
