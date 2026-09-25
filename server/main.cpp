#include <iostream>
#include <cstdlib>
#include <clocale>
#include <curl/curl.h>
#include "api_client.h"
#include "bot_logic.h"
#include "server.h"

int main() {
    std::setlocale(LC_ALL, "ru_RU.UTF-8");
    curl_global_init(CURL_GLOBAL_ALL);

    const char* env_token = std::getenv("BOT_TOKEN");
    if (!env_token) {
        std::cerr << "Ошибка: переменная BOT_TOKEN не задана!\n";
        return 1;
    }

    ApiClient apiClient(env_token);
    BotLogic botLogic(apiClient);
    AppServer appServer(apiClient, botLogic);

    appServer.startRestServer();
    appServer.startLongPolling();

    curl_global_cleanup();
    return 0;
}
