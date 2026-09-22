#include <iostream>
#include <string>
#include <cstdlib>
#include <thread>
#include <chrono>
#include <clocale>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include "httplib.h"

using json = nlohmann::json;

// ================== НАСТРОЙКИ MAX API ==================
const std::string API_BASE = "https://platform-api2.max.ru";
const std::string UPDATES_METHOD = "/updates";
const std::string SEND_METHOD = "/messages";
// =======================================================

std::string g_token;

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

// ---------- Обработка события ----------
void handleUpdate(const json& update) {
    std::string updateType = update.value("update_type", "");

    if (updateType != "message_created") return;
    if (!update.contains("message")) return;

    auto& msg = update["message"];

    long long userId = 0;
    if (msg.contains("sender") && msg["sender"].contains("user_id")) {
        userId = msg["sender"]["user_id"];
    } else {
        std::cerr << "[warn] Нет sender.user_id\n";
        return;
    }

    std::string text;
    if (msg.contains("body") && msg["body"].contains("text") && !msg["body"]["text"].is_null()) {
        text = msg["body"]["text"].get<std::string>();
    }

    std::cout << "[in] user=" << userId << " text=" << text << "\n";

    if (text == "/start" || text == "/hello" || text == "hello") {
        sendMessage(userId, "Привет! Я помогу с госсправками.");
    } else if (!text.empty()) {
        sendMessage(userId, "Эхо: " + text);
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