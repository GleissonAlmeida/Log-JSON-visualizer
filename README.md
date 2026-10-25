<div align="center">

# 📊 LogPlotter C &bull; JSON Data Log Visualizer

**Leitor de logs JSON de alta performance e plotador gráfico interativo desenvolvido em Linguagem C (ANSI C99) com exportação para Chart.js e binário nativo para Windows 11.**

[![Linguagem C](https://img.shields.io/badge/Language-C99-00599C?logo=c&logoColor=white)](https://en.wikipedia.org/wiki/C99)
[![Windows 11](https://img.shields.io/badge/Platform-Windows%2011%20%7C%20Linux-0078D4?logo=windows&logoColor=white)](https://microsoft.com/windows)
[![Chart.js](https://img.shields.io/badge/Graphics-Chart.js%20v4-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![Status](https://img.shields.io/badge/Build-Passing-brightgreen)](#compilação)
[![Licença](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

[Recursos](#-recursos-principais) &bull;
[Download Windows 11](#-download-do-executável-para-windows-11) &bull;
[Compilação](#-como-compilar-do-código-fonte) &bull;
[Uso & CLI](#-como-usar) &bull;
[Estrutura do Projeto](#-arquitetura-do-código) &bull;
[Formatos Suportados](#-formatos-de-log-json-aceitos)

</div>

---

## 🎯 Visão Geral

O **LogPlotter C** é uma solução completa para análise e visualização de dados de telemetria, logs de sensores IoT, métricas de servidores web e registros de performance armazenados em formato **JSON** ou **JSONL (JSON Lines)**.

O projeto une a eficiência de processamento e alocação dinâmica de memória em **Linguagem C pura** com a interatividade moderna do **Chart.js**, gerando dashboards gráficos responsivos e autônomos.

---

## ✨ Recursos Principais

### 📥 Ingestão e Leitura de Dados
- **Upload Direto no App**: suporte a arquivos `.json`, `.log`, `.ndjson` e `.txt`.
- **Desaninhamento Automático (*Object Flattening*)**: converte nós aninhados como `{"sensores": {"temperatura": 24.5}}` em chaves acessíveis `sensores.temperatura`.
- **Detecção Inteligente**: identifica automaticamente campos temporais (`timestamp`, `horario`, `data`, `time`) e variáveis numéricas para plotagem.

### 📈 Gráficos Interativos (Chart.js)
- **Eixo X Dinâmico**: selecione qualquer campo temporal ou utilize o índice sequencial numérico (`#1, #2, #3...`).
- **Múltiplas Séries Simultâneas**: plote quantas métricas desejar com paleta de cores de alto contraste.
- **Eixo Y Duplo (Left / Right)**: plote simultaneamente métricas de ordens de grandeza diferentes (ex.: temperatura a 25°C e pressão a 1013 hPa) sem distorção das curvas.
- **Ajuste da Escala do Eixo Y**:
  - Modo **Automático** ou **Manual** (com definição de valores mínimos e máximos para ambos os eixos).
  - Opção **Iniciar no zero (0)**.
  - Opção **Escala Logarítmica** para dados com picos extremos.
- **Estilos Gráficos**: alternância instantânea entre **Linha**, **Área preenchida**, **Barras** e **Degraus** (*Stepped lines*).
- **Filtro de Faixa Temporal**: barra de rolagem interativa (*range scrubber*) com atalhos para `100%`, `50%`, `25%` e `Últimos 30` registros.
- **Exportação**: download do gráfico gerado em imagem **PNG em alta resolução** e modo **Tela Cheia**.

---

## 🖥️ Layout da Interface
![description](https://github.com/GleissonAlmeida/Log-JSON-visualizer/blob/main/public/Tela.png)
```
---

## 📦 Download do Executável para Windows 11

Não é necessário instalar compiladores, Python ou Node.js para rodar no Windows 11:

| Arquivo | Descrição | Link |
| :--- | :--- | :--- |
| **`log_plotter.exe`** | Executável nativo x86-64 compilado estaticamente (~356 KB) | [Baixar .EXE](/log_plotter.exe) |
| **`log_plotter_windows11.zip`** | Pacote completo com executável, dados de teste e script `.bat` (~149 KB) | [Baixar .ZIP](/log_plotter_windows11.zip) |

### 🚀 Execução Rápida em 2 Cliques no Windows 11:
1. Baixe e extraia o pacote `log_plotter_windows11.zip`.
2. Dê um duplo clique no arquivo **`executar_no_windows.bat`**.
3. O programa processará o log, calculará as métricas em C e abrirá a interface interativa automaticamente no navegador padrão (**Microsoft Edge**, **Google Chrome**, etc.).

---

## 🛠️ Como Compilar do Código-Fonte

O código-fonte em C está no diretório `src/c_src/` e segue o padrão **ANSI C99**, necessitando apenas da biblioteca padrão (`libc` e `libm`).

### No Linux / macOS (GCC ou Clang):
```bash
# Clone ou acesse a pasta do código:
cd src/c_src

# Compilação via Makefile:
make

# Ou compilação manual direta:
gcc -Wall -Wextra -O2 -std=c99 main.c json_parser.c -lm -o log_plotter
```

### No Windows (Cross-compilação com MinGW-w64):
```bash
x86_64-w64-mingw32-gcc -Wall -Wextra -O2 -std=c99 -static main.c json_parser.c -lm -o log_plotter.exe
```

---

## 💻 Como Usar (Linha de Comando)

```bash
# Execução básica com log padrão:
./log_plotter sample_iot.json

# Definindo o Eixo X e selecionando métricas específicas:
./log_plotter seu_arquivo.json -x timestamp -m temperatura,umidade,pressao_hpa

# Especificando o nome do arquivo HTML de saída:
./log_plotter seu_arquivo.json --html relatorio_sensores.html
```

### Parâmetros Suportados:
- `-i <caminho>`: Caminho do arquivo JSON de entrada.
- `-x <campo>`: Nome da chave usada como referência horizontal (Eixo X).
- `-m <m1,m2,...>`: Lista separada por vírgulas das variáveis para o Eixo Y.
- `--html <saida.html>`: Nome do arquivo HTML autônomo gerado.

---

## 📂 Arquitetura do Código

```
├── src/
│   ├── c_src/                      # Código-fonte em Linguagem C
│   │   ├── main.c                  # Leitor de arquivos, pipeline CLI, gerador HTML e lógica
│   │   ├── json_parser.h           # Header do analisador sintático de JSON
│   │   ├── json_parser.c           # Implementação do parser JSON em C99 puro
│   │   ├── Makefile                # Script de compilação automatizada
│   │   ├── sample_iot.json         # Log de telemetria de exemplo
│   │   └── README.md               # Documentação técnica em C
│   │
│   ├── components/                 # Componentes React (Web App)
│   │   ├── ChartViewer.tsx         # Renderizador do gráfico Chart.js
│   │   ├── MetricSelector.tsx      # Painel de controles (Eixo X, estilos, escala Y, métricas)
│   │   └── JsonInputModal.tsx      # Modal de carregamento e colagem de logs JSON
│   │
│   ├── utils/
│   │   ├── jsonParser.ts           # Parser cliente com desaninhamento e estatísticas
│   │   └── cExecutionEngine.ts     # Emulador do pipeline de execução C
│   └── App.tsx                     # Orquestrador da interface do usuário
│
├── public/
│   ├── log_plotter.exe             # Binário compilado estático para Windows 11
│   ├── log_plotter_windows11.zip   # Pacote de distribuição pronto para Windows
│   ├── executar_no_windows.bat     # Script de inicialização em 2 cliques
│   └── sample_iot.json             # Dataset de demonstração
│
└── README.md                       # Esta documentação
```

---

## 📄 Formatos de Log JSON Aceitos

O analisador aceita automaticamente diversas estruturas de arquivos de log:

### 1. Array de Objetos JSON (Padrão):
```json
[
  { "timestamp": "08:00:00", "temperatura": 22.4, "pressao_hpa": 1013.2, "bateria_pct": 98.0 },
  { "timestamp": "08:01:00", "temperatura": 22.8, "pressao_hpa": 1013.1, "bateria_pct": 97.8 }
]
```

### 2. Objeto com Array Encapsulado:
```json
{
  "device": "ESP32-STATION",
  "data": [
    { "time": "12:00:00", "cpu": 45.2, "ram_mb": 1820 },
    { "time": "12:00:30", "cpu": 52.8, "ram_mb": 1845 }
  ]
}
```

### 3. Objetos Aninhados (Desaninhamento Automático):
```json
[
  {
    "timestamp": "2026-10-25T10:00:00Z",
    "sensores": {
      "temperatura": 26.5,
      "umidade": 54.0
    }
  }
]
```
*(As propriedades são convertidas automaticamente em `sensores.temperatura` e `sensores.umidade`)*.

---

## 📜 Licença

Distribuído sob a licença **Apache 2.0**. Consulte o arquivo de licença para mais informações.
