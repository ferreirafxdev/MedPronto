@echo off
REM Deploy MedPronto VPS — usa SSH do Git for Windows
SET GIT_SSH="E:\Git\usr\bin\ssh.exe"
SET HOST=143.95.209.122
SET PORT=22022
SET USER=root
SET PASS=Postgresadmin1@

REM Usa sshpass embutido via expect - não disponível. Usar chave ou PowerShell
REM Alternativa: gerar chave e usar -i, mas por ora usaremos o script via stdin

echo [1/3] Conectando na VPS...
echo ls /root > %TEMP%\vps_cmd.txt

%GIT_SSH% -o StrictHostKeyChecking=no -p %PORT% %USER%@%HOST% "ls /root && docker ps"
