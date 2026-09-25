cmake_minimum_required(VERSION 3.15)
project(hackaton_max CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(WIN32)
    add_compile_definitions(_WIN32_WINNT=0x0A00 WINVER=0x0A00)
endif()

find_package(CURL REQUIRED)
find_package(Threads REQUIRED)

add_executable(max_bot 
    main.cpp 
    api_client.cpp 
    bot_logic.cpp 
    server.cpp
)



target_include_directories(max_bot PRIVATE include)

target_link_libraries(max_bot PRIVATE
    CURL::libcurl
    Threads::Threads
)

if(WIN32)
    target_link_libraries(max_bot PRIVATE ws2_32)
endif()
