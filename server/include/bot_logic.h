#pragma once

#include <string>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>

class ApiClient;

class BotLogic {
public:
    explicit BotLogic(ApiClient& apiClient);
    void handleUpdate(const nlohmann::json& update);

private:
    ApiClient& api_;
    std::map<long long, std::string> userStates_;
    const std::vector<std::string> universities_;

    void sendMessage(long long userId, const std::string& text);
    void sendMenu(long long userId, const std::string& text, const nlohmann::json& buttons);
    void showMainMenu(long long userId);
    void showStudyMenu(long long userId);
};
