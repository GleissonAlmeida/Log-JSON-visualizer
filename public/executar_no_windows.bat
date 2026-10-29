@echo off
chcp 65001 > nul
cls
echo ====================================================================
echo     LOGPLOTTER C (C99) - EXECUTAVEL PARA WINDOWS 11 (v2.7)
echo     [100%% OFFLINE - Funciona sem internet | CSV e JSON | Eixos Y, Y1, Y2]
echo ====================================================================
echo.
if exist "sample_can_bus.csv" (
    echo Processando arquivo CSV de telemetria CAN Bus: sample_can_bus.csv ...
    log_plotter.exe sample_can_bus.csv -x # --html grafico_c.html
) else if exist "sample_can_bus.json" (
    echo Processando arquivo de telemetria CAN Bus: sample_can_bus.json ...
    log_plotter.exe sample_can_bus.json -x # --html grafico_c.html
) else (
    echo Processando log de dados: sample_iot.json ...
    log_plotter.exe sample_iot.json --html grafico_c.html
)

echo.
echo ====================================================================
echo Execucao finalizada com sucesso!
echo Abrindo o grafico interativo 'grafico_c.html' no navegador...
echo ====================================================================
echo.

start grafico_c.html

pause
