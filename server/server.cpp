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
#include <cstdint>
#include <regex>

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
	
	svr.Get(R"(/api/user/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
    	    std::string userIdStr = req.matches[1].str();
    	    long long userId = std::stoll(userIdStr);
	    nlohmann::json responseJson;
	    //TODO
    	    if (userId == 375115529) {
        	responseJson = {
            	    {"exists", true},
            	    {"user_id", userId},
            	    {"full_name", "Иванов Иван Иванович"},
            	    {"address", "г. Москва, ул. Ленина, 5"},
            	    {"snils", "123-456-789 00"},
            	    {"email", "ivan@mail.ru"},
            	    {"passport", "1234 567890"},
            	    {"university_id", "bmstu"}
        	};
    	    } else {
        	responseJson = {
            	    {"exists", false},
            	    {"user_id", userId}
        	};
    	    }
            res.set_content(responseJson.dump(), "application/json");
        });
	
	svr.Post("/api/user/profile", [](const httplib::Request& req, httplib::Response& res) {
            nlohmann::json responseJson;
    	    try {
        	auto body = nlohmann::json::parse(req.body);

        	if (!body.contains("user_id") || body["user_id"].is_null()) {
            	    res.status = 400;
            	    responseJson = {{"error", "user_id is required"}};
        	} else {
		    //TODO
		    long long userId = body["user_id"].get<long long>();
            
            	    std::string fullName   = body.value("full_name", "");
            	    std::string address    = body.value("address", "");
            	    std::string snils      = body.value("snils", "");
		    std::string email      = body.value("email", "");
            	    std::string passport   = body.value("passport", "");
            	    std::string university = body.value("university_id", "");

            	    responseJson = {{"ok", true}};
        	}
    	    } catch (const std::exception& e) {
        	res.status = 400;
        	responseJson = {{"error", "Invalid JSON format"}};
    	    }
    	    res.set_content(responseJson.dump(), "application/json");
	});

	svr.Get(R"(/api/universities/([^/]+)/documents)", [this](const httplib::Request& req, httplib::Response& res) {
    	    std::string uniId = req.matches[1].str();

	    nlohmann::json mandatoryArray = nlohmann::json::array();
    	    nlohmann::json additionalArray = nlohmann::json::array();

	    //TODO
/*
   	    auto mandatoryRows = [];
    
    	    for (const auto& row : mandatoryRows) {
            
                std::string title = row.get_string("title");
                std::string desc  = row.get_string("description");
                std::string url   = row.get_string("url");

        
                nlohmann::json doc = {
            	    {"title", title},
            	    {"description", desc.empty() ? std::string() : desc},
            	    {"url", url.empty() ? std::string() : url}
                };

                mandatoryArray.push_back(doc);
            }
	
	    //TODO
	    auto additionalRows = [];
    
    	    for (const auto& row : additionalRows) {
        	std::string title = row.get_string("title");
        	std::string desc  = row.get_string("description");
        	std::string url   = row.get_string("url");

        	nlohmann::json doc = {
            	    {"title", title},
            	    {"description", desc.empty() ? std::string() : desc},
                    {"url", url.empty() ? std::string() : url}
        	};

        
        	additionalArray.push_back(doc);
    	    }


	    nlohmann::json responseJson = {
        	{"title", "Документы для поступления"},
        	{"university_id", uniId},
        
        	{"university_name", uniId == "bmstu" ? "МГТУ им. Н.Э. Баумана" : "Другой ВУЗ"},
        	{"description", "Уже начался приём заявлений..."},
        
        
        	{"mandatory", mandatoryArray},
        	{"additional", additionalArray}
    	    };

    	    res.set_content(responseJson.dump(), "application/json");
*/
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

            nlohmann::json emptyBody;
            std::string resp = api_.apiRequest("GET", path, emptyBody, false, 60L);

            if (resp.empty()) {
                std::this_thread::sleep_for(std::chrono::seconds(1));
                continue;
            }

            std::cout << "[poll] raw: " << resp << "\n";

            auto data = nlohmann::json::parse(resp);

            if (data.contains("marker") && !data["marker"].is_null()) {
                marker = data["marker"].get<int64_t>();
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
