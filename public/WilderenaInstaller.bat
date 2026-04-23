@echo off
title Wilderena Mod Installer
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://wilderena.com/install.ps1 -UseBasicParsing | iex"
if errorlevel 1 (
    echo.
    echo  [ERROR] Installer failed with errorlevel %errorlevel%.
    echo  If the error scrolled past too fast, re-run and screenshot.
    echo.
)
pause
