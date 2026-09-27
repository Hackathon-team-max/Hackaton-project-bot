#pragma once

#include <cstdint>
#include <initializer_list>
#include <optional>
#include <string>

struct User
{
    std::int64_t userId = 0;
    std::string lastName;
    std::string firstName;
    std::string patronymic;
    std::string address;
    std::string snils;
    std::string email;
    std::string passport;
    std::optional<std::string> universityId;
    std::string updatedAt;

    std::string fullName() const
    {
        std::string result;
        for (const auto* part : {&lastName, &firstName, &patronymic})
        {
            if (!part->empty())
            {
                if (!result.empty())
                    result += ' ';
                result += *part;
            }
        }
        return result;
    }
};
