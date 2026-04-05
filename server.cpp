#include <winsock2.h>
#include <ws2tcpip.h>
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>

#pragma comment(lib, "Ws2_32.lib")

using namespace std;

string get_content_type(const string& path) {
    if (path.find(".html") != string::npos) return "text/html";
    if (path.find(".css") != string::npos) return "text/css";
    if (path.find(".js") != string::npos) return "application/javascript";
    if (path.find(".png") != string::npos) return "image/png";
    if (path.find(".jpg") != string::npos || path.find(".jpeg") != string::npos) return "image/jpeg";
    return "text/plain";
}

void handle_client(SOCKET clientSocket) {
    char buffer[4096];
    int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
    if (bytesReceived <= 0) {
        closesocket(clientSocket);
        return;
    }
    buffer[bytesReceived] = '\0';
    
    string request(buffer);
    istringstream iss(request);
    string method, path, version;
    iss >> method >> path >> version;

    if (path == "/") path = "/index.html";

    // Handle dummy API endpoint for progression
    if (path.find("/api/") == 0) {
        string response_body = "{\"status\":\"success\"}";
        ostringstream response;
        response << "HTTP/1.1 200 OK\r\n"
                 << "Content-Type: application/json\r\n"
                 << "Access-Control-Allow-Origin: *\r\n"
                 << "Connection: close\r\n\r\n"
                 << response_body;
        send(clientSocket, response.str().c_str(), response.str().length(), 0);
    } else {
        // Serve static files from 'public' directory
        string full_path = "public" + path;
        ifstream file(full_path, ios::binary);
        if (file.is_open()) {
            ostringstream ss;
            ss << file.rdbuf();
            string body = ss.str();
            string content_type = get_content_type(path);
            
            ostringstream response;
            response << "HTTP/1.1 200 OK\r\n"
                     << "Content-Type: " << content_type << "\r\n"
                     << "Content-Length: " << body.length() << "\r\n"
                     << "Connection: close\r\n\r\n"
                     << body;
            send(clientSocket, response.str().c_str(), response.str().length(), 0);
        } else {
            string body = "404 Not Found";
            ostringstream response;
            response << "HTTP/1.1 404 Not Found\r\n"
                     << "Content-Type: text/plain\r\n"
                     << "Content-Length: " << body.length() << "\r\n"
                     << "Connection: close\r\n\r\n"
                     << body;
            send(clientSocket, response.str().c_str(), response.str().length(), 0);
        }
    }
    closesocket(clientSocket);
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        cerr << "WSAStartup failed." << endl;
        return 1;
    }

    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket == INVALID_SOCKET) {
        cerr << "Socket creation failed." << endl;
        WSACleanup();
        return 1;
    }

    sockaddr_in serverAddress;
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_addr.s_addr = INADDR_ANY;
    serverAddress.sin_port = htons(8080);

    if (bind(serverSocket, (struct sockaddr*)&serverAddress, sizeof(serverAddress)) == SOCKET_ERROR) {
        cerr << "Bind failed on port 8080." << endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    if (listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
        cerr << "Listen failed." << endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    cout << "Server listening on http://localhost:8080" << endl;

    while (true) {
        SOCKET clientSocket = accept(serverSocket, nullptr, nullptr);
        if (clientSocket != INVALID_SOCKET) {
            handle_client(clientSocket);
        }
    }

    closesocket(serverSocket);
    WSACleanup();
    return 0;
}
