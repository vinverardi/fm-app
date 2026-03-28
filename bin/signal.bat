@echo off

setlocal

set "docker_container=signal"
set "docker_image=registry.gitlab.com/packaging/signal-cli/signal-cli-native:latest"
set "port=8080"

docker inspect %docker_container% >nul 2>&1

if %errorlevel% equ 0 (
  echo Starting container...

  docker start %docker_container%
) else (
  echo Creating container...

  docker run ^
    -d ^
    --name %docker_container% ^
    -p 127.0.0.1:%port%:%port% ^
    --restart unless-stopped ^
    --tmpfs /tmp:exec ^
    -v signal:/var/lib/signal-cli ^
    %docker_image% ^
    daemon --http 0.0.0.0:8080
)

endlocal
