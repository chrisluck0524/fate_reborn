@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Initialize-FateReborn.ps1"
if errorlevel 1 (
  echo.
  echo 初始化未完成。请保留此窗口中的错误信息，并发给 Codex。
  pause
  exit /b 1
)
echo.
echo 初始化完成。现在可以双击“启动宿命.cmd”开始试玩。
pause
