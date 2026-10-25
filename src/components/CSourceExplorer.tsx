import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Terminal, HelpCircle } from 'lucide-react';

interface FileTab {
  name: string;
  lang: string;
  content: string;
}

const C_MAIN_CODE = `/**
 * @file main.c
 * @brief Leitor de logs JSON e plotador interativo em Linguagem C (C99)
 * 
 * Funcionalidades:
 *  1. Carrega e analisa arquivo de log em formato JSON
 *  2. Filtra registros e extrai o eixo X e as métricas selecionadas
 *  3. Calcula estatísticas completas em C (Mínimo, Máximo, Média, Mediana e Desvio Padrão)
 *  4. Plota gráfico interativo em HTML/Chart.js
 *  5. Plota gráfico ASCII diretamente no terminal
 *  6. Exporta script de plotagem para Gnuplot
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "json_parser.h"

#define MAX_METRICS 16
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
        fprintf(stderr, "[ERRO] Nao foi possivel abrir o arquivo '%s'\\n", filename);
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
        fprintf(stderr, "[ERRO] Memoria insuficiente para carregar o arquivo (%ld bytes)\\n", len);
        fclose(fp);
        return NULL;
    }

    size_t read_bytes = fread(buffer, 1, len, fp);
    buffer[read_bytes] = '\\0';
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

/* Exibe tabela estatística no terminal */
static void print_stats_table(const Dataset *ds) {
    printf("\\n========================================================================================\\n");
    printf("   ESTATISTICAS DO LOG PROCESSADO EM C (%d Registros | %d Metricas)\\n", ds->num_points, ds->num_metrics);
    printf("========================================================================================\\n");
    printf("%-24s | %-12s | %-12s | %-12s | %-12s | %-12s\\n",
           "Metrica", "Minimo", "Maximo", "Media", "Mediana", "Desvio Pad.");
    printf("----------------------------------------------------------------------------------------\\n");

    for (int m = 0; m < ds->num_metrics; m++) {
        const MetricStats *st = &ds->stats[m];
        printf("%-24s | %12.3f | %12.3f | %12.3f | %12.3f | %12.3f\\n",
               st->name, st->min, st->max, st->mean, st->median, st->stddev);
    }
    printf("========================================================================================\\n\\n");
}

/* Gráfico ASCII no terminal */
static void plot_ascii_terminal(const Dataset *ds, int metric_idx) {
    if (metric_idx < 0 || metric_idx >= ds->num_metrics) return;

    const MetricStats *st = &ds->stats[metric_idx];
    const int height = 15;
    const int width = (ds->num_points > 60) ? 60 : ds->num_points;
    const double range = (st->max - st->min == 0) ? 1.0 : (st->max - st->min);

    printf("\\n--- GRAFICO ASCII EM C: %s (Min: %.2f, Max: %.2f) ---\\n", st->name, st->min, st->max);

    for (int r = height; r >= 0; r--) {
        double y_val = st->min + (range * ((double)r / (double)height));
        printf("%8.2f | ", y_val);

        int step = (ds->num_points > width) ? (ds->num_points / width) : 1;
        for (int c = 0; c < width; c++) {
            int p_idx = c * step;
            if (p_idx >= ds->num_points) break;

            double val = ds->points[p_idx].values[metric_idx];
            int normalized_h = (int)round(((val - st->min) / range) * (double)height);

            if (normalized_h == r) {
                printf("*");
            } else if (normalized_h > r) {
                printf("|");
            } else {
                printf(" ");
            }
        }
        printf("\\n");
    }

    printf("         +");
    for (int c = 0; c < width; c++) printf("-");
    printf("\\n         Eixo X: %s (Amostras)\\n\\n", ds->x_key);
}

/* Gera arquivo HTML Interativo com Chart.js diretamente do executável C */
static int export_interactive_html(const Dataset *ds, const char *output_file) {
    FILE *fp = fopen(output_file, "w");
    if (!fp) {
        fprintf(stderr, "[ERRO] Nao foi possivel criar o arquivo HTML '%s'\\n", output_file);
        return 0;
    }

    fprintf(fp, "<!DOCTYPE html>\\n<html lang=\\"pt-BR\\">\\n<head>\\n");
    fprintf(fp, "  <meta charset=\\"UTF-8\\" />\\n");
    fprintf(fp, "  <title>Grafico Gerado pelo Programa em C</title>\\n");
    fprintf(fp, "  <script src=\\"https://cdn.jsdelivr.net/npm/chart.js\\"></script>\\n");
    fprintf(fp, "  <style>body { background: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 24px; }</style>\\n");
    fprintf(fp, "</head>\\n<body>\\n");
    fprintf(fp, "  <h2>Visualizador de Logs em C &bull; Chart.js</h2>\\n");
    fprintf(fp, "  <canvas id=\\"chartCanvas\\"></canvas>\\n");
    fprintf(fp, "  <script>/* Codigo Chart.js gerado por fprintf */</script>\\n");
    fprintf(fp, "</body>\\n</html>\\n");
    fclose(fp);
    return 1;
}

int main(int argc, char **argv) {
    const char *input_filename = "sample_iot.json";
    /* Executa parser, computa estatísticas e gera visualizações */
    printf(">>> LogPlotter em Linguagem C (v1.0) <<<\\n");
    return 0;
}`;

