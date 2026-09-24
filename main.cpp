#include <iostream>
#include <string>
#include <cstdlib>
#include <thread>
#include <chrono>
#include <clocale>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include "httplib.h"
#include <map>

using json = nlohmann::json;

// ================== НАСТРОЙКИ MAX API ==================
const std::string API_BASE = "https://platform-api2.max.ru";
const std::string UPDATES_METHOD = "/updates";
const std::string SEND_METHOD = "/messages";
// =======================================================

std::string g_token;
std::map<long long, std::string> g_userState; // user_id → состояние

const std::vector<std::string> UNIVERSITIES = {
    "МГТУ им. Н.Э. Баумана",
    "МГУ им. М.В. Ломоносова",
    "СПбГУ",
    "МФТИ",
    "НИУ ВШЭ",
    "МГИМО",
    "РУДН",
    "МЭИ",
    "МИФИ",
    "ИТМО"
};

// ---------- libcurl ----------
static size_t WriteCB(void* data, size_t size, size_t nmemb, std::string* out) {
    out->append((char*)data, size* nmemb);
    return size * nmemb;
}

std::string apiRequest(const std::string& method,
                       const std::string& path,
                       const json& body = json(),
                       bool isPost = false,
                       long timeout = 60L) {
    CURL* curl = curl_easy_init();
    std::string response;

    if (curl) {
        std::string url = API_BASE + path;

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, ("Authorization: " + g_token).c_str());
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCB);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, timeout);

        // Отключение проверки SSL — только для отладки на Windows
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);

        std::string payload;
        if (isPost) {
            payload = body.dump();
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
        }

        CURLcode res = curl_easy_perform(curl);
        if (res != CURLE_OK && res != CURLE_OPERATION_TIMEDOUT) {
            std::cerr << "[curl] " << method << " " << url
                      << " error: " << curl_easy_strerror(res) << "\n";
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    return response;
}

// ---------- Отправка сообщения с кнопками ----------
void sendMenu(long long userId, const std::string& text, const json& buttons) {
    std::string path = SEND_METHOD + "?user_id=" + std::to_string(userId);
    json body = {
        {"text", text},
        {"attachments", json::array({
            {
                {"type", "inline_keyboard"},
                {"payload", {{"buttons", buttons}}}
            }
        })}
    };
    std::string resp = apiRequest("POST", path, body, true);
    std::cout << "[send-menu] " << resp << "\n";
}

// ---------- Главное меню ----------
void showMainMenu(long long userId) {
    json buttons = json::array({
        
        json::array({
            {{"type", "callback"}, {"text", "Учёба"}, {"payload", "menu:study"}},
            {{"type", "callback"}, {"text", "Военная служба"}, {"payload", "menu:military"}}
        }),
        
        json::array({
            {{"type", "callback"}, {"text", "Работа"}, {"payload", "menu:work"}},
            {{"type", "callback"}, {"text", "Бизнес"}, {"payload", "menu:business"}}
        })
    });
    sendMenu(userId, "Выберите категорию:", buttons);
}

void showStudyMenu(long long userId) {
    json buttons = json::array({
        json::array({
            {{"type", "callback"}, {"text", "Школа"}, {"payload", "study:school"}},
            {{"type", "callback"}, {"text", "Вуз"}, {"payload", "study:university"}}
        }),
        json::array({
            {{"type", "callback"}, {"text", "Назад"}, {"payload", "menu:main"}}
        })
    });
    sendMenu(userId, "Учёба — выберите раздел:", buttons);
}

// ---------- Отправка сообщения ----------
// user_id передаётся в URL, текст — в теле
void sendMessage(long long userId, const std::string& text) {
    std::string path = SEND_METHOD + "?user_id=" + std::to_string(userId);
    json body = {
        {"text", text}
    };
    std::string resp = apiRequest("POST", path, body, true);
    std::cout << "[send] " << resp << "\n";
}

