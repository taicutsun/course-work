cmake_minimum_required(VERSION 3.16)
project(minis3 VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

find_package(Threads REQUIRED)

set(OPENSSL_ROOT_DIR /opt/homebrew/opt/openssl@3)
find_package(OpenSSL REQUIRED)

set(BOOST_ROOT /opt/homebrew)
find_package(Boost 1.78 REQUIRED)

include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${Boost_INCLUDE_DIRS}
)

set(SOURCES
    src/main.cpp
    src/core/config.cpp
    src/core/thread_pool.cpp
    src/http/http_parser.cpp
    src/storage/object_store.cpp
    src/server/server.cpp
    src/server/tls.cpp
    src/server/ui.cpp
    src/server/tui.cpp
)

add_executable(minis3 ${SOURCES})

target_link_libraries(minis3
    PRIVATE
        Threads::Threads
        OpenSSL::Crypto
        OpenSSL::SSL
)

target_compile_options(minis3 PRIVATE -Wall -Wextra)

# Standalone terminal client
add_executable(minis3cli src/client/tui_client.cpp)
target_compile_options(minis3cli PRIVATE -Wall -Wextra)
target_compile_features(minis3cli PRIVATE cxx_std_17)

install(TARGETS minis3 minis3cli DESTINATION bin)
