#pragma once

class ApiClient;
class BotLogic;

class AppServer {
public:
    AppServer(ApiClient& apiClient, BotLogic& botLogic);

    void startRestServer();
    void startLongPolling();

private:
    ApiClient& api_;
    BotLogic& bot_;
};
