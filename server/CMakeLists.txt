cmake_minimum_required(VERSION 3.15)
project(hackaton_max CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(WIN32)
    add_compile_definitions(_WIN32_WINNT=0x0A00 WINVER=0x0A00)
endif()

find_package(CURL REQUIRED)
find_package(Threads REQUIRED)
find_package(SQLite3 REQUIRED)

add_library(database STATIC Database.cpp)
target_compile_features(database PUBLIC cxx_std_17)
target_include_directories(database PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
if(TARGET SQLite3::SQLite3)
    target_link_libraries(database PRIVATE SQLite3::SQLite3)
else()
    target_link_libraries(database PRIVATE SQLite::SQLite3)
endif()

add_executable(max_bot 
    main.cpp 
    api_client.cpp 
    bot_logic.cpp 
    server.cpp
)



target_include_directories(max_bot PRIVATE include)

target_link_libraries(max_bot PRIVATE
    database
    CURL::libcurl
    Threads::Threads
)

if(WIN32)
    target_link_libraries(max_bot PRIVATE ws2_32)
endif()
