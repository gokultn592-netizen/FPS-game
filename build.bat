@echo off
echo Building C++ Server...
g++ server.cpp -o server.exe -lws2_32
if %ERRORLEVEL% EQU 0 (
    echo Build Successful. Run server.exe to start the game server.
) else (
    echo Build Failed. Ensure g++ is in your PATH.
)
pause
