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
#include "include/Database.h"
#include "include/User.h"
#include "include/Document.h"

AppServer::AppServer(ApiClient& apiClient, BotLogic& botLogic, Database& database)
    : api_(apiClient), bot_(botLogic), db_(database) {}

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

	svr.Get(R"(/api/user/(\d+))", [this](const httplib::Request& req, httplib::Response& res) {
    	    std::string userIdStr = req.matches[1].str();
    	    long long userId = std::stoll(userIdStr);
			nlohmann::json responseJson;

			std::lock_guard<std::mutex> lock(dbMutex_);
			auto userOpt = db_.getUser(userId);

			if (userOpt.has_value()) {
				const User& u = userOpt.value();
			    responseJson = nlohmann::json{
					{"exists", true},
					{"user_id", u.userId},
					{"full_name", u.fullName()},
					{"address", u.address},
					{"snils", u.snils},
					{"email", u.email},
					{"passport", u.passport},
					{"university_id", u.universityId.value_or("")}
				};
			} else {
			    responseJson = {
					{"exists", false},
					{"user_id", userId}
				};
			}
            res.set_content(responseJson.dump(), "application/json");
        });
	
	svr.Post("/api/user/profile", [this](const httplib::Request& req, httplib::Response& res) {
            nlohmann::json responseJson;
    	    try {
        	    auto body = nlohmann::json::parse(req.body);

        	    if (!body.contains("user_id") || body["user_id"].is_null()) {
			        res.status = 400;
            	    responseJson = {{"error", "user_id is required"}};
        	    } else {
		            long long userId = body["user_id"].get<long long>();
				    User u;
				    u.userId = userId;

				    std::string fullName = body.value("full_name", "");
				    u.lastName = fullName;
				    u.firstName = "";
				    u.patronymic = "";

				    u.address    = body.value("address", "");
				    u.snils      = body.value("snils", "");
				    u.email      = body.value("email", "");
				    u.passport   = body.value("passport", "");

				    if (body.contains("university_id") && !body["university_id"].is_null()) {
					    u.universityId = body["university_id"].get<std::string>();
				    }

				    std::lock_guard<std::mutex> lock(dbMutex_);
				    if (db_.userExists(userId)) {
					    db_.updateUser(u);
				    } else {
					    db_.addUser(u);
				    }

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

		std::vector<Document> allDocs;
		{
			std::lock_guard<std::mutex> lock(dbMutex_);
			allDocs = db_.getDocuments(uniId);
		}

		for (const auto& doc : allDocs) {
			nlohmann::json jsonDoc = {
				{"title", doc.title},
				{"description", doc.description},
				{"url", doc.url}
			};

			if (doc.category == DocumentCategory::Mandatory) {
				mandatoryArray.push_back(jsonDoc);
			} else if (doc.category == DocumentCategory::Additional) {
				additionalArray.push_back(jsonDoc);
			}
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
