#include <iostream>
#include <cstdlib>
#include <clocale>
#include <curl/curl.h>
#include "api_client.h"
#include "bot_logic.h"
#include "server.h"

void updateBotCommands(ApiClient& cl) {
    nlohmann::json body = {
        {"commands", nlohmann::json::array({
            {{"name", "start"}, {"description", "Показать приветствие"}},
            {{"name", "menu"}, {"description", "Главное меню"}}
        })}
    };
    std::string resp = cl.apiRequest("PATCH", "/me/commands", body, true);
    std::cout << "[commands] " << resp << "\n";
}

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

    updateBotCommands(apiClient);

    appServer.startRestServer();
    appServer.startLongPolling();

    curl_global_cleanup();
    return 0;
}
