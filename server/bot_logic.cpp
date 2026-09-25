#include "bot_logic.h"
#include "api_client.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <algorithm>

using json = nlohmann::json;

BotLogic::BotLogic(ApiClient& apiClient) 
    : api_(apiClient),
      universities_({
          "МГТУ им. Н.Э. Баумана", "МГУ им. М.В. Ломоносова", "СПбГУ", 
          "МФТИ", "НИУ ВШЭ", "МГИМО", "РУДН", "МЭИ", "МИФИ", "ИТМО"
      }) {}

void BotLogic::sendMessage(long long userId, const std::string& text) {
    std::string path = api_.getSendMethod() + "?user_id=" + std::to_string(userId);
    json body = { {"text", text} };
    std::string resp = api_.apiRequest("POST", path, body, true);
    std::cout << "[send] " << resp << "\n";
}

void BotLogic::sendMenu(long long userId, const std::string& text, const json& buttons) {
    std::string path = api_.getSendMethod() + "?user_id=" + std::to_string(userId);
    json body = {
        {"text", text},
        {"attachments", json::array({
            {
                {"type", "inline_keyboard"},
                {"payload", {{"buttons", buttons}}}
            }
        })}
    };
    std::string resp = api_.apiRequest("POST", path, body, true);
    std::cout << "[send-menu] " << resp << "\n";
}

void BotLogic::showMainMenu(long long userId) {
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

void BotLogic::showStudyMenu(long long userId) {
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

void BotLogic::handleUpdate(const json& update) {
    std::string updateType = update.value("update_type", "");

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
        else if (userStates_[userId] == "awaiting_university_search") {
            std::string query = text;
            std::transform(query.begin(), query.end(), query.begin(), ::tolower);

            std::vector<std::string> found;
            for (const auto& uni : universities_) {
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

            userStates_[userId] = "";
            return;
        }
        else if (!text.empty()) {
            sendMessage(userId, "Напишите /menu для меню.");
        }
        return;
    }

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
            userStates_[userId] = "awaiting_university_search";
            sendMessage(userId, "Введите название вуза (например, «МГТУ» или «Баумана»):");
        }
        else if (payload == "study:school") {
            sendMessage(userId, "Раздел «Школа» — скоро.");
        }
        else if (payload.find("study:university:open:") == 0) {
            std::string uni = payload.substr(21);
            std::cout << "[callback] выбран вуз: " << uni << "\n";

            json buttons = json::array({
                json::array({
                    {
                        {"type", "open_app"},
                        {"text", "Открыть справки для " + uni},
                        {"url", "https://vercel.app" + uni}
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
