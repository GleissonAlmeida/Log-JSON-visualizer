/**
 * @file main.c
 * @brief Leitor de logs JSON e plotador interativo em Linguagem C (C99) para Windows 11 / Linux
 * 
 * Gera uma aplicação gráfica interativa completa com o painel de controles e o gráfico Chart.js,
 * exatamente conforme a interface solicitada pelo usuário.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "json_parser.h"

#define MAX_METRICS 32
#define MAX_LABEL_LEN 64

typedef struct {
    char name[MAX_LABEL_LEN];
    double min;
    double max;
    double sum;
    double mean;
    double median;
    double stddev;
    int count;
} MetricStats;

typedef struct {
    char x_label[MAX_LABEL_LEN];
    double values[MAX_METRICS];
} DataPoint;

typedef struct {
    char x_key[MAX_LABEL_LEN];
    char metric_names[MAX_METRICS][MAX_LABEL_LEN];
    int num_metrics;
    DataPoint *points;
    int num_points;
    MetricStats stats[MAX_METRICS];
} Dataset;

/* Carrega arquivo de texto para a memória */
static char* read_entire_file(const char *filename, size_t *out_size) {
    FILE *fp = fopen(filename, "rb");
    if (!fp) {
        fprintf(stderr, "[ERRO] Nao foi possivel abrir o arquivo '%s'\n", filename);
        return NULL;
    }

    fseek(fp, 0, SEEK_END);
    long len = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    if (len < 0) {
        fclose(fp);
        return NULL;
    }

    char *buffer = (char*)malloc(len + 1);
    if (!buffer) {
        fprintf(stderr, "[ERRO] Memoria insuficiente (%ld bytes)\n", len);
        fclose(fp);
        return NULL;
    }

    size_t read_bytes = fread(buffer, 1, len, fp);
    buffer[read_bytes] = '\0';
    fclose(fp);

    if (out_size) *out_size = read_bytes;
    return buffer;
}

/* Compara doubles para qsort */
static int compare_doubles(const void *a, const void *b) {
    double diff = (*(const double*)a - *(const double*)b);
    if (diff < 0) return -1;
    if (diff > 0) return 1;
    return 0;
}

/* Calcula estatísticas para uma métrica */
static void compute_metric_stats(Dataset *ds, int m_idx) {
    MetricStats *st = &ds->stats[m_idx];
    strncpy(st->name, ds->metric_names[m_idx], sizeof(st->name) - 1);
    st->name[sizeof(st->name) - 1] = '\0';
    st->count = ds->num_points;

    if (ds->num_points == 0) return;

    double *sorted = (double*)malloc(ds->num_points * sizeof(double));
    double sum = 0.0;
    double min_val = ds->points[0].values[m_idx];
    double max_val = ds->points[0].values[m_idx];

    for (int i = 0; i < ds->num_points; i++) {
        double val = ds->points[i].values[m_idx];
        sorted[i] = val;
        sum += val;
        if (val < min_val) min_val = val;
        if (val > max_val) max_val = val;
    }

    st->min = min_val;
    st->max = max_val;
    st->sum = sum;
    st->mean = sum / ds->num_points;

    /* Mediana */
    qsort(sorted, ds->num_points, sizeof(double), compare_doubles);
    if (ds->num_points % 2 != 0) {
        st->median = sorted[ds->num_points / 2];
    } else {
        int mid = ds->num_points / 2;
        st->median = (sorted[mid - 1] + sorted[mid]) / 2.0;
    }

    /* Desvio Padrão */
    double var_sum = 0.0;
    for (int i = 0; i < ds->num_points; i++) {
        double diff = ds->points[i].values[m_idx] - st->mean;
        var_sum += diff * diff;
    }
    st->stddev = sqrt(var_sum / ds->num_points);

    free(sorted);
}

