#pragma once

#include <mutex>

class ApiClient;
class BotLogic;
class Database;


class AppServer {
public:
    AppServer(ApiClient& apiClient, BotLogic& botLogic, Database& database);

    void startRestServer();
    void startLongPolling();

private:
    ApiClient& api_;
    BotLogic& bot_;
    Database& db_;
    std::mutex dbMutex_;
};