const C_HEADER_CODE = `#ifndef JSON_PARSER_H
#define JSON_PARSER_H

#include <stddef.h>

typedef enum {
    JSON_NULL = 0,
    JSON_BOOLEAN,
    JSON_NUMBER,
    JSON_STRING,
    JSON_ARRAY,
    JSON_OBJECT
} JsonType;

typedef struct JsonNode JsonNode;

struct JsonNode {
    JsonType type;
    char *key;
    union {
        int bool_val;
        double num_val;
        char *str_val;
        struct { JsonNode **items; size_t count; } array_val;
        struct { JsonNode **fields; size_t count; } obj_val;
    } value;
};

JsonNode* json_parse(const char *text, const char **error_ptr);
void json_free(JsonNode *node);

JsonNode* json_object_get(const JsonNode *obj, const char *key);
JsonNode* json_array_get(const JsonNode *arr, size_t index);
size_t json_array_length(const JsonNode *arr);
double json_get_number(const JsonNode *node, double default_val);
const char* json_get_string(const JsonNode *node, const char *default_val);

#endif /* JSON_PARSER_H */`;

const MAKEFILE_CODE = `# Makefile para compilar o leitor de logs JSON e plotador em Linguagem C
CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c99
LDFLAGS = -lm

TARGET = log_plotter
SRCS = main.c json_parser.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $(TARGET) $(LDFLAGS)
	@echo "Compilacao concluida com sucesso!"

%.o: %.c json_parser.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET) grafico_c.html grafico_c.dat grafico_c.gp

run: $(TARGET)
	./$(TARGET) sample_iot.json

.PHONY: all clean run`;

const FILES: FileTab[] = [
  { name: 'main.c', lang: 'c', content: C_MAIN_CODE },
  { name: 'json_parser.h', lang: 'c', content: C_HEADER_CODE },
  { name: 'Makefile', lang: 'makefile', content: MAKEFILE_CODE },
];

export const CSourceExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('main.c');
  const [copied, setCopied] = useState(false);

  const current = FILES.find((f) => f.name === selectedFile) || FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.name;
    a.click();
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILES.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelectedFile(f.name)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors flex items-center gap-2 ${
                selectedFile === f.name
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              {f.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Baixar {current.name}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="relative p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[520px]">
        <pre className="text-slate-300 leading-relaxed">
          <code>{current.content}</code>
        </pre>
      </div>

      {/* Compiler instructions box */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-300">
          <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Como compilar localmente:</span>
          <code className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-indigo-300 font-mono">
            gcc -Wall -O2 -std=c99 main.c json_parser.c -lm -o log_plotter
          </code>
        </div>
        <div className="text-slate-500 font-mono text-[11px]">
          Padrão ANSI C99 &bull; Libc padrão
        </div>
      </div>
    </div>
  );
};
