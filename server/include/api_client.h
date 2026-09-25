#pragma once

#include <string>

namespace nlohmann {
    class json;
}

class ApiClient {
public:
    explicit ApiClient(const std::string& token);

    std::string apiRequest(const std::string& method,
                           const std::string& path,
                           const nlohmann::json& body,
                           bool isPost = false,
                           long timeout = 60L);

    std::string getUpdatesMethod() const { return UPDATES_METHOD; }
    std::string getSendMethod() const { return SEND_METHOD; }

private:
    std::string token_;
    const std::string API_BASE = "https://max.ru";
    const std::string UPDATES_METHOD = "/updates";
    const std::string SEND_METHOD = "/messages";

    static size_t writeCallback(void* data, size_t size, size_t nmemb, std::string* out);
};