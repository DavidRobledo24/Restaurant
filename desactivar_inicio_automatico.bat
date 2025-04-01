@echo off
echo Eliminando acceso directo de inicio automatico...
del "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\IniciarServidor.lnk"
echo Acceso directo eliminado exitosamente
echo.
echo Para detener los servidores actuales, presiona cualquier tecla...
pause
taskkill /F /IM node.exe
taskkill /F /IM python.exe
echo Servidores detenidos
pause 