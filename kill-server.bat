@echo off
echo Cleaning up server processes...
deno run --allow-run --allow-net kill-server.ts
pause
