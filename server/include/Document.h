#pragma once

#include <cstdint>
#include <string>

enum class DocumentCategory
{
    Mandatory,
    Additional
};

struct Document
{
    std::int64_t id = 0;
    std::string universityId;
    DocumentCategory category = DocumentCategory::Mandatory;
    std::string title;
    std::string description;
    int order = 0;
    std::string url;
};