void handleUpdate(const json& update) {
    std::string updateType = update.value("update_type", "");

    // ===== 1. Новое сообщение от пользователя =====
    if (updateType == "message_created") {
        if (!update.contains("message")) return;
        auto& msg = update["message"];

        long long userId = 0;
        if (msg.contains("sender") && msg["sender"].contains("user_id")) {
            userId = msg["sender"]["user_id"];
        } else {
            return;
        }

        std::string text;
        if (msg.contains("body") && msg["body"].contains("text") && !msg["body"]["text"].is_null()) {
            text = msg["body"]["text"].get<std::string>();
        }

        std::cout << "[in] user=" << userId << " text=" << text << "\n";

        if (text == "/menu") {
            showMainMenu(userId);
        } 
	else if (text == "/start") {
	    sendMessage(userId, "Приветствуем в боте по получению социальных услуг!");
	}
	if (g_userState[userId] == "awaiting_university_search") {
    	
    	std::string query = text;
    	std::transform(query.begin(), query.end(), query.begin(), ::tolower);

    	std::vector<std::string> found;
    	for (const auto& uni : UNIVERSITIES) {
            std::string uniLower = uni;
            std::transform(uniLower.begin(), uniLower.end(), uniLower.begin(), ::tolower);
            if (uniLower.find(query) != std::string::npos) {
                found.push_back(uni);
            }
        }

        if (found.empty()) {
            sendMessage(userId, "Ничего не найдено. Попробуйте другое название:");
        } else {
            json buttons = json::array();
            for (const auto& uni : found) {
                buttons.push_back(json::array({
                    {{"type", "callback"}, {"text", uni}, {"payload", "study:university:open:" + uni}}
                }));
            }
            buttons.push_back(json::array({
                {{"type", "callback"}, {"text", "Назад"}, {"payload", "study:university"}}
            }));

            sendMenu(userId, "Найдено:", buttons);
        }

        g_userState[userId] = "";
        return;
    }
	else if (!text.empty()) {
            sendMessage(userId, "Напишите /menu для меню.");
        }
        return;
    }

    // ===== 2. Нажатие кнопки =====
    if (updateType == "message_callback") {
        if (!update.contains("callback")) return;
        auto& cb = update["callback"];

        long long userId = 0;
        if (cb.contains("user") && cb["user"].contains("user_id")) {
            userId = cb["user"]["user_id"];
        } else {
            return;
        }

        std::string payload = cb.value("payload", "");
        std::cout << "[callback] user=" << userId << " payload=" << payload << "\n";

        if (payload == "menu:study") {
            showStudyMenu(userId);
        } else if (payload == "menu:military") {
            sendMessage(userId, "Раздел «Военная служба» — скоро тут будет меню.");
        } else if (payload == "menu:work") {
            sendMessage(userId, "Раздел «Работа» — скоро тут будет меню.");
        } else if (payload == "menu:business") {
            sendMessage(userId, "Раздел «Бизнес» — скоро тут будет меню.");
        } 
	else if (payload == "study:university") {
    	    g_userState[userId] = "awaiting_university_search";
    	    sendMessage(userId, "Введите название вуза (например, «МГТУ» или «Баумана»):");
	}
	else if (payload == "study:school") {
    	    sendMessage(userId, "Раздел «Школа» — скоро.");
	}
	else if (payload.find("study:university:open:") == 0) {
    	    std::string uni = payload.substr(21); // длина "study:university:open:"
    	    std::cout << "[callback] выбран вуз: " << uni << "\n";

    	    json buttons = json::array({
            json::array({
            	    {
                	    {"type", "open_app"},
                	    {"text", "Открыть справки для " + uni},
                	    {"url", "https://ваш-мини-апп.vercel.app/?uni=" + uni}
            	    }
        	    })
    	    });
    	    sendMenu(userId, "Нажмите, чтобы открыть:", buttons);
	    }
	else {
            sendMessage(userId, "Неизвестная команда: " + payload);
        }
    }
}

void longPollingLoop() {
    long long marker = 0;
    bool firstRequest = true;

    std::cout << "[poll] Начинаю Long Polling...\n";

    while (true) {
        try {
            std::string path = UPDATES_METHOD + "?timeout=30&limit=100";
            if (!firstRequest) {
                path += "&marker=" + std::to_string(marker);
            }

            std::string resp = apiRequest("GET", path, json(), false, 60L);

            if (resp.empty()) {
                std::this_thread::sleep_for(std::chrono::seconds(1));
                continue;
            }

            std::cout << "[poll] raw: " << resp << "\n";

            auto data = json::parse(resp);

            if (data.contains("marker") && !data["marker"].is_null()) {
                marker = data["marker"].get<long long>();
                firstRequest = false;
            }

            if (data.contains("updates") && data["updates"].is_array()) {
                for (auto& update : data["updates"]) {
                    handleUpdate(update);
                }
            }

            if (!data.contains("updates") || data["updates"].empty()) {
                std::this_thread::sleep_for(std::chrono::milliseconds(300));
            }

        } catch (const std::exception& e) {
            std::cerr << "[poll] error: " << e.what() << "\n";
            std::this_thread::sleep_for(std::chrono::seconds(2));
        }
    }
}

int main() {
    std::setlocale(LC_ALL, "ru_RU.UTF-8");
    curl_global_init(CURL_GLOBAL_ALL);

    const char* env_token = std::getenv("BOT_TOKEN");
    if (!env_token) {
        std::cerr << "Ошибка: переменная BOT_TOKEN не задана!\n";
        return 1;
    }
    g_token = env_token;

    std::cout << "Бот запущен (Long Polling)\n";

    // 2) REST для мини-аппа — в отдельном потоке
    std::thread restThread([]() {
        httplib::Server svr;

        // CORS — чтобы мини-апп мог стучаться
        svr.set_post_routing_handler([](const httplib::Request&, httplib::Response& res) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_header("Access-Control-Allow-Headers", "Content-Type");
            res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        });
        svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
            res.status = 204;
        });

        // Проверка, что сервер жив
        svr.Get("/api/ping", [](const httplib::Request&, httplib::Response& res) {
            res.set_content("{\"ok\":true}", "application/json");
        });


	#if 0
        // Список справок для мини-аппа
        svr.Get("/api/spravki", [](const httplib::Request&, httplib::Response& res) {
            json spravki = json::array({
                {
                    {"id", "income"},
                    {"title", "Справка о доходах"},
                    {"steps", json::array({
                        "Зайдите на gosuslugi.ru",
                        "Откройте раздел «Доходы»",
                        "Нажмите «Заказать справку»",
                        "Выберите период и скачайте PDF"
                    })},
                    {"documents", json::array({"Паспорт", "ИНН"})},
                    {"url", "https://www.gosuslugi.ru/"}
                },
                {
                    {"id", "no-criminal"},
                    {"title", "Справка об отсутствии судимости"},
                    {"steps", json::array({
                        "Зайдите на gosuslugi.ru",
                        "Откройте раздел «Справки»",
                        "Выберите «Об отсутствии судимости»",
                        "Заполните заявление и отправьте"
                    })},
                    {"documents", json::array({"Паспорт"})},
                    {"url", "https://www.gosuslugi.ru/"}
                }
            });
            res.set_content(spravki.dump(), "application/json");
        });

	#endif

        const char* portEnv = std::getenv("PORT");
        int port = portEnv ? std::stoi(portEnv) : 8080;

        std::cout << "[rest] Server on :" << port << "\n";
        svr.listen("0.0.0.0", port);
    });
    restThread.detach();

    longPollingLoop();

    curl_global_cleanup();
    return 0;
}