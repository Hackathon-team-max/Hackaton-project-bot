#include "server.h"
#include "api_client.h"
#include "bot_logic.h"
#include "httplib.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <cstdlib>
#include <string>
#include <thread>
#include <chrono>

AppServer::AppServer(ApiClient& apiClient, BotLogic& botLogic) 
    : api_(apiClient), bot_(botLogic) {}

void AppServer::startRestServer() {
    std::thread serverThread([this]() {
        httplib::Server svr;

        svr.set_post_routing_handler([](const httplib::Request&, httplib::Response& res) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_header("Access-Control-Allow-Headers", "Content-Type");
            res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        });
        
        svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
            res.status = 204;
        });

        svr.Get("/api/ping", [](const httplib::Request&, httplib::Response& res) {
            res.set_content("{\"ok\":true}", "application/json");
        });

        const char* portEnv = std::getenv("PORT");
        int port = portEnv ? std::stoi(portEnv) : 8080;

        std::cout << "[rest] Server started on 0.0.0.0:" << port << "\n";
        svr.listen("0.0.0.0", port);
    });
    
    serverThread.detach();
}

void AppServer::startLongPolling() {
    long long marker = 0;
    bool firstRequest = true;

    std::cout << "[poll] Начинаю Long Polling...\n";

    while (true) {
        try {
            std::string path = api_.getUpdatesMethod() + "?timeout=30&limit=100";
            if (!firstRequest) {
                path += "&marker=" + std::to_string(marker);
            }

            // Создаем пустой json объект для сигнатуры метода
            nlohmann::json emptyBody;
            std::string resp = api_.apiRequest("GET", path, emptyBody, false, 60L);

            if (resp.empty()) {
                std::this_thread::sleep_for(std::chrono::seconds(1));
                continue;
            }

            std::cout << "[poll] raw: " << resp << "\n";

            auto data = nlohmann::json::parse(resp);

            if (data.contains("marker") && !data["marker"].is_null()) {
                marker = data["marker"].get<long long>();
                firstRequest = false;
            }

            if (data.contains("updates") && data["updates"].is_array()) {
                for (auto& update : data["updates"]) {
                    bot_.handleUpdate(update);
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
