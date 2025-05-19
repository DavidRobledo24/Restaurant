@echo off
set SCRIPT_PATH=%~dp0iniciar_servidor.bat
set SCRIPT_DIR=%~dp0

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%%USERPROFILE%%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\IniciarServidor.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_PATH%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> CreateShortcut.vbs
echo oLink.WindowStyle = 1 >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript CreateShortcut.vbs
del CreateShortcut.vbs

echo Acceso directo creado exitosamente en la carpeta de inicio
pause