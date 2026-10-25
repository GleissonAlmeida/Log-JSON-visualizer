# Leitor de Logs JSON e Plotador em Linguagem C (C99)

Este projeto implementa um leitor de logs JSON e plotador interativo completo em **Linguagem C pura (C99)** sem dependências externas obrigatórias (apenas a biblioteca padrão `libc` e `libm`).

## Estrutura do Código em C

- `main.c`: Ponto de entrada, leitura do arquivo, parsing dos argumentos CLI, cálculo de estatísticas (mínimo, máximo, média, mediana e desvio padrão), renderizador ASCII para terminal e gerador de gráfico interativo HTML5/Chart.js.
- `json_parser.h` e `json_parser.c`: Analisador sintático leve de JSON em C (suporta objetos, arrays, strings com escape, números de ponto flutuante e booleanos).
- `Makefile`: Script de automação para compilação com GCC / Clang.
- `sample_iot.json`: Exemplo de log com séries temporais de sensores.

---

## Como Compilar

### Linux / macOS (GCC ou Clang):
```bash
# Usando o Makefile:
make

# Ou compilando diretamente com gcc:
gcc -Wall -Wextra -O2 -std=c99 main.c json_parser.c -lm -o log_plotter
```

### Windows (MinGW ou MSYS2):
```bash
gcc -O2 main.c json_parser.c -lm -o log_plotter.exe
```

---

## Como Executar

### 1. Execução básica com arquivo padrão:
```bash
./log_plotter sample_iot.json
```

### 2. Escolhendo métricas específicas e eixo X:
```bash
./log_plotter sample_iot.json -x timestamp -m temperatura,umidade,pressao_hpa
```

### 3. Gerando o gráfico interativo HTML5 (Chart.js):
```bash
./log_plotter sample_iot.json --html meu_grafico.html
# Abra no navegador:
xdg-open meu_grafico.html   # Linux
open meu_grafico.html       # macOS
start meu_grafico.html      # Windows
```

### 4. Gerando script e dados para Gnuplot:
```bash
./log_plotter sample_iot.json --gnuplot
gnuplot grafico_c.gp
```
