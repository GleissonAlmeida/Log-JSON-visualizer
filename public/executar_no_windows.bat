@echo off
chcp 65001 > nul
cls
echo ====================================================================
echo     LOGPLOTTER C (C99) - EXECUTÁVEL PARA WINDOWS 11
echo ====================================================================
echo.
echo Processando o arquivo de log JSON: sample_iot.json ...
echo.

log_plotter.exe sample_iot.json -x timestamp -m temperatura,umidade,pressao_hpa --html grafico_c.html

echo.
echo ====================================================================
echo Execução finalizada!
echo Abrindo o gráfico interativo 'grafico_c.html' no seu navegador...
echo ====================================================================
echo.

start grafico_c.html

pause
