#include "api_client.h"
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <iostream>

ApiClient::ApiClient(const std::string& token) : token_(token) {}

size_t ApiClient::writeCallback(void* data, size_t size, size_t nmemb, std::string* out) {
    out->append((char*)data, size * nmemb);
    return size * nmemb;
}

std::string ApiClient::apiRequest(const std::string& method,
                                  const std::string& path,
                                  const nlohmann::json& body,
                                  bool isPost,
                                  long timeout) {
    CURL* curl = curl_easy_init();
    std::string response;

    if (curl) {
        std::string url = API_BASE + path;

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, ("Authorization: " + token_).c_str());
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, timeout);

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
