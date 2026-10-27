@echo off
chcp 65001 > nul
cls
echo ====================================================================
echo     LOGPLOTTER C (C99) - EXECUTAVEL PARA WINDOWS 11 (v2.5)
echo     [Suporte a CSV & JSON com Cursor Eixo X e Exportacao PNG]
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
