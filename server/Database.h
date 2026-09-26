#pragma once

#include "User.h"

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

private:
    class Statement;

    sqlite3* db = nullptr;

    void createTables();
    [[noreturn]] void throwError(const char* operation) const;
};
