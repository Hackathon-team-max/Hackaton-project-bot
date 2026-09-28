#include <iostream>
#include <cstdlib>
#include <clocale>
#include <curl/curl.h>
#include "api_client.h"
#include "bot_logic.h"
#include "server.h"

#include "include/Database.h"
#include "include/Document.h"

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
    Database database("application.db");

    if (database.getDocuments("bmstu").empty()) {

        // ==========================================
        //           ОБЯЗАТЕЛЬНЫЕ ДОКУМЕНТЫ
        // ==========================================

        Document doc1;
        doc1.universityId  = "bmstu";
        doc1.category      = DocumentCategory::Mandatory;
        doc1.title         = "Паспорт";
        doc1.description   = "Либо другой документ удостоверяющий личность (2 и 3 развороты)";
        doc1.order         = 1;
        doc1.url           = "";
        database.addDocument(doc1);

        Document doc2;
        doc2.universityId  = "bmstu";
        doc2.category      = DocumentCategory::Mandatory;
        doc2.title         = "Аттестат о среднем (полном) общем образовании";
        doc2.description   = "Либо диплом о среднем профессиональном образовании";
        doc2.order         = 2;
        doc2.url           = "";
        database.addDocument(doc2);

        Document doc3;
        doc3.universityId  = "bmstu";
        doc3.category      = DocumentCategory::Mandatory;
        doc3.title         = "СНИЛС";
        doc3.description   = "Предоставляется при наличии";
        doc3.order         = 3;
        doc3.url           = "";
        database.addDocument(doc3);

        // ==========================================
        //         ДОПОЛНИТЕЛЬНЫЕ ДОКУМЕНТЫ
        // ==========================================

        Document doc5;
        doc5.universityId  = "bmstu";
        doc5.category      = DocumentCategory::Additional;
        doc5.title         = "Документы, подтверждающие индивидуальные достижения";
        doc5.description   = "Портфолио, дипломы олимпиад и конкурсов";
        doc5.order         = 5;
        doc5.url           = "https://lk.gosuslugi.ru/profile/education/olympics";
        database.addDocument(doc5);

        Document doc6;
        doc6.universityId  = "bmstu";
        doc6.category      = DocumentCategory::Additional;
        doc6.title         = "Справка СЭМД-196";
        doc6.description   = "Медицинская справка на отдельные направления подготовки";
        doc6.order         = 6;
        doc6.url           = "https://www.gosuslugi.ru/10700/?_=1790453411975";
        database.addDocument(doc6);

        Document doc8;
        doc8.universityId  = "bmstu";
        doc8.category      = DocumentCategory::Additional;
        doc8.title         = "Документы, подтверждающие особые права";
        doc8.description   = "Право поступления в рамках установленных квот (в т.ч. по инвалидности)";
        doc8.order         = 8;
        doc8.url           = "https://www.gosuslugi.ru/invalidam/receive-certificates";
        database.addDocument(doc8);

        Document doc9;
        doc9.universityId  = "bmstu";
        doc9.category      = DocumentCategory::Additional;
        doc9.title         = "Приписное свидетельство";
        doc9.description   = "Документы воинского учета (для военнообязанных)";
        doc9.order         = 9;
        doc9.url           = "https://www.gosuslugi.ru/648111/1/form";
        database.addDocument(doc9);

    }


    AppServer appServer(apiClient, botLogic, database);

    updateBotCommands(apiClient);

    appServer.startRestServer();
    appServer.startLongPolling();

    curl_global_cleanup();
    return 0;
}
