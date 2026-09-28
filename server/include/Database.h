#pragma once

#include "User.h"
#include "Document.h"

#include <optional>
#include <string>
#include <vector>

struct sqlite3;

// Serialize access externally if an instance is shared between threads.
class Database
{
public:
    explicit Database(const std::string& filename);
    ~Database() noexcept;

    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    // False means a duplicate ID; other database errors throw std::runtime_error.
    bool addUser(const User& user);
    std::optional<User> getUser(std::int64_t id);

    // False means the ID does not exist, including for deleteUser.
    bool updateUser(const User& user);
    bool deleteUser(std::int64_t id);
    bool userExists(std::int64_t id);
    std::vector<User> getAllUsers();

    // The input ID is ignored; SQLite assigns and returns a new ID.
    std::int64_t addDocument(const Document& document);
    std::optional<Document> getDocument(std::int64_t id);
    bool updateDocument(const Document& document);
    bool deleteDocument(std::int64_t id);
    std::vector<Document> getDocuments(
        const std::string& universityId,
        std::optional<DocumentCategory> category = std::nullopt);

private:
    class Statement;

    sqlite3* db = nullptr;

    void createTables();
    void validateSchema();
    [[noreturn]] void throwError(const char* operation) const;
};
