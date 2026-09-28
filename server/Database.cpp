#include "include/Database.h"

#include <sqlite3.h>

#include <algorithm>
#include <cctype>
#include <initializer_list>
#include <limits>
#include <memory>
#include <stdexcept>

namespace
{
std::string categoryText(DocumentCategory category)
{
    switch (category)
    {
    case DocumentCategory::Mandatory: return "mandatory";
    case DocumentCategory::Additional: return "additional";
    }
    throw std::invalid_argument("Invalid document category");
}

void requireUniversity(const std::string& universityId)
{
    if (universityId.empty())
        throw std::invalid_argument("Document university ID must not be empty");
}
}

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
            database_.throwError("Bind integer value");
    }

    void bind(int index, const std::optional<std::string>& value)
    {
        if (value)
            bind(index, *value);
        else if (sqlite3_bind_null(statement_.get(), index) != SQLITE_OK)
            database_.throwError("Bind null value");
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
        bind(8, user.universityId);
        bind(9, user.userId);
    }

    void bindFields(const Document& document)
    {
        bind(1, document.universityId);
        bind(2, categoryText(document.category));
        bind(3, document.title);
        bind(4, document.description);
        bind(5, static_cast<std::int64_t>(document.order));
        bind(6, document.url);
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
        return User{integer(0), text(1), text(2), text(3), text(4), text(5),
                    text(6), text(7), nullableText(8), text(9)};
    }

    Document document() const
    {
        const auto category = text(2);
        DocumentCategory parsedCategory;
        if (category == "mandatory")
            parsedCategory = DocumentCategory::Mandatory;
        else if (category == "additional")
            parsedCategory = DocumentCategory::Additional;
        else
            throw std::runtime_error("Read document: invalid stored category");
        const auto order = integer(5);
        if (order < std::numeric_limits<int>::min() || order > std::numeric_limits<int>::max())
            throw std::runtime_error("Read document: order is outside the int range");
        return Document{integer(0), text(1), parsedCategory, text(3), text(4),
                        static_cast<int>(order), text(6)};
    }

    std::int64_t integer(int column) const
    {
        return sqlite3_column_int64(statement_.get(), column);
    }

    std::optional<std::string> nullableText(int column) const
    {
        if (sqlite3_column_type(statement_.get(), column) == SQLITE_NULL)
            return std::nullopt;
        return text(column);
    }

    std::string text(int column) const
    {
        const auto* value = sqlite3_column_text(statement_.get(), column);
        if (!value)
            database_.throwError("Read non-null text column");
        const int size = sqlite3_column_bytes(statement_.get(), column);
        return std::string(reinterpret_cast<const char*>(value),
                           static_cast<std::size_t>(size));
    }

private:
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
    Statement(*this, "BEGIN IMMEDIATE").execute("Begin schema transaction");
    try
    {
        validateSchema();
        Statement(*this,
            "CREATE TABLE IF NOT EXISTS users ("
            "user_id INTEGER PRIMARY KEY, "
            "last_name TEXT NOT NULL, "
            "first_name TEXT NOT NULL, "
            "patronymic TEXT NOT NULL, "
            "address TEXT NOT NULL, "
            "snils TEXT NOT NULL, "
            "email TEXT NOT NULL, "
            "passport TEXT NOT NULL, "
            "university_id TEXT, "
            "updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))")
            .execute("Create users table");
        Statement(*this,
            "CREATE TABLE IF NOT EXISTS documents ("
            "id INTEGER PRIMARY KEY, university_id TEXT NOT NULL, "
            "category TEXT NOT NULL CHECK (category IN ('mandatory', 'additional')), "
            "title TEXT NOT NULL, description TEXT NOT NULL, "
            "\"order\" INTEGER NOT NULL, url TEXT NOT NULL)")
            .execute("Create documents table");
        Statement(*this,
            "CREATE INDEX IF NOT EXISTS documents_university_category_order_idx "
            "ON documents (university_id, category, \"order\", id)")
            .execute("Create documents index");
        Statement(*this, "COMMIT").execute("Commit schema transaction");
    }
    catch (...)
    {
        // Preserve the original error even if rollback fails.
        sqlite3_exec(db, "ROLLBACK", nullptr, nullptr, nullptr);
        throw;
    }
}

