@echo off
title Wilderena Mod Installer
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://wilderena.com/install.ps1 -UseBasicParsing | iex"
