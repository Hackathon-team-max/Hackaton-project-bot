#include "Database.h"

#include <sqlite3.h>

#include <memory>
#include <stdexcept>

class Database::Statement
{
public:
    Statement(const Database& database, const char* sql)
        : database_(database), statement_(nullptr, sqlite3_finalize)
    {
        sqlite3_stmt* raw = nullptr;
        const int result = sqlite3_prepare_v2(database_.db, sql, -1, &raw, nullptr);
        statement_.reset(raw);
        if (result != SQLITE_OK)
            database_.throwError("Prepare SQL statement");
    }

    void bind(int index, std::int64_t value)
    {
        if (sqlite3_bind_int64(statement_.get(), index, value) != SQLITE_OK)
            database_.throwError("Bind user ID");
    }

    void bind(int index, const std::string& value)
    {
        if (sqlite3_bind_text64(statement_.get(), index, value.data(),
                                static_cast<sqlite3_uint64>(value.size()),
                                SQLITE_TRANSIENT, SQLITE_UTF8) != SQLITE_OK)
            database_.throwError("Bind text value");
    }

    void bindFields(const User& user)
    {
        bind(1, user.lastName);
        bind(2, user.firstName);
        bind(3, user.patronymic);
        bind(4, user.address);
        bind(5, user.snils);
        bind(6, user.email);
        bind(7, user.passport);
        bind(8, user.id);
    }

    int step()
    {
        return sqlite3_step(statement_.get());
    }

    void execute(const char* operation)
    {
        if (step() != SQLITE_DONE)
            database_.throwError(operation);
    }

    bool next(const char* operation)
    {
        const int result = step();
        if (result == SQLITE_ROW)
            return true;
        if (result == SQLITE_DONE)
            return false;
        database_.throwError(operation);
    }

    User user() const
    {
        return User{sqlite3_column_int64(statement_.get(), 0),
                    text(1), text(2), text(3), text(4), text(5), text(6), text(7)};
    }

private:
    std::string text(int column) const
    {
        const auto* value = sqlite3_column_text(statement_.get(), column);
        if (!value)
            database_.throwError("Read non-null text column");
        const int size = sqlite3_column_bytes(statement_.get(), column);
        return std::string(reinterpret_cast<const char*>(value),
                           static_cast<std::size_t>(size));
    }

    const Database& database_;
    std::unique_ptr<sqlite3_stmt, decltype(&sqlite3_finalize)> statement_;
};

Database::Database(const std::string& filename)
{
    try
    {
        if (sqlite3_open(filename.c_str(), &db) != SQLITE_OK)
            throwError("Open database");
        createTables();
    }
    catch (...)
    {
        if (db)
            sqlite3_close_v2(db);
        db = nullptr;
        throw;
    }
}

Database::~Database() noexcept
{
    if (db)
        sqlite3_close_v2(db);
}

void Database::createTables()
{
    Statement statement(*this,
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY, "
        "last_name TEXT NOT NULL, "
        "first_name TEXT NOT NULL, "
        "patronymic TEXT NOT NULL, "
        "address TEXT NOT NULL, "
        "snils TEXT NOT NULL, "
        "email TEXT NOT NULL, "
        "passport TEXT NOT NULL)");
    statement.execute("Create users table");
}

bool Database::addUser(const User& user)
{
    Statement statement(*this,
        "INSERT INTO users (last_name, first_name, patronymic, address, snils, "
        "email, passport, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    statement.bindFields(user);
    if (statement.step() == SQLITE_DONE)
        return true;
    if (sqlite3_extended_errcode(db) == SQLITE_CONSTRAINT_PRIMARYKEY)
        return false;
    throwError("Add user");
}

std::optional<User> Database::getUser(std::int64_t id)
{
    Statement statement(*this,
        "SELECT id, last_name, first_name, patronymic, address, snils, email, "
        "passport FROM users WHERE id = ?");
    statement.bind(1, id);
    if (!statement.next("Get user"))
        return std::nullopt;
    return statement.user();
}

bool Database::updateUser(const User& user)
{
    Statement statement(*this,
        "UPDATE users SET last_name = ?, first_name = ?, patronymic = ?, "
        "address = ?, snils = ?, email = ?, passport = ? WHERE id = ?");
    statement.bindFields(user);
    statement.execute("Update user");
    return sqlite3_changes(db) != 0;
}

bool Database::deleteUser(std::int64_t id)
{
    Statement statement(*this, "DELETE FROM users WHERE id = ?");
    statement.bind(1, id);
    statement.execute("Delete user");
    return sqlite3_changes(db) != 0;
}

bool Database::userExists(std::int64_t id)
{
    Statement statement(*this, "SELECT 1 FROM users WHERE id = ?");
    statement.bind(1, id);
    return statement.next("Check user existence");
}

std::vector<User> Database::getAllUsers()
{
    Statement statement(*this,
        "SELECT id, last_name, first_name, patronymic, address, snils, email, "
        "passport FROM users");
    std::vector<User> users;
    while (statement.next("Get all users"))
        users.push_back(statement.user());
    return users;
}

void Database::throwError(const char* operation) const
{
    throw std::runtime_error(std::string(operation) + ": " + sqlite3_errmsg(db));
}