void Database::validateSchema()
{
    struct Column
    {
        const char* name;
        const char* type;
        bool notNull;
        int primaryKey;
    };
    const auto validate = [this](const char* table, const char* columnsSql,
                                 const char* indexesSql, std::initializer_list<Column> expected)
    {
        const auto incompatible = [table]()
        {
            throw std::runtime_error(std::string("Incompatible schema for table '") + table +
                "': create a new database. Automatic migration is not supported.");
        };
        Statement object(*this, "SELECT type FROM sqlite_master WHERE name = ? COLLATE NOCASE");
        object.bind(1, std::string(table));
        if (!object.next("Inspect schema object"))
            return;
        if (object.text(0) != "table")
            incompatible();

        Statement columns(*this, columnsSql);
        std::size_t count = 0;
        while (columns.next("Inspect table columns"))
        {
            ++count;
            const auto name = columns.text(1);
            const auto found = std::find_if(expected.begin(), expected.end(),
                [&name](const Column& column) { return name == column.name; });
            if (found == expected.end())
                incompatible();
            auto type = columns.text(2);
            std::transform(type.begin(), type.end(), type.begin(),
                [](unsigned char c) { return static_cast<char>(std::toupper(c)); });
            if (type != found->type || columns.integer(5) != found->primaryKey ||
                (found->primaryKey == 0 && (columns.integer(3) != 0) != found->notNull))
                incompatible();
        }
        if (count != expected.size())
            incompatible();

        // An INTEGER PRIMARY KEY rowid alias must not have a separate PK index.
        Statement indexes(*this, indexesSql);
        while (indexes.next("Inspect table indexes"))
            if (indexes.text(3) == "pk")
                incompatible();
    };
    validate("users", "PRAGMA table_info(users)", "PRAGMA index_list(users)", {
        {"user_id", "INTEGER", false, 1},
        {"last_name", "TEXT", true, 0}, {"first_name", "TEXT", true, 0},
        {"patronymic", "TEXT", true, 0}, {"address", "TEXT", true, 0},
        {"snils", "TEXT", true, 0}, {"email", "TEXT", true, 0},
        {"passport", "TEXT", true, 0}, {"university_id", "TEXT", false, 0},
        {"updated_at", "TEXT", true, 0}});
    validate("documents", "PRAGMA table_info(documents)", "PRAGMA index_list(documents)", {
        {"id", "INTEGER", false, 1}, {"university_id", "TEXT", true, 0},
        {"category", "TEXT", true, 0}, {"title", "TEXT", true, 0},
        {"description", "TEXT", true, 0}, {"order", "INTEGER", true, 0},
        {"url", "TEXT", true, 0}});
}

bool Database::addUser(const User& user)
{
    Statement statement(*this,
        "INSERT INTO users (last_name, first_name, patronymic, address, snils, "
        "email, passport, university_id, user_id, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))");
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
        "SELECT user_id, last_name, first_name, patronymic, address, snils, email, "
        "passport, university_id, updated_at FROM users WHERE user_id = ?");
    statement.bind(1, id);
    if (!statement.next("Get user"))
        return std::nullopt;
    return statement.user();
}

bool Database::updateUser(const User& user)
{
    Statement statement(*this,
        "UPDATE users SET last_name = ?, first_name = ?, patronymic = ?, "
        "address = ?, snils = ?, email = ?, passport = ?, university_id = ?, "
        "updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?");
    statement.bindFields(user);
    statement.execute("Update user");
    return sqlite3_changes(db) != 0;
}

bool Database::deleteUser(std::int64_t id)
{
    Statement statement(*this, "DELETE FROM users WHERE user_id = ?");
    statement.bind(1, id);
    statement.execute("Delete user");
    return sqlite3_changes(db) != 0;
}

bool Database::userExists(std::int64_t id)
{
    Statement statement(*this, "SELECT 1 FROM users WHERE user_id = ?");
    statement.bind(1, id);
    return statement.next("Check user existence");
}

std::vector<User> Database::getAllUsers()
{
    Statement statement(*this,
        "SELECT user_id, last_name, first_name, patronymic, address, snils, email, "
        "passport, university_id, updated_at FROM users");
    std::vector<User> users;
    while (statement.next("Get all users"))
        users.push_back(statement.user());
    return users;
}

std::int64_t Database::addDocument(const Document& document)
{
    requireUniversity(document.universityId);
    categoryText(document.category);
    Statement statement(*this,
        "INSERT INTO documents (university_id, category, title, description, \"order\", url) "
        "VALUES (?, ?, ?, ?, ?, ?)");
    statement.bindFields(document);
    statement.execute("Add document");
    return sqlite3_last_insert_rowid(db);
}

std::optional<Document> Database::getDocument(std::int64_t id)
{
    Statement statement(*this,
        "SELECT id, university_id, category, title, description, \"order\", url "
        "FROM documents WHERE id = ?");
    statement.bind(1, id);
    if (!statement.next("Get document"))
        return std::nullopt;
    return statement.document();
}

bool Database::updateDocument(const Document& document)
{
    requireUniversity(document.universityId);
    categoryText(document.category);
    Statement statement(*this,
        "UPDATE documents SET university_id = ?, category = ?, title = ?, description = ?, "
        "\"order\" = ?, url = ? WHERE id = ?");
    statement.bindFields(document);
    statement.bind(7, document.id);
    statement.execute("Update document");
    return sqlite3_changes(db) != 0;
}

bool Database::deleteDocument(std::int64_t id)
{
    Statement statement(*this, "DELETE FROM documents WHERE id = ?");
    statement.bind(1, id);
    statement.execute("Delete document");
    return sqlite3_changes(db) != 0;
}

std::vector<Document> Database::getDocuments(
    const std::string& universityId, std::optional<DocumentCategory> category)
{
    requireUniversity(universityId);
    if (category)
        categoryText(*category);
    Statement statement(*this, category ?
        "SELECT id, university_id, category, title, description, \"order\", url "
        "FROM documents WHERE university_id = ? AND category = ? ORDER BY \"order\", id" :
        "SELECT id, university_id, category, title, description, \"order\", url "
        "FROM documents WHERE university_id = ? ORDER BY \"order\", id");
    statement.bind(1, universityId);
    if (category)
        statement.bind(2, categoryText(*category));
    std::vector<Document> documents;
    while (statement.next("Get documents"))
        documents.push_back(statement.document());
    return documents;
}

void Database::throwError(const char* operation) const
{
    throw std::runtime_error(std::string(operation) + ": " + sqlite3_errmsg(db));
}
