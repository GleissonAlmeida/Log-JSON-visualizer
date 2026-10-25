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
    fprintf(fp, "    .axis-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid #334155; background: #070d19; cursor: pointer; }\n");
    fprintf(fp, "    .axis-badge.right { color: #38bdf8; border-color: #0369a1; background: #082f49; }\n");
    fprintf(fp, "  </style>\n</head>\n<body>\n");

    fprintf(fp, "  <div class=\"app-container\">\n");

    /* ================= PAINEL LATERAL ESQUERDO ================= */
    fprintf(fp, "    <div class=\"panel\">\n");

    /* 0. Carregar Arquivo JSON */
    fprintf(fp, "      <div style=\"background: #070d19; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;\">\n");
    fprintf(fp, "        <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;\">\n");
    fprintf(fp, "          <span class=\"title-sec\" style=\"margin-bottom: 0;\">ARQUIVO DE LOG JSON</span>\n");
    fprintf(fp, "          <span id=\"lblFileRecords\" style=\"font-size: 10px; color: #818cf8; font-family: 'JetBrains Mono';\">%d registros</span>\n", ds->num_points);
    fprintf(fp, "        </div>\n");
    fprintf(fp, "        <label style=\"display: flex; align-items: center; justify-content: center; gap: 8px; background: #4f46e5; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center; transition: background 0.15s;\">\n");
    fprintf(fp, "          <span>&#128194; Carregar Novo Log JSON</span>\n");
    fprintf(fp, "          <input type=\"file\" id=\"fileJsonUpload\" accept=\".json,.log,.txt\" style=\"display: none;\" onchange=\"loadNewJsonFile(event)\">\n");
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

    fprintf(fp, "        <input type=\"text\" id=\"txtFilter\" placeholder=\"Filtrar variáveis...\" oninput=\"filterMetricsList()\" style=\"margin-bottom: 8px; font-size: 11px; padding: 6px 10px;\">\n");

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
    fprintf(fp, "          <button class=\"btn-tool\" onclick=\"downloadPNG()\">&#128229; Salvar PNG</button>\n");
    fprintf(fp, "          <button class=\"btn-tool\" onclick=\"toggleFS()\">&#x26F6;</button>\n");
    fprintf(fp, "        </div>\n");
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
    fprintf(fp, "    let scaleMode = 'auto';\n\n");

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
    fprintf(fp, "          datasets.push({\n");
    fprintf(fp, "            label: key,\n");
    fprintf(fp, "            data: filtered.map(r => r[key]),\n");
    fprintf(fp, "            borderColor: cfg.color,\n");
    fprintf(fp, "            backgroundColor: (isArea ? cfg.color + '33' : (chartType === 'bar' ? cfg.color + '99' : cfg.color)),\n");
    fprintf(fp, "            borderWidth: 2.2,\n");
    fprintf(fp, "            tension: isStepped ? 0 : tension,\n");
    fprintf(fp, "            stepped: isStepped ? 'before' : false,\n");
    fprintf(fp, "            pointRadius: showPoints ? 3.5 : 0,\n");
    fprintf(fp, "            pointHoverRadius: 6,\n");
    fprintf(fp, "            pointBackgroundColor: cfg.color,\n");
    fprintf(fp, "            fill: isArea,\n");
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
    fprintf(fp, "        options: {\n");
    fprintf(fp, "          responsive: true,\n");
    fprintf(fp, "          maintainAspectRatio: false,\n");
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
    fprintf(fp, "    function toggleMetric(key) {\n");
    fprintf(fp, "      const chk = document.getElementById('chk_' + key);\n");
    fprintf(fp, "      document.getElementById('item_' + key).classList.toggle('selected', chk.checked);\n");
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
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function clearMetrics() {\n");
    fprintf(fp, "      for (const k in metricMeta) {\n");
    fprintf(fp, "        const chk = document.getElementById('chk_' + k);\n");
    fprintf(fp, "        if (chk) chk.checked = false;\n");
    fprintf(fp, "        const itm = document.getElementById('item_' + k);\n");
    fprintf(fp, "        if (itm) itm.classList.remove('selected');\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "      updateChart();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function filterMetricsList() {\n");
    fprintf(fp, "      const q = document.getElementById('txtFilter').value.toLowerCase();\n");
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
    fprintf(fp, "      if (chartInstance) {\n");
    fprintf(fp, "        const a = document.createElement('a');\n");
    fprintf(fp, "        a.href = chartInstance.toBase64Image();\n");
    fprintf(fp, "        a.download = 'grafico_log.png';\n");
    fprintf(fp, "        a.click();\n");
    fprintf(fp, "      }\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function toggleFS() {\n");
    fprintf(fp, "      const el = document.getElementById('chartBox');\n");
    fprintf(fp, "      if (!document.fullscreenElement) el.requestFullscreen();\n");
    fprintf(fp, "      else document.exitFullscreen();\n");
    fprintf(fp, "    }\n");

    fprintf(fp, "    function loadNewJsonFile(evt) {\n");
    fprintf(fp, "      const file = evt.target.files[0];\n");
    fprintf(fp, "      if (!file) return;\n");
    fprintf(fp, "      const reader = new FileReader();\n");
    fprintf(fp, "      reader.onload = function(e) {\n");
    fprintf(fp, "        try {\n");
    fprintf(fp, "          const parsed = JSON.parse(e.target.result);\n");
    fprintf(fp, "          const arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.logs || [parsed]);\n");
    fprintf(fp, "          if (!arr.length) return alert('JSON vazio');\n");
    fprintf(fp, "          const sample = arr[0];\n");
    fprintf(fp, "          const keys = Object.keys(sample);\n");
    fprintf(fp, "          let newX = keys.find(k => k.includes('time') || k.includes('date') || k === 'id') || keys[0];\n");
    fprintf(fp, "          const numKeys = keys.filter(k => k !== newX && typeof sample[k] === 'number');\n");
    fprintf(fp, "          rawData.length = 0;\n");
    fprintf(fp, "          for (let i = 0; i < arr.length; i++) {\n");
    fprintf(fp, "            const row = { _idx: i + 1, x: String(arr[i][newX] ?? i + 1) };\n");
    fprintf(fp, "            numKeys.forEach(k => row[k] = Number(arr[i][k]) || 0);\n");
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
    fprintf(fp, "            itm.innerHTML = `<label style=\"display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;\"><input type=\"checkbox\" id=\"chk_${k}\" ${idx < 3 ? 'checked' : ''} onchange=\"toggleMetric('${k}')\" style=\"accent-color:#4f46e5;\"><span class=\"dot\" style=\"background:${col}\"></span><div style=\"font-size:12px;font-weight:600;font-family:'JetBrains Mono';\">${k}</div></label><button class=\"axis-badge ${idx === 1 ? 'right' : ''}\" id=\"axis_${k}\" onclick=\"toggleAxis('${k}')\">${idx === 1 ? 'Eixo Dir (Y1)' : 'Eixo Esq (Y)'}</button>`;\n");
    fprintf(fp, "            listEl.appendChild(itm);\n");
    fprintf(fp, "          });\n");
    fprintf(fp, "          document.getElementById('lblFileRecords').innerText = `${arr.length} registros`;\n");
    fprintf(fp, "          const selX = document.getElementById('selectX');\n");
    fprintf(fp, "          selX.innerHTML = `<option value=\"${newX}\" selected>${newX}</option><option value=\"_index\"># Índice Sequencial</option>`;\n");
    fprintf(fp, "          resetRange();\n");
    fprintf(fp, "        } catch(err) { alert('Erro ao processar JSON: ' + err.message); }\n");
    fprintf(fp, "      };\n");
    fprintf(fp, "      reader.readAsText(file);\n");
    fprintf(fp, "    }\n\n");
    fprintf(fp, "    window.onload = function() { updateChart(); };\n");
    fprintf(fp, "  </script>\n</body>\n</html>\n");

    fclose(fp);
    printf("[SUCESSO] Grafico interativo gerado em C: '%s'\n", output_file);
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

    printf("========================================================\n");
    printf("   LogPlotter em Linguagem C (ANSI C99) - Windows 11\n");
    printf("========================================================\n");
    printf("[INFO] Arquivo: %s\n", input_filename);

    size_t file_size = 0;
    char *json_content = read_entire_file(input_filename, &file_size);
    if (!json_content) return 1;

    const char *error_ptr = NULL;
    JsonNode *root = json_parse(json_content, &error_ptr);
    if (!root) {
        fprintf(stderr, "[ERRO] Falha ao analisar JSON proximo a: %.40s\n", error_ptr ? error_ptr : "");
        free(json_content);
        return 1;
    }

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
        free(json_content);
        return 1;
    }

    size_t total_records = json_array_length(array_node);
    if (total_records == 0) {
        fprintf(stderr, "[ERRO] Array de registros esta vazio.\n");
        json_free(root);
        free(json_content);
        return 1;
    }

    Dataset ds;
    memset(&ds, 0, sizeof(Dataset));
    ds.num_points = (int)total_records;
    ds.points = (DataPoint*)malloc(ds.num_points * sizeof(DataPoint));

    JsonNode *sample_record = json_array_get(array_node, 0);
    if (sample_record && sample_record->type == JSON_OBJECT) {
        if (!x_key_param) {
            const char *candidates[] = { "timestamp", "horario", "time", "date", "minuto", "tempo", "id" };
            for (size_t c = 0; c < sizeof(candidates)/sizeof(candidates[0]); c++) {
                if (json_object_get(sample_record, candidates[c])) {
                    strncpy(ds.x_key, candidates[c], sizeof(ds.x_key) - 1);
                    break;
                }
            }
            if (strlen(ds.x_key) == 0) strncpy(ds.x_key, "_index", sizeof(ds.x_key) - 1);
        } else {
            strncpy(ds.x_key, x_key_param, sizeof(ds.x_key) - 1);
        }

        if (num_requested_metrics == 0) {
            for (size_t f = 0; f < sample_record->value.obj_val.count && ds.num_metrics < MAX_METRICS; f++) {
                JsonNode *field = sample_record->value.obj_val.fields[f];
                if (field->type == JSON_NUMBER && strcmp(field->key, ds.x_key) != 0) {
                    strncpy(ds.metric_names[ds.num_metrics++], field->key, MAX_LABEL_LEN - 1);
                }
            }
        } else {
            for (int m = 0; m < num_requested_metrics; m++) {
                strncpy(ds.metric_names[m], requested_metrics[m], MAX_LABEL_LEN - 1);
            }
            ds.num_metrics = num_requested_metrics;
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
                    snprintf(dp->x_label, sizeof(dp->x_label), "%.2f", x_node->value.num_val);
                }
            } else {
                snprintf(dp->x_label, sizeof(dp->x_label), "#%zu", i + 1);
            }
        }

        for (int m = 0; m < ds.num_metrics; m++) {
            JsonNode *val_node = json_object_get(rec, ds.metric_names[m]);
            dp->values[m] = json_get_number(val_node, 0.0);
        }
    }

    for (int m = 0; m < ds.num_metrics; m++) {
        compute_metric_stats(&ds, m);
    }

    if (html_output) {
        export_interactive_html(&ds, html_output);
    }

    free(ds.points);
    json_free(root);
    free(json_content);

    printf("\n[CONCLUIDO] Executavel gerou com sucesso o arquivo '%s'!\n", html_output);
    return 0;
}