/* Gera o arquivo HTML interativo completo com painel lateral e gráfico Chart.js */
static int export_interactive_html(const Dataset *ds, const char *output_file) {
    FILE *fp = fopen(output_file, "w");
    if (!fp) {
        fprintf(stderr, "[ERRO] Nao foi possivel criar o arquivo HTML '%s'\n", output_file);
        return 0;
    }

    fprintf(fp, "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n");
    fprintf(fp, "  <meta charset=\"UTF-8\" />\n");
    fprintf(fp, "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n");
    fprintf(fp, "  <title>LogPlotter C &bull; Gráfico Interativo</title>\n");
    fprintf(fp, "  <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n");
    fprintf(fp, "  <link href=\"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">\n");
    fprintf(fp, "  <style>\n");
    fprintf(fp, "    * { box-sizing: border-box; margin: 0; padding: 0; }\n");
    fprintf(fp, "    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 20px; min-height: 100vh; display: flex; flex-direction: column; }\n");
    fprintf(fp, "    .app-container { display: grid; grid-template-columns: 340px 1fr; gap: 20px; max-width: 1540px; margin: 0 auto; width: 100%%; flex: 1; }\n");
    fprintf(fp, "    @media (max-width: 1024px) { .app-container { grid-template-columns: 1fr; } }\n");
    fprintf(fp, "    .panel { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 16px; }\n");
    fprintf(fp, "    .chart-panel { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }\n");
    fprintf(fp, "    .title-sec { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }\n");
    fprintf(fp, "    .subtext { font-size: 11px; color: #64748b; margin-top: 4px; }\n");
    fprintf(fp, "    select, input[type='text'] { width: 100%%; background: #070d19; border: 1px solid #334155; color: #e2e8f0; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-family: 'JetBrains Mono', monospace; outline: none; }\n");
    fprintf(fp, "    .btn-group { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background: #070d19; padding: 4px; border-radius: 8px; border: 1px solid #1e293b; }\n");
    fprintf(fp, "    .btn-type { background: transparent; border: none; color: #94a3b8; font-size: 11px; font-weight: 600; padding: 6px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }\n");
    fprintf(fp, "    .btn-type.active { background: #4f46e5; color: #fff; }\n");
    fprintf(fp, "    .toggles-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }\n");
    fprintf(fp, "    .toggle-label { background: #070d19; border: 1px solid #1e293b; padding: 8px 10px; border-radius: 8px; font-size: 11px; display: flex; items-center: center; gap: 6px; color: #cbd5e1; cursor: pointer; }\n");
    fprintf(fp, "    .slider-box { margin-top: 8px; background: #070d19; border: 1px solid #1e293b; padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #94a3b8; }\n");
    fprintf(fp, "    .metric-list { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px; }\n");
    fprintf(fp, "    .metric-item { display: flex; align-items: center; justify-content: space-between; background: #070d19; border: 1px solid #1e293b; border-radius: 8px; padding: 8px 10px; transition: border-color 0.15s; }\n");
    fprintf(fp, "    .metric-item.selected { border-color: #334155; background: #131d31; }\n");
    fprintf(fp, "    .dot { width: 10px; height: 10px; border-radius: 50%%; display: inline-block; }\n");
    fprintf(fp, "    .chart-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #1e293b; gap: 10px; }\n");
    fprintf(fp, "    .chart-container { position: relative; flex: 1; min-height: 460px; padding: 16px; }\n");
    fprintf(fp, "    .chart-bottom { padding: 12px 18px; border-top: 1px solid #1e293b; background: #0b1120; font-size: 12px; color: #94a3b8; }\n");
    fprintf(fp, "    .range-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; align-items: center; }\n");
    fprintf(fp, "    .range-item { display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; }\n");
    fprintf(fp, "    .btn-tool { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; font-size: 11px; font-weight: 500; padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }\n");
    fprintf(fp, "    .btn-tool:hover { background: #334155; color: #fff; }\n");
    fprintf(fp, "    .axis-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid #334155; background: #070d19; cursor: pointer; color: #ffffff; }\n");
    fprintf(fp, "    .axis-badge.right { color: #38bdf8; border-color: #0369a1; background: #082f49; }\n");
    fprintf(fp, "    .btn-sort { background: #070d19; border: 1px solid #1e293b; color: #94a3b8; font-size: 11px; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: 'JetBrains Mono'; white-space: nowrap; transition: all 0.15s; }\n");
    fprintf(fp, "    .btn-sort.active { background: #1e1b4b; border-color: #4338ca; color: #a5b4fc; }\n");
    fprintf(fp, "    .section-divider { font-size: 10px; color: #64748b; font-family: 'JetBrains Mono'; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 4px 2px 4px; border-top: 1px solid #1e293b; margin-top: 6px; display: flex; align-items: center; justify-content: space-between; }\n");
    fprintf(fp, "    .badge-zoh { font-size: 9px; background: #1e1b4b; color: #a5b4fc; padding: 1px 5px; border-radius: 4px; border: 1px solid #4338ca; font-family: 'JetBrains Mono'; }\n");
    fprintf(fp, "  </style>\n</head>\n<body>\n");

    fprintf(fp, "  <div class=\"app-container\">\n");

    /* ================= PAINEL LATERAL ESQUERDO ================= */
    fprintf(fp, "    <div class=\"panel\">\n");

    /* 0. Carregar Arquivo JSON ou CSV */
    fprintf(fp, "      <div style=\"background: #070d19; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;\">\n");
    fprintf(fp, "        <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;\">\n");
    fprintf(fp, "          <span class=\"title-sec\" style=\"margin-bottom: 0;\">ARQUIVO DE LOG (JSON / CSV)</span>\n");
    fprintf(fp, "          <span id=\"lblFileRecords\" style=\"font-size: 10px; color: #818cf8; font-family: 'JetBrains Mono';\">%d registros</span>\n", ds->num_points);
    fprintf(fp, "        </div>\n");
    fprintf(fp, "        <label style=\"display: flex; align-items: center; justify-content: center; gap: 8px; background: #4f46e5; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center; transition: background 0.15s;\">\n");
    fprintf(fp, "          <span>&#128194; Carregar Novo Log (JSON / CSV)</span>\n");
    fprintf(fp, "          <input type=\"file\" id=\"fileJsonUpload\" accept=\".json,.log,.txt,.csv\" style=\"display: none;\" onchange=\"loadNewJsonFile(event)\">\n");
    fprintf(fp, "        </label>\n");
    fprintf(fp, "      </div>\n");

    fprintf(fp, "      <hr style=\"border: 0; border-top: 1px solid #1e293b; margin: 2px 0;\" />\n");

    /* 1. Eixo X */
    fprintf(fp, "      <div>\n");
    fprintf(fp, "        <div class=\"title-sec\">1. EIXO X (REFERÊNCIA HORIZONTAL)</div>\n");
    fprintf(fp, "        <select id=\"selectX\" onchange=\"updateChart()\">\n");
    fprintf(fp, "          <option value=\"%s\" selected>%s (Temporal)</option>\n", ds->x_key, ds->x_key);
    fprintf(fp, "          <option value=\"_index\"># Índice Sequencial</option>\n");
    fprintf(fp, "        </select>\n");
    fprintf(fp, "        <div class=\"subtext\">Determina os rótulos do eixo horizontal do gráfico.</div>\n");
    fprintf(fp, "      </div>\n");

    fprintf(fp, "      <hr style=\"border: 0; border-top: 1px solid #1e293b; margin: 2px 0;\" />\n");

    /* 2. Tipo e Estilo do Gráfico */
    fprintf(fp, "      <div>\n");
    fprintf(fp, "        <div class=\"title-sec\">2. TIPO E ESTILO DO GRÁFICO</div>\n");
    fprintf(fp, "        <div class=\"btn-group\">\n");
    fprintf(fp, "          <button class=\"btn-type active\" id=\"btnLine\" onclick=\"setChartType('line')\">Linha</button>\n");
    fprintf(fp, "          <button class=\"btn-type\" id=\"btnArea\" onclick=\"setChartType('area')\">Área</button>\n");
    fprintf(fp, "          <button class=\"btn-type\" id=\"btnBar\" onclick=\"setChartType('bar')\">Barras</button>\n");
    fprintf(fp, "          <button class=\"btn-type\" id=\"btnStepped\" onclick=\"setChartType('stepped')\">Degraus</button>\n");
    fprintf(fp, "        </div>\n");

    fprintf(fp, "        <div class=\"toggles-row\">\n");
    fprintf(fp, "          <label class=\"toggle-label\">\n");
    fprintf(fp, "            <input type=\"checkbox\" id=\"chkPoints\" checked onchange=\"updateChart()\"> Pontos no gráfico\n");
    fprintf(fp, "          </label>\n");
    fprintf(fp, "          <label class=\"toggle-label\">\n");
    fprintf(fp, "            <input type=\"checkbox\" id=\"chkDualAxis\" checked onchange=\"updateChart()\"> Eixo Y duplo (L / R)\n");
    fprintf(fp, "          </label>\n");
    fprintf(fp, "          <label class=\"toggle-label\" style=\"grid-column: span 2; display: flex; align-items: center; justify-content: space-between;\" title=\"Zero-Order Hold: Mantém o último valor transmitido para sinais esparsos de CAN bus ou sensores assíncronos\">\n");
    fprintf(fp, "            <span style=\"display: flex; align-items: center; gap: 6px;\"><input type=\"checkbox\" id=\"chkHold\" checked onchange=\"updateChart()\"> Hold de Telemetria (CAN)</span>\n");
    fprintf(fp, "            <span class=\"badge-zoh\">Sample &amp; Hold</span>\n");
    fprintf(fp, "          </label>\n");
    fprintf(fp, "          <label class=\"toggle-label\" style=\"grid-column: span 2; display: flex; align-items: center; justify-content: space-between;\" title=\"Exibe cursor vertical no eixo X com painel de inspeção de amostras\">\n");
    fprintf(fp, "            <span style=\"display: flex; align-items: center; gap: 6px;\"><input type=\"checkbox\" id=\"chkCursor\" checked onchange=\"toggleCursor()\"> Cursor Eixo X (Amostras)</span>\n");
    fprintf(fp, "            <span class=\"badge-zoh\" style=\"background: #1e1b4b; color: #a5b4fc; border-color: #4338ca;\">Inspeção</span>\n");
    fprintf(fp, "          </label>\n");
    fprintf(fp, "        </div>\n");

    fprintf(fp, "        <div style=\"margin-top: 10px; padding-top: 10px; border-top: 1px solid #1e293b; display: flex; flex-direction: column; gap: 8px;\">\n");
    fprintf(fp, "          <div style=\"display: flex; justify-content: space-between; align-items: center;\">\n");
    fprintf(fp, "            <span style=\"font-size: 11px; font-weight: 600; color: #cbd5e1;\">Escala do Eixo Y</span>\n");
    fprintf(fp, "            <div style=\"display: flex; gap: 2px; background: #070d19; padding: 2px; border-radius: 6px; border: 1px solid #1e293b;\">\n");
    fprintf(fp, "              <button id=\"btnScaleAuto\" class=\"btn-type active\" onclick=\"setScaleMode('auto')\" style=\"padding: 3px 8px; font-size: 10px;\">Auto</button>\n");
    fprintf(fp, "              <button id=\"btnScaleManual\" class=\"btn-type\" onclick=\"setScaleMode('manual')\" style=\"padding: 3px 8px; font-size: 10px;\">Manual</button>\n");
    fprintf(fp, "            </div>\n");
    fprintf(fp, "          </div>\n");
    fprintf(fp, "          <div class=\"toggles-row\" style=\"margin-top: 0;\">\n");
    fprintf(fp, "            <label class=\"toggle-label\"><input type=\"checkbox\" id=\"chkZero\" onchange=\"updateChart()\"> Iniciar em 0</label>\n");
    fprintf(fp, "            <label class=\"toggle-label\"><input type=\"checkbox\" id=\"chkLog\" onchange=\"updateChart()\"> Escala Log</label>\n");
    fprintf(fp, "          </div>\n");
    fprintf(fp, "          <div id=\"boxManualScale\" style=\"display: none; background: #070d19; border: 1px solid #1e293b; border-radius: 6px; padding: 8px; flex-direction: column; gap: 6px;\">\n");
    fprintf(fp, "            <div style=\"font-size: 10px; color: #94a3b8; font-weight: 600;\">Limites Eixo Y (Esquerdo):</div>\n");
    fprintf(fp, "            <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 6px;\">\n");
    fprintf(fp, "              <input type=\"number\" id=\"inpMinY\" placeholder=\"Mín Y\" oninput=\"updateChart()\" style=\"font-size: 11px; padding: 4px 6px;\">\n");
    fprintf(fp, "              <input type=\"number\" id=\"inpMaxY\" placeholder=\"Máx Y\" oninput=\"updateChart()\" style=\"font-size: 11px; padding: 4px 6px;\">\n");
    fprintf(fp, "            </div>\n");
    fprintf(fp, "            <div id=\"boxY1Limits\" style=\"margin-top: 4px; padding-top: 4px; border-top: 1px solid #1e293b;\">\n");
    fprintf(fp, "              <div style=\"font-size: 10px; color: #38bdf8; font-weight: 600; margin-bottom: 4px;\">Limites Eixo Y1 (Direito):</div>\n");
    fprintf(fp, "              <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 6px;\">\n");
    fprintf(fp, "                <input type=\"number\" id=\"inpMinY1\" placeholder=\"Mín Y1\" oninput=\"updateChart()\" style=\"font-size: 11px; padding: 4px 6px; color: #38bdf8;\">\n");
    fprintf(fp, "                <input type=\"number\" id=\"inpMaxY1\" placeholder=\"Máx Y1\" oninput=\"updateChart()\" style=\"font-size: 11px; padding: 4px 6px; color: #38bdf8;\">\n");
    fprintf(fp, "              </div>\n");
    fprintf(fp, "            </div>\n");
    fprintf(fp, "          </div>\n");
    fprintf(fp, "        </div>\n");
    fprintf(fp, "      </div>\n");
    fprintf(fp, "      <hr style=\"border: 0; border-top: 1px solid #1e293b; margin: 2px 0;\" />\n");

    /* 3. Variáveis Selecionadas */
    fprintf(fp, "      <div style=\"flex: 1; display: flex; flex-direction: column;\">\n");
    fprintf(fp, "        <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;\">\n");
    fprintf(fp, "          <div class=\"title-sec\" style=\"margin-bottom: 0;\">3. VARIÁVEIS SELECIONADAS (<span id=\"cntSelected\">0</span>/%d)</div>\n", ds->num_metrics);
    fprintf(fp, "          <div style=\"font-size: 11px;\"><a href=\"#\" onclick=\"selectAllMetrics(); return false;\" style=\"color: #6366f1; text-decoration: none;\">Todas</a> &bull; <a href=\"#\" onclick=\"clearMetrics(); return false;\" style=\"color: #64748b; text-decoration: none;\">Limpar</a></div>\n");
    fprintf(fp, "        </div>\n");

    fprintf(fp, "        <div style=\"display: flex; gap: 6px; margin-bottom: 8px;\">\n");
    fprintf(fp, "          <input type=\"text\" id=\"txtFilter\" placeholder=\"Filtrar variáveis...\" oninput=\"filterMetricsList()\" style=\"flex: 1; font-size: 11px; padding: 6px 10px;\">\n");
    fprintf(fp, "          <button id=\"btnSortMode\" class=\"btn-sort active\" onclick=\"toggleSortMode()\" title=\"Alternar: Selecionados no topo ou A-Z geral\">&#8645; Selecionados 1º</button>\n");
    fprintf(fp, "        </div>\n");

    fprintf(fp, "        <div class=\"metric-list\" id=\"metricList\">\n");

    const char *palette[] = { "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444" };
    int num_palette = sizeof(palette) / sizeof(palette[0]);

    for (int m = 0; m < ds->num_metrics; m++) {
        const MetricStats *st = &ds->stats[m];
        const char *col = palette[m % num_palette];
        int is_checked = (m < 3); /* seleciona as 3 primeiras por padrão */
        int is_right_axis = (m == 1); /* segundo campo vai para eixo direito se habilitado */

        fprintf(fp, "          <div class=\"metric-item %s\" id=\"item_%s\" data-key=\"%s\">\n", is_checked ? "selected" : "", st->name, st->name);
        fprintf(fp, "            <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;\">\n");
        fprintf(fp, "              <input type=\"checkbox\" id=\"chk_%s\" %s onchange=\"toggleMetric('%s')\" style=\"accent-color: #4f46e5;\">\n", st->name, is_checked ? "checked" : "", st->name);
        fprintf(fp, "              <span class=\"dot\" style=\"background-color: %s;\"></span>\n", col);
        fprintf(fp, "              <div>\n");
        fprintf(fp, "                <div style=\"font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono';\">%s</div>\n", st->name);
        fprintf(fp, "                <div style=\"font-size: 10px; color: #64748b; font-family: 'JetBrains Mono';\">mín: %.1f &bull; máx: %.1f &bull; méd: %.1f</div>\n", st->min, st->max, st->mean);
        fprintf(fp, "              </div>\n");
        fprintf(fp, "            </label>\n");
        fprintf(fp, "            <button class=\"axis-badge %s\" id=\"axis_%s\" onclick=\"toggleAxis('%s')\">%s</button>\n",
                is_right_axis ? "right" : "", st->name, st->name, is_right_axis ? "Eixo Dir (Y1)" : "Eixo Esq (Y)");
        fprintf(fp, "          </div>\n");
    }

    fprintf(fp, "        </div>\n");
    fprintf(fp, "      </div>\n");
    fprintf(fp, "    </div>\n");

    /* ================= PAINEL DO GRÁFICO (DIREITO) ================= */
    fprintf(fp, "    <div class=\"chart-panel\" id=\"chartBox\">\n");

    /* Topo do Gráfico */
    fprintf(fp, "      <div class=\"chart-top\">\n");
    fprintf(fp, "        <div>\n");
    fprintf(fp, "          <div style=\"font-size: 12px; font-weight: 700; color: #94a3b8;\">EIXO X: <span style=\"color: #818cf8; font-family: 'JetBrains Mono';\" id=\"dispXKey\">%s</span></div>\n", ds->x_key);
    fprintf(fp, "          <div style=\"font-size: 11px; color: #64748b; font-family: 'JetBrains Mono';\" id=\"dispInfo\">Mostrando %d de %d registros (Ptos 1-%d)</div>\n", ds->num_points, ds->num_points, ds->num_points);
    fprintf(fp, "        </div>\n");

    fprintf(fp, "        <div style=\"display: flex; align-items: center; gap: 6px;\">\n");
    fprintf(fp, "          <div style=\"display: flex; gap: 2px; background: #070d19; padding: 2px; border-radius: 6px; border: 1px solid #1e293b;\">\n");
    fprintf(fp, "            <button class=\"btn-tool\" onclick=\"setPreset(1.0)\">100%%</button>\n");
    fprintf(fp, "            <button class=\"btn-tool\" onclick=\"setPreset(0.5)\">50%%</button>\n");
    fprintf(fp, "            <button class=\"btn-tool\" onclick=\"setPreset(0.25)\">25%%</button>\n");
    fprintf(fp, "            <button class=\"btn-tool\" onclick=\"setLastN(30)\">Últimos 30</button>\n");
    fprintf(fp, "          </div>\n");
    fprintf(fp, "          <button class=\"btn-tool active\" id=\"btnCursor\" onclick=\"toggleCursor()\" title=\"Ativar/desativar cursor vertical do eixo X\">&#9678; Cursor Eixo X</button>\n");
    fprintf(fp, "          <button class=\"btn-tool\" onclick=\"downloadPNG()\">&#128229; Salvar PNG</button>\n");
    fprintf(fp, "          <button class=\"btn-tool\" onclick=\"toggleFS()\">&#x26F6;</button>\n");
    fprintf(fp, "        </div>\n");
    fprintf(fp, "      </div>\n");
    fprintf(fp, "      <!-- HUD de Inspecao das Amostras -->\n");
    fprintf(fp, "      <div id=\"cursorHud\" style=\"display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 8px 18px; background: #070d19; border-bottom: 1px solid #1e293b; gap: 8px; font-size: 11px;\">\n");
    fprintf(fp, "        <div style=\"display: flex; align-items: center; gap: 8px; flex-wrap: wrap;\">\n");
    fprintf(fp, "          <div style=\"display: flex; align-items: center; gap: 6px; background: #1e1b4b; border: 1px solid #4338ca; padding: 3px 8px; border-radius: 6px; color: #a5b4fc; font-family: 'JetBrains Mono';\">\n");
    fprintf(fp, "            <span>&#9678; Amostra:</span><strong id=\"hudSampleLabel\" style=\"color: #fff;\">#1</strong>\n");
    fprintf(fp, "            <span id=\"hudSampleIdx\" style=\"color: #818cf8; font-size: 10px;\">(1/%d)</span>\n", ds->num_points);
    fprintf(fp, "          </div>\n");
    fprintf(fp, "          <div style=\"display: flex; gap: 2px; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 2px;\">\n");
    fprintf(fp, "            <button class=\"btn-tool\" style=\"padding: 2px 6px;\" onclick=\"stepCursor(-1)\">&#9664;</button>\n");
    fprintf(fp, "            <button class=\"btn-tool\" style=\"padding: 2px 6px;\" onclick=\"stepCursor(1)\">&#9654;</button>\n");
    fprintf(fp, "          </div>\n");
    fprintf(fp, "          <button id=\"btnPinCursor\" class=\"btn-tool\" style=\"font-size: 10px; padding: 3px 8px; font-family: 'JetBrains Mono';\" onclick=\"togglePinCursor()\">&#128204; Fixar Cursor</button>\n");
    fprintf(fp, "        </div>\n");
    fprintf(fp, "        <div id=\"hudMetricsContainer\" style=\"display: flex; align-items: center; gap: 6px; flex-wrap: wrap;\"></div>\n");
    fprintf(fp, "      </div>\n");

    /* Canvas */
    fprintf(fp, "      <div class=\"chart-container\">\n");
    fprintf(fp, "        <canvas id=\"mainCanvas\"></canvas>\n");
    fprintf(fp, "      </div>\n");

    /* Barra de Faixa Temporal */
    fprintf(fp, "      <div class=\"chart-bottom\">\n");
    fprintf(fp, "        <div style=\"display: flex; justify-content: space-between; align-items: center;\">\n");
    fprintf(fp, "          <div>Filtro de Faixa Temporal: <span id=\"lblRange\" style=\"color: #818cf8; font-family: 'JetBrains Mono';\">Ponto 1 até %d (Total: %d pontos)</span></div>\n", ds->num_points, ds->num_points);
    fprintf(fp, "          <button class=\"btn-tool\" onclick=\"resetRange()\">&#8635; Redefinir</button>\n");
    fprintf(fp, "        </div>\n");
    fprintf(fp, "        <div class=\"range-inputs\">\n");
    fprintf(fp, "          <div class=\"range-item\"><span>Início:</span><input type=\"range\" id=\"rngStart\" min=\"0\" max=\"%d\" value=\"0\" oninput=\"onRangeChange()\" style=\"flex: 1; accent-color: #4f46e5;\"><span id=\"txtStart\">1</span></div>\n", ds->num_points - 1);
    fprintf(fp, "          <div class=\"range-item\"><span>Fim:</span><input type=\"range\" id=\"rngEnd\" min=\"0\" max=\"%d\" value=\"%d\" oninput=\"onRangeChange()\" style=\"flex: 1; accent-color: #4f46e5;\"><span id=\"txtEnd\">%d</span></div>\n", ds->num_points - 1, ds->num_points - 1, ds->num_points);
    fprintf(fp, "        </div>\n");
    fprintf(fp, "      </div>\n");

    fprintf(fp, "    </div>\n");
    fprintf(fp, "  </div>\n");

    /* ================= JAVASCRIPT DO CHART.JS E ESTADOS ================= */
    fprintf(fp, "  <script>\n");
    fprintf(fp, "    const rawData = [\n");
    for (int i = 0; i < ds->num_points; i++) {
        fprintf(fp, "      { _idx: %d, x: \"%s\"", i + 1, ds->points[i].x_label);
        for (int m = 0; m < ds->num_metrics; m++) {
            fprintf(fp, ", \"%s\": %.4f", ds->metric_names[m], ds->points[i].values[m]);
        }
        fprintf(fp, " }%s\n", (i < ds->num_points - 1) ? "," : "");
    }
    fprintf(fp, "    ];\n\n");

    fprintf(fp, "    const metricMeta = {\n");
    for (int m = 0; m < ds->num_metrics; m++) {
        fprintf(fp, "      \"%s\": { color: \"%s\", yAxis: \"%s\", checked: %s },\n",
                ds->metric_names[m], palette[m % num_palette],
                (m == 1) ? "y1" : "y",
                (m < 3) ? "true" : "false");
    }
    fprintf(fp, "    };\n\n");

    fprintf(fp, "    let chartType = 'line';\n");
    fprintf(fp, "    let tension = 0.25;\n");
    fprintf(fp, "    let chartInstance = null;\n");
    fprintf(fp, "    let rangeStart = 0;\n");
    fprintf(fp, "    let rangeEnd = rawData.length - 1;\n");
    fprintf(fp, "    let scaleMode = 'auto';\n");
    fprintf(fp, "    let cursorEnabled = true;\n");
    fprintf(fp, "    let cursorIdx = null;\n");
    fprintf(fp, "    let isPinned = false;\n\n");

    fprintf(fp, "    const legendSpacingPlugin = {\n");
    fprintf(fp, "      id: 'legendSpacingPlugin',\n");
    fprintf(fp, "      beforeInit(chart) {\n");
    fprintf(fp, "        if (!chart.legend) return;\n");
    fprintf(fp, "        const origFit = chart.legend.fit;\n");
    fprintf(fp, "        chart.legend.fit = function() {\n");
    fprintf(fp, "          origFit.bind(chart.legend)();\n");
    fprintf(fp, "          this.height += 36;\n");
    fprintf(fp, "        };\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "    };\n\n");

    fprintf(fp, "    const verticalCursorPlugin = {\n");
    fprintf(fp, "      id: 'verticalCursorPlugin',\n");
    fprintf(fp, "      afterDatasetsDraw(chart) {\n");
    fprintf(fp, "        if (!cursorEnabled) return;\n");
    fprintf(fp, "        const filtered = rawData.slice(rangeStart, rangeEnd + 1);\n");
    fprintf(fp, "        if (!filtered.length) return;\n");
    fprintf(fp, "        if (cursorIdx === null || cursorIdx >= filtered.length) cursorIdx = Math.floor(filtered.length / 2);\n");
    fprintf(fp, "        const meta = chart.getDatasetMeta(0);\n");
    fprintf(fp, "        if (!meta || !meta.data || !meta.data[cursorIdx]) return;\n");
    fprintf(fp, "        const pt = meta.data[cursorIdx];\n");
    fprintf(fp, "        const x = pt.x;\n");
    fprintf(fp, "        const { top, bottom } = chart.chartArea;\n");
    fprintf(fp, "        const ctx = chart.ctx;\n");
    fprintf(fp, "        ctx.save();\n");
    fprintf(fp, "        ctx.beginPath();\n");
    fprintf(fp, "        ctx.setLineDash([4, 3]);\n");
    fprintf(fp, "        ctx.lineWidth = isPinned ? 2.5 : 2;\n");
    fprintf(fp, "        ctx.strokeStyle = isPinned ? '#f59e0b' : '#818cf8';\n");
    fprintf(fp, "        ctx.moveTo(x, top - 6);\n");
    fprintf(fp, "        ctx.lineTo(x, bottom);\n");
    fprintf(fp, "        ctx.stroke();\n");
    fprintf(fp, "        const xKey = document.getElementById('selectX').value;\n");
    fprintf(fp, "        const xLabel = xKey === '_index' ? `#${filtered[cursorIdx]._idx}` : filtered[cursorIdx].x;\n");
    fprintf(fp, "        const badgeText = isPinned ? `${xLabel} (fixo)` : xLabel;\n");
    fprintf(fp, "        ctx.font = 'bold 11px \"JetBrains Mono\", monospace';\n");
    fprintf(fp, "        const tw = ctx.measureText(badgeText).width;\n");
    fprintf(fp, "        const bw = tw + 14;\n");
    fprintf(fp, "        ctx.fillStyle = isPinned ? '#b45309' : '#4f46e5';\n");
    fprintf(fp, "        ctx.fillRect(x - bw / 2, top - 25, bw, 20);\n");
    fprintf(fp, "        ctx.strokeStyle = isPinned ? '#f59e0b' : '#818cf8';\n");
    fprintf(fp, "        ctx.lineWidth = 1;\n");
    fprintf(fp, "        ctx.strokeRect(x - bw / 2, top - 25, bw, 20);\n");
    fprintf(fp, "        ctx.fillStyle = '#ffffff';\n");
    fprintf(fp, "        ctx.textAlign = 'center';\n");
    fprintf(fp, "        ctx.textBaseline = 'middle';\n");
    fprintf(fp, "        ctx.fillText(badgeText, x, top - 15);\n");
    fprintf(fp, "        chart.data.datasets.forEach((ds, dsIdx) => {\n");
    fprintf(fp, "          const dsMeta = chart.getDatasetMeta(dsIdx);\n");
    fprintf(fp, "          if (dsMeta && dsMeta.data && dsMeta.data[cursorIdx]) {\n");
    fprintf(fp, "            const p = dsMeta.data[cursorIdx];\n");
    fprintf(fp, "            if (p && typeof p.y === 'number' && !isNaN(p.y)) {\n");
    fprintf(fp, "              ctx.beginPath();\n");
    fprintf(fp, "              ctx.arc(x, p.y, isPinned ? 5.5 : 4.5, 0, Math.PI * 2);\n");
    fprintf(fp, "              ctx.fillStyle = ds.borderColor || '#ffffff';\n");
    fprintf(fp, "              ctx.fill();\n");
    fprintf(fp, "              ctx.lineWidth = 2;\n");
    fprintf(fp, "              ctx.strokeStyle = '#0f172a';\n");
    fprintf(fp, "              ctx.stroke();\n");
    fprintf(fp, "            }\n");
    fprintf(fp, "          }\n");
    fprintf(fp, "        });\n");
    fprintf(fp, "        ctx.restore();\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "    };\n\n");

    fprintf(fp, "    function updateChart() {\n");
    fprintf(fp, "      const xKey = document.getElementById('selectX').value;\n");
    fprintf(fp, "      const showPoints = document.getElementById('chkPoints').checked;\n");
    fprintf(fp, "      const isDualAxis = document.getElementById('chkDualAxis').checked;\n");
    fprintf(fp, "      const isManual = (scaleMode === 'manual');\n");
    fprintf(fp, "      const beginZero = document.getElementById('chkZero').checked;\n");
    fprintf(fp, "      const isLog = document.getElementById('chkLog').checked;\n");
    fprintf(fp, "      const scaleType = isLog ? 'logarithmic' : 'linear';\n");
    fprintf(fp, "      const minYVal = isManual && document.getElementById('inpMinY').value !== '' ? parseFloat(document.getElementById('inpMinY').value) : undefined;\n");
    fprintf(fp, "      const maxYVal = isManual && document.getElementById('inpMaxY').value !== '' ? parseFloat(document.getElementById('inpMaxY').value) : undefined;\n");
    fprintf(fp, "      const minY1Val = isManual && document.getElementById('inpMinY1').value !== '' ? parseFloat(document.getElementById('inpMinY1').value) : undefined;\n");
    fprintf(fp, "      const maxY1Val = isManual && document.getElementById('inpMaxY1').value !== '' ? parseFloat(document.getElementById('inpMaxY1').value) : undefined;\n");
    fprintf(fp, "      document.getElementById('dispXKey').innerText = xKey === '_index' ? 'Índice sequencial' : xKey;\n\n");

    fprintf(fp, "      const filtered = rawData.slice(rangeStart, rangeEnd + 1);\n");
    fprintf(fp, "      document.getElementById('dispInfo').innerText = `Mostrando ${filtered.length} de ${rawData.length} registros (Ptos ${rangeStart + 1}-${rangeEnd + 1})`;\n");
    fprintf(fp, "      document.getElementById('lblRange').innerText = `Ponto ${rangeStart + 1} até ${rangeEnd + 1} (Total: ${filtered.length} pontos)`;\n\n");

    fprintf(fp, "      const labels = filtered.map(r => xKey === '_index' ? `#${r._idx}` : r.x);\n");
    fprintf(fp, "      let selectedCount = 0;\n");
    fprintf(fp, "      let hasRightAxis = false;\n\n");

    fprintf(fp, "      const datasets = [];\n");
    fprintf(fp, "      for (const [key, cfg] of Object.entries(metricMeta)) {\n");
    fprintf(fp, "        const chk = document.getElementById('chk_' + key);\n");
    fprintf(fp, "        if (chk && chk.checked) {\n");
    fprintf(fp, "          selectedCount++;\n");
    fprintf(fp, "          const axis = isDualAxis ? cfg.yAxis : 'y';\n");
    fprintf(fp, "          if (axis === 'y1') hasRightAxis = true;\n");
    fprintf(fp, "          const isStepped = (chartType === 'stepped');\n");
    fprintf(fp, "          const isArea = (chartType === 'area');\n");
    fprintf(fp, "          const isHold = document.getElementById('chkHold') ? document.getElementById('chkHold').checked : true;\n");
    fprintf(fp, "          let lastVal = null;\n");
    fprintf(fp, "          const firstValid = filtered.find(r => r[key] !== undefined && r[key] !== null && !isNaN(Number(r[key])));\n");
    fprintf(fp, "          if (firstValid) lastVal = Number(firstValid[key]);\n");
    fprintf(fp, "          const seriesData = filtered.map(r => {\n");
    fprintf(fp, "            const v = r[key];\n");
    fprintf(fp, "            if (v !== undefined && v !== null && !isNaN(Number(v))) {\n");
    fprintf(fp, "              lastVal = Number(v);\n");
    fprintf(fp, "              return lastVal;\n");
    fprintf(fp, "            }\n");
    fprintf(fp, "            return isHold ? lastVal : null;\n");
    fprintf(fp, "          });\n");
    fprintf(fp, "          datasets.push({\n");
    fprintf(fp, "            label: key,\n");
    fprintf(fp, "            data: seriesData,\n");
    fprintf(fp, "            borderColor: cfg.color,\n");
    fprintf(fp, "            backgroundColor: (isArea ? cfg.color + '33' : (chartType === 'bar' ? cfg.color + '99' : cfg.color)),\n");
    fprintf(fp, "            borderWidth: 2.2,\n");
    fprintf(fp, "            tension: isStepped ? 0 : tension,\n");
    fprintf(fp, "            stepped: isStepped ? 'before' : false,\n");
    fprintf(fp, "            pointRadius: showPoints ? 3.5 : 0,\n");
    fprintf(fp, "            pointHoverRadius: 6,\n");
    fprintf(fp, "            pointBorderColor: '#ffffff',\n");
    fprintf(fp, "            pointBorderWidth: 1.5,\n");
    fprintf(fp, "            fill: isArea,\n");
    fprintf(fp, "            spanGaps: true,\n");
    fprintf(fp, "            yAxisID: axis\n");
    fprintf(fp, "          });\n");
    fprintf(fp, "        }\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      document.getElementById('cntSelected').innerText = selectedCount;\n\n");

    fprintf(fp, "      const ctx = document.getElementById('mainCanvas').getContext('2d');\n");
    fprintf(fp, "      if (chartInstance) chartInstance.destroy();\n");
    fprintf(fp, "      chartInstance = new Chart(ctx, {\n");
    fprintf(fp, "        type: chartType === 'bar' ? 'bar' : 'line',\n");
    fprintf(fp, "        data: { labels, datasets },\n");
    fprintf(fp, "        plugins: [verticalCursorPlugin, legendSpacingPlugin],\n");
    fprintf(fp, "        options: {\n");
    fprintf(fp, "          responsive: true,\n");
    fprintf(fp, "          maintainAspectRatio: false,\n");
    fprintf(fp, "          onHover: (evt, active) => {\n");
    fprintf(fp, "            if (!cursorEnabled || isPinned) return;\n");
    fprintf(fp, "            if (active && active.length > 0) {\n");
    fprintf(fp, "              cursorIdx = active[0].index;\n");
    fprintf(fp, "              updateCursorHud();\n");
    fprintf(fp, "              chartInstance.draw();\n");
    fprintf(fp, "            }\n");
    fprintf(fp, "          },\n");
    fprintf(fp, "          onClick: (evt, active) => {\n");
    fprintf(fp, "            if (!cursorEnabled) return;\n");
    fprintf(fp, "            if (active && active.length > 0) {\n");
    fprintf(fp, "              cursorIdx = active[0].index;\n");
    fprintf(fp, "              togglePinCursor();\n");
    fprintf(fp, "            }\n");
    fprintf(fp, "          },\n");
    fprintf(fp, "          plugins: {\n");
    fprintf(fp, "            legend: { position: 'top', align: 'end', labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 }, usePointStyle: true, boxWidth: 10 } }\n");
    fprintf(fp, "          },\n");
    fprintf(fp, "          scales: {\n");
    fprintf(fp, "            x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 }, maxTicksLimit: 14 } },\n");
    fprintf(fp, "            y: { type: scaleType, beginAtZero: beginZero, min: minYVal, max: maxYVal, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } } },\n");
    fprintf(fp, "            ...(hasRightAxis ? { y1: { type: scaleType, position: 'right', beginAtZero: beginZero, min: minY1Val, max: maxY1Val, grid: { drawOnChartArea: false }, ticks: { color: '#38bdf8', font: { family: 'JetBrains Mono', size: 11 } } } } : {})\n");
    fprintf(fp, "          }\n");
    fprintf(fp, "        }\n");
    fprintf(fp, "      });\n");
    fprintf(fp, "      updateCursorHud();\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function toggleCursor() {\n");
    fprintf(fp, "      cursorEnabled = !cursorEnabled;\n");
    fprintf(fp, "      const b = document.getElementById('btnCursor');\n");
    fprintf(fp, "      if (b) b.classList.toggle('active', cursorEnabled);\n");
    fprintf(fp, "      const chk = document.getElementById('chkCursor');\n");
    fprintf(fp, "      if (chk) chk.checked = cursorEnabled;\n");
    fprintf(fp, "      const hud = document.getElementById('cursorHud');\n");
    fprintf(fp, "      if (hud) hud.style.display = cursorEnabled ? 'flex' : 'none';\n");
    fprintf(fp, "      if (chartInstance) chartInstance.draw();\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function togglePinCursor() {\n");
    fprintf(fp, "      isPinned = !isPinned;\n");
    fprintf(fp, "      const b = document.getElementById('btnPinCursor');\n");
    fprintf(fp, "      if (b) {\n");
    fprintf(fp, "        b.classList.toggle('active', isPinned);\n");
    fprintf(fp, "        b.innerHTML = isPinned ? '&#128204; Fixado (Clique p/ liberar)' : '&#128204; Fixar Cursor';\n");
    fprintf(fp, "        b.style.background = isPinned ? '#451a03' : '#1e293b';\n");
    fprintf(fp, "        b.style.color = isPinned ? '#f59e0b' : '#cbd5e1';\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      if (chartInstance) chartInstance.draw();\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function stepCursor(delta) {\n");
    fprintf(fp, "      const filtered = rawData.slice(rangeStart, rangeEnd + 1);\n");
    fprintf(fp, "      if (cursorIdx === null) cursorIdx = 0;\n");
    fprintf(fp, "      cursorIdx = Math.max(0, Math.min(filtered.length - 1, cursorIdx + delta));\n");
    fprintf(fp, "      updateCursorHud();\n");
    fprintf(fp, "      if (chartInstance) chartInstance.draw();\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function getEffectiveVal(key, idx) {\n");
    fprintf(fp, "      const filtered = rawData.slice(rangeStart, rangeEnd + 1);\n");
    fprintf(fp, "      if (idx < 0 || idx >= filtered.length) return { val: null, isHeld: false };\n");
    fprintf(fp, "      const direct = filtered[idx][key];\n");
    fprintf(fp, "      if (direct !== undefined && direct !== null && !isNaN(Number(direct))) return { val: Number(direct), isHeld: false };\n");
    fprintf(fp, "      const isHold = document.getElementById('chkHold') ? document.getElementById('chkHold').checked : true;\n");
    fprintf(fp, "      if (!isHold) return { val: null, isHeld: false };\n");
    fprintf(fp, "      for (let k = idx - 1; k >= 0; k--) {\n");
    fprintf(fp, "        const v = filtered[k][key];\n");
    fprintf(fp, "        if (v !== undefined && v !== null && !isNaN(Number(v))) return { val: Number(v), isHeld: true };\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      for (let k = rangeStart - 1; k >= 0; k--) {\n");
    fprintf(fp, "        const v = rawData[k][key];\n");
    fprintf(fp, "        if (v !== undefined && v !== null && !isNaN(Number(v))) return { val: Number(v), isHeld: true };\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      return { val: null, isHeld: false };\n");
    fprintf(fp, "    }\n\n");

    fprintf(fp, "    function updateCursorHud() {\n");
    fprintf(fp, "      if (!cursorEnabled) return;\n");
    fprintf(fp, "      const filtered = rawData.slice(rangeStart, rangeEnd + 1);\n");
    fprintf(fp, "      if (!filtered.length) return;\n");
    fprintf(fp, "      if (cursorIdx === null || cursorIdx >= filtered.length) cursorIdx = Math.floor(filtered.length / 2);\n");
    fprintf(fp, "      const row = filtered[cursorIdx];\n");
    fprintf(fp, "      const xKey = document.getElementById('selectX').value;\n");
    fprintf(fp, "      const xLabel = xKey === '_index' ? `#${row._idx}` : row.x;\n");
    fprintf(fp, "      const lblEl = document.getElementById('hudSampleLabel');\n");
    fprintf(fp, "      if (lblEl) lblEl.innerText = xLabel;\n");
    fprintf(fp, "      const idxEl = document.getElementById('hudSampleIdx');\n");
    fprintf(fp, "      if (idxEl) idxEl.innerText = `(${rangeStart + cursorIdx + 1}/${rawData.length})`;\n");
    fprintf(fp, "      const container = document.getElementById('hudMetricsContainer');\n");
    fprintf(fp, "      if (!container) return;\n");
    fprintf(fp, "      container.innerHTML = '';\n");
    fprintf(fp, "      for (const [key, cfg] of Object.entries(metricMeta)) {\n");
    fprintf(fp, "        const chk = document.getElementById('chk_' + key);\n");
    fprintf(fp, "        if (chk && chk.checked) {\n");
    fprintf(fp, "          const eff = getEffectiveVal(key, cursorIdx);\n");
    fprintf(fp, "          const valFormatted = eff.val !== null ? eff.val.toFixed(2) : 'N/D';\n");
    fprintf(fp, "          const holdTag = eff.isHeld ? ' <span style=\"font-size:8px;color:#818cf8;border:1px solid #4338ca;padding:0 3px;border-radius:3px;\">hold</span>' : '';\n");
    fprintf(fp, "          const badge = document.createElement('div');\n");
    fprintf(fp, "          badge.style = 'display:flex;align-items:center;gap:6px;background:#0f172a;border:1px solid #1e293b;padding:3px 8px;border-radius:6px;';\n");
    fprintf(fp, "          badge.innerHTML = `<span style=\"width:8px;height:8px;border-radius:50%%;background:${cfg.color};display:inline-block;\"></span><span style=\"color:#94a3b8;font-family:\\'JetBrains Mono\\';font-size:10px;\">${key}:</span><strong style=\"color:#fff;font-family:\\'JetBrains Mono\\';\">${valFormatted}</strong>${holdTag}`;\n");
    fprintf(fp, "          container.appendChild(badge);\n");
    fprintf(fp, "        }\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "    }\n\n");

    /* Funções de controle */
    fprintf(fp, "    function setScaleMode(m) {\n");
    fprintf(fp, "      scaleMode = m;\n");
    fprintf(fp, "      document.getElementById('btnScaleAuto').classList.toggle('active', m === 'auto');\n");
    fprintf(fp, "      document.getElementById('btnScaleManual').classList.toggle('active', m === 'manual');\n");
    fprintf(fp, "      document.getElementById('boxManualScale').style.display = (m === 'manual' ? 'flex' : 'none');\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function setChartType(t) {\n");
    fprintf(fp, "      chartType = t;\n");
    fprintf(fp, "      ['Line','Area','Bar','Stepped'].forEach(id => {\n");
    fprintf(fp, "        const b = document.getElementById('btn' + id);\n");
    fprintf(fp, "        if (b) b.classList.toggle('active', id.toLowerCase() === t.toLowerCase());\n");
    fprintf(fp, "      });\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");
    fprintf(fp, "    let sortSelectedFirst = true;\n");
    fprintf(fp, "    function toggleSortMode() {\n");
    fprintf(fp, "      sortSelectedFirst = !sortSelectedFirst;\n");
    fprintf(fp, "      const b = document.getElementById('btnSortMode');\n");
    fprintf(fp, "      if (b) {\n");
    fprintf(fp, "        b.classList.toggle('active', sortSelectedFirst);\n");
    fprintf(fp, "        b.innerHTML = sortSelectedFirst ? '&#8645; Selecionados 1º' : '&#8645; A-Z Geral';\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      sortMetricsList();\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function sortMetricsList() {\n");
    fprintf(fp, "      const list = document.getElementById('metricList');\n");
    fprintf(fp, "      if (!list) return;\n");
    fprintf(fp, "      const oldDivs = list.querySelectorAll('.section-divider');\n");
    fprintf(fp, "      oldDivs.forEach(d => d.remove());\n");
    fprintf(fp, "      const items = Array.from(list.children).filter(el => el.classList.contains('metric-item'));\n");
    fprintf(fp, "      items.sort((a, b) => {\n");
    fprintf(fp, "        const aKey = a.getAttribute('data-key') || '';\n");
    fprintf(fp, "        const bKey = b.getAttribute('data-key') || '';\n");
    fprintf(fp, "        if (sortSelectedFirst) {\n");
    fprintf(fp, "          const aChk = a.querySelector('input[type=\"checkbox\"]');\n");
    fprintf(fp, "          const bChk = b.querySelector('input[type=\"checkbox\"]');\n");
    fprintf(fp, "          const aSel = (aChk && aChk.checked) ? 1 : 0;\n");
    fprintf(fp, "          const bSel = (bChk && bChk.checked) ? 1 : 0;\n");
    fprintf(fp, "          if (aSel !== bSel) return bSel - aSel;\n");
    fprintf(fp, "        }\n");
    fprintf(fp, "        return aKey.localeCompare(bKey, undefined, { numeric: true });\n");
    fprintf(fp, "      });\n");
    fprintf(fp, "      list.innerHTML = '';\n");
    fprintf(fp, "      let dividerInserted = false;\n");
    fprintf(fp, "      const selectedCount = items.filter(el => {\n");
    fprintf(fp, "        const chk = el.querySelector('input[type=\"checkbox\"]');\n");
    fprintf(fp, "        return chk && chk.checked;\n");
    fprintf(fp, "      }).length;\n");
    fprintf(fp, "      items.forEach((el) => {\n");
    fprintf(fp, "        const chk = el.querySelector('input[type=\"checkbox\"]');\n");
    fprintf(fp, "        const isChecked = chk && chk.checked;\n");
    fprintf(fp, "        if (sortSelectedFirst && !isChecked && !dividerInserted && selectedCount > 0 && selectedCount < items.length) {\n");
    fprintf(fp, "          const div = document.createElement('div');\n");
    fprintf(fp, "          div.className = 'section-divider';\n");
    fprintf(fp, "          div.innerHTML = `<span>Outros Sinais (${items.length - selectedCount})</span><span>Ordem A-Z</span>`;\n");
    fprintf(fp, "          list.appendChild(div);\n");
    fprintf(fp, "          dividerInserted = true;\n");
    fprintf(fp, "        }\n");
    fprintf(fp, "        list.appendChild(el);\n");
    fprintf(fp, "      });\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    function toggleMetric(key) {\n");
    fprintf(fp, "      const chk = document.getElementById('chk_' + key);\n");
    fprintf(fp, "      document.getElementById('item_' + key).classList.toggle('selected', chk.checked);\n");
    fprintf(fp, "      sortMetricsList();\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function toggleAxis(key) {\n");
    fprintf(fp, "      const btn = document.getElementById('axis_' + key);\n");
    fprintf(fp, "      if (metricMeta[key].yAxis === 'y') {\n");
    fprintf(fp, "        metricMeta[key].yAxis = 'y1';\n");
    fprintf(fp, "        btn.classList.add('right');\n");
    fprintf(fp, "        btn.innerText = 'Eixo Dir (Y1)';\n");
    fprintf(fp, "      } else {\n");
    fprintf(fp, "        metricMeta[key].yAxis = 'y';\n");
    fprintf(fp, "        btn.classList.remove('right');\n");
    fprintf(fp, "        btn.innerText = 'Eixo Esq (Y)';\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function selectAllMetrics() {\n");
    fprintf(fp, "      for (const k in metricMeta) {\n");
    fprintf(fp, "        const chk = document.getElementById('chk_' + k);\n");
    fprintf(fp, "        if (chk) chk.checked = true;\n");
    fprintf(fp, "        const itm = document.getElementById('item_' + k);\n");
    fprintf(fp, "        if (itm) itm.classList.add('selected');\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      sortMetricsList();\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");
    fprintf(fp, "    function clearMetrics() {\n");
    fprintf(fp, "      for (const k in metricMeta) {\n");
    fprintf(fp, "        const chk = document.getElementById('chk_' + k);\n");
    fprintf(fp, "        if (chk) chk.checked = false;\n");
    fprintf(fp, "        const itm = document.getElementById('item_' + k);\n");
    fprintf(fp, "        if (itm) itm.classList.remove('selected');\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      sortMetricsList();\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function filterMetricsList() {\n");
    fprintf(fp, "      const q = document.getElementById('txtFilter').value.toLowerCase();\n");
    fprintf(fp, "      const divs = document.querySelectorAll('.section-divider');\n");
    fprintf(fp, "      divs.forEach(d => d.style.display = q ? 'none' : 'flex');\n");
    fprintf(fp, "      for (const k in metricMeta) {\n");
    fprintf(fp, "        const el = document.getElementById('item_' + k);\n");
    fprintf(fp, "        if (el) el.style.display = k.toLowerCase().includes(q) ? 'flex' : 'none';\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function onRangeChange() {\n");
    fprintf(fp, "      let s = parseInt(document.getElementById('rngStart').value);\n");
    fprintf(fp, "      let e = parseInt(document.getElementById('rngEnd').value);\n");
    fprintf(fp, "      if (s >= e) s = Math.max(0, e - 1);\n");
    fprintf(fp, "      rangeStart = s;\n");
    fprintf(fp, "      rangeEnd = e;\n");
    fprintf(fp, "      document.getElementById('txtStart').innerText = s + 1;\n");
    fprintf(fp, "      document.getElementById('txtEnd').innerText = e + 1;\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function resetRange() {\n");
    fprintf(fp, "      rangeStart = 0;\n");
    fprintf(fp, "      rangeEnd = rawData.length - 1;\n");
    fprintf(fp, "      document.getElementById('rngStart').value = rangeStart;\n");
    fprintf(fp, "      document.getElementById('rngEnd').value = rangeEnd;\n");
    fprintf(fp, "      document.getElementById('txtStart').innerText = 1;\n");
    fprintf(fp, "      document.getElementById('txtEnd').innerText = rawData.length;\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function setPreset(p) {\n");
    fprintf(fp, "      const count = Math.max(5, Math.floor(rawData.length * p));\n");
    fprintf(fp, "      rangeStart = Math.max(0, rawData.length - count);\n");
    fprintf(fp, "      rangeEnd = rawData.length - 1;\n");
    fprintf(fp, "      document.getElementById('rngStart').value = rangeStart;\n");
    fprintf(fp, "      document.getElementById('rngEnd').value = rangeEnd;\n");
    fprintf(fp, "      document.getElementById('txtStart').innerText = rangeStart + 1;\n");
    fprintf(fp, "      document.getElementById('txtEnd').innerText = rangeEnd + 1;\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function setLastN(n) {\n");
    fprintf(fp, "      rangeStart = Math.max(0, rawData.length - n);\n");
    fprintf(fp, "      rangeEnd = rawData.length - 1;\n");
    fprintf(fp, "      document.getElementById('rngStart').value = rangeStart;\n");
    fprintf(fp, "      document.getElementById('rngEnd').value = rangeEnd;\n");
    fprintf(fp, "      document.getElementById('txtStart').innerText = rangeStart + 1;\n");
    fprintf(fp, "      document.getElementById('txtEnd').innerText = rangeEnd + 1;\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function downloadPNG() {\n");
    fprintf(fp, "      if (!chartInstance) return;\n");
    fprintf(fp, "      const srcCanvas = chartInstance.canvas;\n");
    fprintf(fp, "      const dpr = chartInstance.currentDevicePixelRatio || window.devicePixelRatio || 1;\n");
    fprintf(fp, "      const exportCanvas = document.createElement('canvas');\n");
    fprintf(fp, "      exportCanvas.width = srcCanvas.width;\n");
    fprintf(fp, "      exportCanvas.height = srcCanvas.height;\n");
    fprintf(fp, "      const ctx = exportCanvas.getContext('2d');\n");
    fprintf(fp, "      if (!ctx) return;\n");
    fprintf(fp, "      ctx.fillStyle = '#090d16';\n");
    fprintf(fp, "      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);\n");
    fprintf(fp, "      ctx.drawImage(srcCanvas, 0, 0);\n");
    fprintf(fp, "      if (cursorEnabled && cursorIdx !== null && chartInstance.chartArea) {\n");
    fprintf(fp, "        ctx.save();\n");
    fprintf(fp, "        ctx.scale(dpr, dpr);\n");
    fprintf(fp, "        const { left, right, top, bottom } = chartInstance.chartArea;\n");
    fprintf(fp, "        const meta0 = chartInstance.getDatasetMeta(0);\n");
    fprintf(fp, "        if (meta0 && meta0.data && meta0.data[cursorIdx]) {\n");
    fprintf(fp, "          const x = meta0.data[cursorIdx].x;\n");
    fprintf(fp, "          ctx.beginPath();\n");
    fprintf(fp, "          ctx.setLineDash([5, 4]);\n");
    fprintf(fp, "          ctx.lineWidth = isPinned ? 2.5 : 2;\n");
    fprintf(fp, "          ctx.strokeStyle = isPinned ? '#f59e0b' : '#818cf8';\n");
    fprintf(fp, "          ctx.moveTo(x, top - 6);\n");
    fprintf(fp, "          ctx.lineTo(x, bottom);\n");
    fprintf(fp, "          ctx.stroke();\n");
    fprintf(fp, "          ctx.setLineDash([]);\n");
    fprintf(fp, "          const filtered = rawData.slice(rangeStart, rangeEnd + 1);\n");
    fprintf(fp, "          const xKey = document.getElementById('selectX').value;\n");
    fprintf(fp, "          const xLabel = xKey === '_index' ? `#${filtered[cursorIdx]._idx}` : filtered[cursorIdx].x;\n");
    fprintf(fp, "          const badgeText = isPinned ? `${xLabel} (fixo)` : xLabel;\n");
    fprintf(fp, "          ctx.font = 'bold 11px \"JetBrains Mono\", monospace';\n");
    fprintf(fp, "          const tw = ctx.measureText(badgeText).width;\n");
    fprintf(fp, "          const bw = tw + 14;\n");
    fprintf(fp, "          ctx.fillStyle = isPinned ? '#b45309' : '#4f46e5';\n");
    fprintf(fp, "          ctx.fillRect(x - bw / 2, top - 25, bw, 20);\n");
    fprintf(fp, "          ctx.strokeStyle = isPinned ? '#f59e0b' : '#818cf8';\n");
    fprintf(fp, "          ctx.lineWidth = 1;\n");
    fprintf(fp, "          ctx.strokeRect(x - bw / 2, top - 25, bw, 20);\n");
    fprintf(fp, "          ctx.fillStyle = '#ffffff';\n");
    fprintf(fp, "          ctx.textAlign = 'center';\n");
    fprintf(fp, "          ctx.textBaseline = 'middle';\n");
    fprintf(fp, "          ctx.fillText(badgeText, x, top - 15);\n");
    fprintf(fp, "          const activeMetrics = [];\n");
    fprintf(fp, "          chartInstance.data.datasets.forEach((ds, dsIdx) => {\n");
    fprintf(fp, "            const dsMeta = chartInstance.getDatasetMeta(dsIdx);\n");
    fprintf(fp, "            if (dsMeta && dsMeta.data && dsMeta.data[cursorIdx]) {\n");
    fprintf(fp, "              const p = dsMeta.data[cursorIdx];\n");
    fprintf(fp, "              if (p && typeof p.y === 'number' && !isNaN(p.y)) {\n");
    fprintf(fp, "                ctx.beginPath();\n");
    fprintf(fp, "                ctx.arc(x, p.y, isPinned ? 5.5 : 4.5, 0, Math.PI * 2);\n");
    fprintf(fp, "                ctx.fillStyle = ds.borderColor || '#ffffff';\n");
    fprintf(fp, "                ctx.fill();\n");
    fprintf(fp, "                ctx.lineWidth = 2;\n");
    fprintf(fp, "                ctx.strokeStyle = '#090d16';\n");
    fprintf(fp, "                ctx.stroke();\n");
    fprintf(fp, "              }\n");
    fprintf(fp, "              const eff = getEffectiveVal(ds.label, cursorIdx);\n");
    fprintf(fp, "              activeMetrics.push({ label: ds.label, color: ds.borderColor, val: eff.val !== null ? eff.val.toFixed(2) : 'N/D', isHeld: eff.isHeld });\n");
    fprintf(fp, "            }\n");
    fprintf(fp, "          });\n");
    fprintf(fp, "          if (activeMetrics.length > 0) {\n");
    fprintf(fp, "            const cardW = 180;\n");
    fprintf(fp, "            const lineH = 18;\n");
    fprintf(fp, "            const cardH = 24 + activeMetrics.length * lineH + 8;\n");
    fprintf(fp, "            let cardX = (x + 16 + cardW > right - 8) ? x - cardW - 16 : x + 16;\n");
    fprintf(fp, "            let cardY = Math.min(top + 10, bottom - cardH - 8);\n");
    fprintf(fp, "            ctx.fillStyle = 'rgba(10, 15, 29, 0.94)';\n");
    fprintf(fp, "            ctx.fillRect(cardX, cardY, cardW, cardH);\n");
    fprintf(fp, "            ctx.strokeStyle = isPinned ? 'rgba(245, 158, 11, 0.7)' : 'rgba(99, 102, 241, 0.7)';\n");
    fprintf(fp, "            ctx.strokeRect(cardX, cardY, cardW, cardH);\n");
    fprintf(fp, "            ctx.textAlign = 'left';\n");
    fprintf(fp, "            ctx.font = 'bold 11px sans-serif';\n");
    fprintf(fp, "            ctx.fillStyle = isPinned ? '#fbbf24' : '#a5b4fc';\n");
    fprintf(fp, "            ctx.fillText(`Amostra: ${xLabel}`, cardX + 10, cardY + 14);\n");
    fprintf(fp, "            activeMetrics.forEach((m, mIdx) => {\n");
    fprintf(fp, "              const itemY = cardY + 28 + mIdx * lineH;\n");
    fprintf(fp, "              ctx.beginPath();\n");
    fprintf(fp, "              ctx.arc(cardX + 14, itemY, 4, 0, Math.PI * 2);\n");
    fprintf(fp, "              ctx.fillStyle = m.color;\n");
    fprintf(fp, "              ctx.fill();\n");
    fprintf(fp, "              ctx.font = '10px sans-serif';\n");
    fprintf(fp, "              ctx.fillStyle = '#94a3b8';\n");
    fprintf(fp, "              ctx.fillText(m.label, cardX + 24, itemY + 3);\n");
    fprintf(fp, "              ctx.textAlign = 'right';\n");
    fprintf(fp, "              ctx.font = 'bold 10px monospace';\n");
    fprintf(fp, "              ctx.fillStyle = '#ffffff';\n");
    fprintf(fp, "              ctx.fillText(`${m.val}${m.isHeld ? ' [H]' : ''}`, cardX + cardW - 10, itemY + 3);\n");
    fprintf(fp, "              ctx.textAlign = 'left';\n");
    fprintf(fp, "            });\n");
    fprintf(fp, "          }\n");
    fprintf(fp, "        }\n");
    fprintf(fp, "        ctx.restore();\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      const a = document.createElement('a');\n");
    fprintf(fp, "      a.href = exportCanvas.toDataURL('image/png');\n");
    fprintf(fp, "      a.download = 'grafico_log.png';\n");
    fprintf(fp, "      a.click();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function toggleFS() {\n");
    fprintf(fp, "      const el = document.getElementById('chartBox');\n");
    fprintf(fp, "      if (!document.fullscreenElement) el.requestFullscreen();\n");
    fprintf(fp, "      else document.exitFullscreen();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function parseCsvString(txt) {\n");
    fprintf(fp, "      const lines = txt.trim().split(/\\r?\\n/).filter(l => l.trim().length > 0);\n");
    fprintf(fp, "      if (!lines.length) return [];\n");
    fprintf(fp, "      let delim = ',';\n");
    fprintf(fp, "      if (lines[0].includes(';') && lines[0].split(';').length > lines[0].split(',').length) delim = ';';\n");
    fprintf(fp, "      else if (lines[0].includes('\\t')) delim = '\\t';\n");
    fprintf(fp, "      const headers = lines[0].split(delim).map(h => h.trim().replace(/^\"|\"$/g, ''));\n");
    fprintf(fp, "      const res = [];\n");
    fprintf(fp, "      for (let i = 1; i < lines.length; i++) {\n");
    fprintf(fp, "        const parts = lines[i].split(delim).map(p => p.trim().replace(/^\"|\"$/g, ''));\n");
    fprintf(fp, "        if (parts.length === 1 && !parts[0]) continue;\n");
    fprintf(fp, "        const obj = {};\n");
    fprintf(fp, "        headers.forEach((h, idx) => {\n");
    fprintf(fp, "          let v = parts[idx] !== undefined ? parts[idx] : '';\n");
    fprintf(fp, "          if (delim === ';' && /^-?\\d+,\\d+$/.test(v)) v = v.replace(',', '.');\n");
    fprintf(fp, "          obj[h] = (v !== '' && !isNaN(Number(v))) ? Number(v) : v;\n");
    fprintf(fp, "        });\n");
    fprintf(fp, "        res.push(obj);\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      return res;\n");
    fprintf(fp, "    }\n\n");

    fprintf(fp, "    function loadNewJsonFile(evt) {\n");
    fprintf(fp, "      const file = evt.target.files[0];\n");
    fprintf(fp, "      if (!file) return;\n");
    fprintf(fp, "      const reader = new FileReader();\n");
    fprintf(fp, "      reader.onload = function(e) {\n");
    fprintf(fp, "        try {\n");
    fprintf(fp, "          let arr;\n");
    fprintf(fp, "          const isCsv = file.name.toLowerCase().endsWith('.csv');\n");
    fprintf(fp, "          if (isCsv) {\n");
    fprintf(fp, "            arr = parseCsvString(e.target.result);\n");
    fprintf(fp, "          } else {\n");
    fprintf(fp, "            try {\n");
    fprintf(fp, "              const parsed = JSON.parse(e.target.result);\n");
    fprintf(fp, "              arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.logs || [parsed]);\n");
    fprintf(fp, "            } catch(err) {\n");
    fprintf(fp, "              try {\n");
    fprintf(fp, "                const lines = e.target.result.trim().split(/\\r?\\n/).filter(l => l.trim().length > 0);\n");
    fprintf(fp, "                arr = lines.map(l => JSON.parse(l.replace(/,$/, '')));\n");
    fprintf(fp, "              } catch(err2) {\n");
    fprintf(fp, "                arr = parseCsvString(e.target.result);\n");
    fprintf(fp, "              }\n");
    fprintf(fp, "            }\n");
    fprintf(fp, "          }\n");
    fprintf(fp, "          if (!arr || !arr.length) return alert('Arquivo vazio ou não reconhecido como JSON/CSV');\n");
    fprintf(fp, "          const allKeys = new Set();\n");
    fprintf(fp, "          arr.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));\n");
    fprintf(fp, "          let newX = Array.from(allKeys).find(k => k === '#' || k.includes('time') || k.includes('date') || k === 'id') || '_index';\n");
    fprintf(fp, "          const numKeys = Array.from(allKeys).filter(k => k !== newX && k !== '#' && k !== '_index');\n");
    fprintf(fp, "          rawData.length = 0;\n");
    fprintf(fp, "          const lastKnown = {};\n");
    fprintf(fp, "          for (let i = 0; i < arr.length; i++) {\n");
    fprintf(fp, "            const row = { _idx: i + 1, x: String(arr[i][newX] !== undefined ? arr[i][newX] : (newX === '#' ? '#' + (i + 1) : i + 1)) };\n");
    fprintf(fp, "            numKeys.forEach(k => {\n");
    fprintf(fp, "              if (arr[i][k] !== undefined && arr[i][k] !== null && !isNaN(Number(arr[i][k]))) {\n");
    fprintf(fp, "                lastKnown[k] = Number(arr[i][k]);\n");
    fprintf(fp, "              }\n");
    fprintf(fp, "              row[k] = lastKnown[k] !== undefined ? lastKnown[k] : 0;\n");
    fprintf(fp, "            });\n");
    fprintf(fp, "            rawData.push(row);\n");
    fprintf(fp, "          }\n");
    fprintf(fp, "          for (const k in metricMeta) delete metricMeta[k];\n");
    fprintf(fp, "          const pal = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];\n");
    fprintf(fp, "          const listEl = document.getElementById('metricList');\n");
    fprintf(fp, "          listEl.innerHTML = '';\n");
    fprintf(fp, "          numKeys.forEach((k, idx) => {\n");
    fprintf(fp, "            const col = pal[idx %% pal.length];\n");
    fprintf(fp, "            metricMeta[k] = { color: col, yAxis: (idx === 1 ? 'y1' : 'y'), checked: (idx < 3) };\n");
    fprintf(fp, "            const itm = document.createElement('div');\n");
    fprintf(fp, "            itm.className = 'metric-item' + (idx < 3 ? ' selected' : '');\n");
    fprintf(fp, "            itm.id = 'item_' + k;\n");
    fprintf(fp, "            itm.setAttribute('data-key', k);\n");
    fprintf(fp, "            itm.innerHTML = `<label style=\"display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;\"><input type=\"checkbox\" id=\"chk_${k}\" ${idx < 3 ? 'checked' : ''} onchange=\"toggleMetric('${k}')\" style=\"accent-color:#4f46e5;\"><span class=\"dot\" style=\"background:${col}\"></span><div style=\"font-size:12px;font-weight:600;font-family:'JetBrains Mono';\">${k}</div></label><button class=\"axis-badge ${idx === 1 ? 'right' : ''}\" id=\"axis_${k}\" onclick=\"toggleAxis('${k}')\">${idx === 1 ? 'Eixo Dir (Y1)' : 'Eixo Esq (Y)'}</button>`;\n");
    fprintf(fp, "            listEl.appendChild(itm);\n");
    fprintf(fp, "          });\n");
    fprintf(fp, "          document.getElementById('lblFileRecords').innerText = `${arr.length} registros`;\n");
    fprintf(fp, "          const selX = document.getElementById('selectX');\n");
    fprintf(fp, "          selX.innerHTML = `<option value=\"${newX}\" selected>${newX}</option><option value=\"_index\"># Índice Sequencial</option>`;\n");
    fprintf(fp, "          sortMetricsList();\n");
    fprintf(fp, "          resetRange();\n");
    fprintf(fp, "        } catch(err) { alert('Erro ao processar arquivo: ' + err.message); }\n");
    fprintf(fp, "      };\n");
    fprintf(fp, "      reader.readAsText(file);\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    window.onload = function() { sortMetricsList(); updateChart(); };\n");
    fprintf(fp, "  </script>\n</body>\n</html>\n");

    fclose(fp);
    printf("[SUCESSO] Grafico interativo gerado em C: '%s'\n", output_file);
    return 1;
}

/* Comparador de strings insensível a maiúsculas/minúsculas portátil C99 */
static int ci_streq(const char *a, const char *b) {
    while (*a && *b) {
        char ca = (*a >= 'A' && *a <= 'Z') ? *a + 32 : *a;
        char cb = (*b >= 'A' && *b <= 'Z') ? *b + 32 : *b;
        if (ca != cb) return 0;
        a++;
        b++;
    }
    return (*a == '\0' && *b == '\0');
}

/* Parser de CSV robusto e portavel em ANSI C99 */
static int load_csv_dataset(const char *content, Dataset *ds, const char *x_key_param, int num_requested_metrics, char requested_metrics[][MAX_LABEL_LEN]) {
    if (!content || !ds) return 0;

    // Detect delimiter from first non-empty line
    char delim = ',';
    const char *first_nl = strchr(content, '\n');
    if (first_nl) {
        int commas = 0, semis = 0, tabs = 0;
        for (const char *p = content; p < first_nl; p++) {
            if (*p == ',') commas++;
            else if (*p == ';') semis++;
            else if (*p == '\t') tabs++;
        }
        if (semis > commas && semis > tabs) delim = ';';
        else if (tabs > commas && tabs > semis) delim = '\t';
    }

    char *copy = (char*)malloc(strlen(content) + 1);
    if (!copy) return 0;
    strcpy(copy, content);

    // Split headers from first line
    char *p = copy;
    char *eol = strpbrk(p, "\r\n");
    if (!eol) { free(copy); return 0; }
    *eol = '\0';
    char *next_line = eol + 1;
    while (*next_line == '\r' || *next_line == '\n') next_line++;

    char headers[MAX_METRICS + 8][MAX_LABEL_LEN];
    int num_cols = 0;
    char *tok = p;
    while (tok && num_cols < MAX_METRICS + 8) {
        char *sep = strchr(tok, delim);
        if (sep) *sep = '\0';
        while (*tok == ' ' || *tok == '\t' || *tok == '"') tok++;
        size_t len = strlen(tok);
        while (len > 0 && (tok[len - 1] == ' ' || tok[len - 1] == '\t' || tok[len - 1] == '"' || tok[len - 1] == '\r')) {
            tok[len - 1] = '\0';
            len--;
        }
        if (len > 0) {
            strncpy(headers[num_cols], tok, MAX_LABEL_LEN - 1);
            headers[num_cols][MAX_LABEL_LEN - 1] = '\0';
        } else {
            snprintf(headers[num_cols], MAX_LABEL_LEN, "col_%d", num_cols + 1);
        }
        num_cols++;
        tok = sep ? (sep + 1) : NULL;
    }

    if (num_cols == 0) { free(copy); return 0; }

    int capacity = 2048;
    ds->points = (DataPoint*)malloc(capacity * sizeof(DataPoint));
    if (!ds->points) { free(copy); return 0; }
    ds->num_points = 0;

    int x_col_idx = -1;
    if (x_key_param && strlen(x_key_param) > 0) {
        for (int c = 0; c < num_cols; c++) {
            if (strcmp(headers[c], x_key_param) == 0) {
                x_col_idx = c;
                strncpy(ds->x_key, headers[c], sizeof(ds->x_key) - 1);
                break;
            }
        }
    }

    if (x_col_idx < 0) {
        const char *candidates[] = { "#", "timestamp", "horario", "time", "date", "minuto", "tempo", "step", "seq", "id" };
        for (size_t cd = 0; cd < sizeof(candidates)/sizeof(candidates[0]); cd++) {
            for (int c = 0; c < num_cols; c++) {
                if (ci_streq(headers[c], candidates[cd])) {
                    x_col_idx = c;
                    strncpy(ds->x_key, headers[c], sizeof(ds->x_key) - 1);
                    break;
                }
            }
            if (x_col_idx >= 0) break;
        }
        if (x_col_idx < 0) {
            strncpy(ds->x_key, "_index", sizeof(ds->x_key) - 1);
        }
    }

    int metric_col_indices[MAX_METRICS];
    ds->num_metrics = 0;

    if (num_requested_metrics == 0) {
        for (int c = 0; c < num_cols && ds->num_metrics < MAX_METRICS; c++) {
            if (c == x_col_idx) continue;
            if (strcmp(headers[c], "#") == 0 || strcmp(headers[c], "_index") == 0) continue;
            metric_col_indices[ds->num_metrics] = c;
            strncpy(ds->metric_names[ds->num_metrics], headers[c], MAX_LABEL_LEN - 1);
            ds->num_metrics++;
        }
    } else {
        for (int m = 0; m < num_requested_metrics && ds->num_metrics < MAX_METRICS; m++) {
            for (int c = 0; c < num_cols; c++) {
                if (strcmp(headers[c], requested_metrics[m]) == 0) {
                    metric_col_indices[ds->num_metrics] = c;
                    strncpy(ds->metric_names[ds->num_metrics], headers[c], MAX_LABEL_LEN - 1);
                    ds->num_metrics++;
                    break;
                }
            }
        }
    }

    // Parse each data row
    p = next_line;
    while (p && *p) {
        eol = strpbrk(p, "\r\n");
        if (eol) {
            *eol = '\0';
            next_line = eol + 1;
            while (*next_line == '\r' || *next_line == '\n') next_line++;
        } else {
            next_line = NULL;
        }

        while (*p == ' ' || *p == '\t') p++;
        if (*p == '\0') {
            p = next_line;
            continue;
        }

        if (ds->num_points >= capacity) {
            capacity *= 2;
            DataPoint *new_buf = (DataPoint*)realloc(ds->points, capacity * sizeof(DataPoint));
            if (!new_buf) break;
            ds->points = new_buf;
        }

        DataPoint *dp = &ds->points[ds->num_points];
        for (int m = 0; m < ds->num_metrics; m++) {
            dp->values[m] = (ds->num_points > 0) ? ds->points[ds->num_points - 1].values[m] : 0.0;
        }
        snprintf(dp->x_label, sizeof(dp->x_label), "#%d", ds->num_points + 1);

        int col = 0;
        char *cell = p;
        while (cell && col < num_cols) {
            char *sep = strchr(cell, delim);
            if (sep) *sep = '\0';

            while (*cell == ' ' || *cell == '\t' || *cell == '"') cell++;
            size_t clen = strlen(cell);
            while (clen > 0 && (cell[clen - 1] == ' ' || cell[clen - 1] == '\t' || cell[clen - 1] == '"' || cell[clen - 1] == '\r')) {
                cell[clen - 1] = '\0';
                clen--;
            }

            if (col == x_col_idx && clen > 0) {
                strncpy(dp->x_label, cell, sizeof(dp->x_label) - 1);
                dp->x_label[sizeof(dp->x_label) - 1] = '\0';
            }

            for (int m = 0; m < ds->num_metrics; m++) {
                if (metric_col_indices[m] == col && clen > 0) {
                    char num_buf[64];
                    strncpy(num_buf, cell, sizeof(num_buf) - 1);
                    num_buf[sizeof(num_buf) - 1] = '\0';
                    char *cp = strchr(num_buf, ',');
                    if (cp) *cp = '.';
                    char *end_ptr = NULL;
                    double v = strtod(num_buf, &end_ptr);
                    if (end_ptr != num_buf) {
                        dp->values[m] = v;
                    }
                }
            }

            col++;
            cell = sep ? (sep + 1) : NULL;
        }

        ds->num_points++;
        p = next_line;
    }

    free(copy);

    if (ds->num_points == 0) {
        free(ds->points);
        ds->points = NULL;
        return 0;
    }

    for (int m = 0; m < ds->num_metrics; m++) {
        compute_metric_stats(ds, m);
    }

    return 1;
}

int main(int argc, char **argv) {
    const char *input_filename = "sample_iot.json";
    const char *x_key_param = NULL;
    char requested_metrics[MAX_METRICS][MAX_LABEL_LEN];
    int num_requested_metrics = 0;
    const char *html_output = "grafico_c.html";

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-i") == 0 && i + 1 < argc) {
            input_filename = argv[++i];
        } else if (strcmp(argv[i], "-x") == 0 && i + 1 < argc) {
            x_key_param = argv[++i];
        } else if (strcmp(argv[i], "-m") == 0 && i + 1 < argc) {
            char *token = strtok(argv[++i], ",");
            while (token && num_requested_metrics < MAX_METRICS) {
                strncpy(requested_metrics[num_requested_metrics++], token, MAX_LABEL_LEN - 1);
                token = strtok(NULL, ",");
            }
        } else if (strcmp(argv[i], "--html") == 0 && i + 1 < argc) {
            html_output = argv[++i];
        } else if (argv[i][0] != '-') {
            input_filename = argv[i];
        }
    }

    if (argc == 1) {
        FILE *fcan_csv = fopen("sample_can_bus.csv", "rb");
        if (fcan_csv) {
            fclose(fcan_csv);
            input_filename = "sample_can_bus.csv";
        } else {
            FILE *fcan = fopen("sample_can_bus.json", "rb");
            if (fcan) {
                fclose(fcan);
                input_filename = "sample_can_bus.json";
            } else {
                FILE *flog = fopen("LOG_99fc1f91.json", "rb");
                if (flog) {
                    fclose(flog);
                    input_filename = "LOG_99fc1f91.json";
                }
            }
        }
    }

    printf("========================================================\n");
    printf("   LogPlotter C v2.5 (ANSI C99) - Windows 11 / Linux\n");
    printf("   [NOVO] Leitor de Arquivos CSV & JSON | Cursor & PNG\n");
    printf("========================================================\n");
    printf("[INFO] Arquivo: %s\n", input_filename);

    size_t file_size = 0;
    char *file_content = read_entire_file(input_filename, &file_size);
    if (!file_content) return 1;

    Dataset ds;
    memset(&ds, 0, sizeof(Dataset));
    JsonNode *root = NULL;

    int is_csv = (strstr(input_filename, ".csv") != NULL || strstr(input_filename, ".CSV") != NULL);
    if (is_csv) {
        printf("[INFO] Formato identificado: CSV (.csv)\n");
        if (!load_csv_dataset(file_content, &ds, x_key_param, num_requested_metrics, requested_metrics)) {
            fprintf(stderr, "[ERRO] Nao foi possivel carregar o arquivo CSV '%s'\n", input_filename);
            free(file_content);
            return 1;
        }
    } else {
        const char *error_ptr = NULL;
        root = json_parse(file_content, &error_ptr);
        if (!root) {
            // Tenta fallback para CSV
            if (load_csv_dataset(file_content, &ds, x_key_param, num_requested_metrics, requested_metrics)) {
                printf("[INFO] Formato identificado como CSV via analise de conteudo\n");
            } else {
                fprintf(stderr, "[ERRO] Falha ao analisar JSON proximo a: %.40s\n", error_ptr ? error_ptr : "");
                free(file_content);
                return 1;
            }
        }
    }

    if (!is_csv && root) {
        JsonNode *array_node = NULL;
        if (root->type == JSON_ARRAY) {
            array_node = root;
        } else if (root->type == JSON_OBJECT) {
            array_node = json_object_get(root, "data");
            if (!array_node) array_node = json_object_get(root, "logs");
            if (!array_node) array_node = json_object_get(root, "records");
        }

        if (!array_node || array_node->type != JSON_ARRAY) {
            fprintf(stderr, "[ERRO] O JSON deve conter um array de registros.\n");
            json_free(root);
            free(file_content);
            return 1;
        }

        size_t total_records = json_array_length(array_node);
        if (total_records == 0) {
            fprintf(stderr, "[ERRO] Array de registros esta vazio.\n");
            json_free(root);
            free(file_content);
            return 1;
        }

        ds.num_points = (int)total_records;
        ds.points = (DataPoint*)malloc(ds.num_points * sizeof(DataPoint));

    if (!x_key_param) {
        const char *candidates[] = { "#", "timestamp", "horario", "time", "date", "minuto", "tempo", "step", "seq", "id" };
        for (size_t c = 0; c < sizeof(candidates)/sizeof(candidates[0]); c++) {
            for (size_t r = 0; r < total_records && r < 100; r++) {
                JsonNode *rec = json_array_get(array_node, r);
                if (rec && json_object_get(rec, candidates[c])) {
                    strncpy(ds.x_key, candidates[c], sizeof(ds.x_key) - 1);
                    break;
                }
            }
            if (strlen(ds.x_key) > 0) break;
        }
        if (strlen(ds.x_key) == 0) strncpy(ds.x_key, "_index", sizeof(ds.x_key) - 1);
    } else {
        strncpy(ds.x_key, x_key_param, sizeof(ds.x_key) - 1);
    }

    if (num_requested_metrics == 0) {
        for (size_t r = 0; r < total_records && ds.num_metrics < MAX_METRICS; r++) {
            JsonNode *rec = json_array_get(array_node, r);
            if (!rec || rec->type != JSON_OBJECT) continue;
            for (size_t f = 0; f < rec->value.obj_val.count && ds.num_metrics < MAX_METRICS; f++) {
                JsonNode *field = rec->value.obj_val.fields[f];
                if (field->type == JSON_NUMBER && strcmp(field->key, ds.x_key) != 0 && strcmp(field->key, "#") != 0) {
                    int exists = 0;
                    for (int m = 0; m < ds.num_metrics; m++) {
                        if (strcmp(ds.metric_names[m], field->key) == 0) {
                            exists = 1;
                            break;
                        }
                    }
                    if (!exists && ds.num_metrics < MAX_METRICS) {
                        strncpy(ds.metric_names[ds.num_metrics++], field->key, MAX_LABEL_LEN - 1);
                    }
                }
            }
        }
    } else {
        for (int m = 0; m < num_requested_metrics; m++) {
            snprintf(ds.metric_names[m], sizeof(ds.metric_names[m]), "%s", requested_metrics[m]);
        }
        ds.num_metrics = num_requested_metrics;
    }
    // Ordena nomes das metricas em ordem alfabetica
    for (int i = 0; i < ds.num_metrics - 1; i++) {
        for (int j = i + 1; j < ds.num_metrics; j++) {
            if (strcmp(ds.metric_names[i], ds.metric_names[j]) > 0) {
                char tmp[MAX_LABEL_LEN];
                strcpy(tmp, ds.metric_names[i]);
                strcpy(ds.metric_names[i], ds.metric_names[j]);
                strcpy(ds.metric_names[j], tmp);
            }
        }
    }

    printf("[INFO] Eixo X: '%s'\n", ds.x_key);
    printf("[INFO] %d metricas detectadas: ", ds.num_metrics);
    for (int m = 0; m < ds.num_metrics; m++) printf("%s%s", ds.metric_names[m], (m < ds.num_metrics - 1) ? ", " : "\n");

    for (size_t i = 0; i < total_records; i++) {
        JsonNode *rec = json_array_get(array_node, i);
        DataPoint *dp = &ds.points[i];

        if (strcmp(ds.x_key, "_index") == 0) {
            snprintf(dp->x_label, sizeof(dp->x_label), "#%zu", i + 1);
        } else {
            JsonNode *x_node = json_object_get(rec, ds.x_key);
            if (x_node) {
                if (x_node->type == JSON_STRING) {
                    strncpy(dp->x_label, x_node->value.str_val, sizeof(dp->x_label) - 1);
                } else if (x_node->type == JSON_NUMBER) {
                    if (floor(x_node->value.num_val) == x_node->value.num_val) {
                        snprintf(dp->x_label, sizeof(dp->x_label), "#%.0f", x_node->value.num_val);
                    } else {
                        snprintf(dp->x_label, sizeof(dp->x_label), "%.2f", x_node->value.num_val);
                    }
                }
            } else {
                snprintf(dp->x_label, sizeof(dp->x_label), "#%zu", i + 1);
            }
        }

        for (int m = 0; m < ds.num_metrics; m++) {
            JsonNode *val_node = json_object_get(rec, ds.metric_names[m]);
            if (val_node) {
                dp->values[m] = json_get_number(val_node, 0.0);
            } else {
                // Forward fill: maintain last known reading from previous point
                dp->values[m] = (i > 0) ? ds.points[i - 1].values[m] : 0.0;
            }
        }
    }

    // Backfill any metric that first appears after index 0
    for (int m = 0; m < ds.num_metrics; m++) {
        double first_valid = 0.0;
        int found = 0;
        for (size_t i = 0; i < total_records; i++) {
            JsonNode *rec = json_array_get(array_node, i);
            if (rec && json_object_get(rec, ds.metric_names[m])) {
                first_valid = ds.points[i].values[m];
                found = 1;
                break;
            }
        }
        if (found) {
            for (size_t i = 0; i < total_records; i++) {
                JsonNode *rec = json_array_get(array_node, i);
                if (rec && json_object_get(rec, ds.metric_names[m])) break;
                ds.points[i].values[m] = first_valid;
            }
        }
    }

    for (int m = 0; m < ds.num_metrics; m++) {
        compute_metric_stats(&ds, m);
    }
    } // Fim do bloco if (!is_csv && root)

    printf("\n+--------------------------------+----------+----------+----------+----------+\n");
    printf("| Sinal / Metrica                |   Minimo |   Maximo |    Media | Desv.Padr|\n");
    printf("+--------------------------------+----------+----------+----------+----------+\n");
    for (int m = 0; m < ds.num_metrics; m++) {
        MetricStats *st = &ds.stats[m];
        printf("| %-30.30s | %8.2f | %8.2f | %8.2f | %8.2f |\n",
               st->name, st->min, st->max, st->mean, st->stddev);
    }
    printf("+--------------------------------+----------+----------+----------+----------+\n");

    if (html_output) {
        export_interactive_html(&ds, html_output);
    }

    free(ds.points);
    if (root) json_free(root);
    free(file_content);

    printf("\n[CONCLUIDO] Executavel gerou com sucesso o arquivo '%s'!\n", html_output);
    return 0;
}
