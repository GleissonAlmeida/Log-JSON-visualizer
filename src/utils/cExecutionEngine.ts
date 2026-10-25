/**
 * Emulador do Pipeline de Execução em Linguagem C (main.c + json_parser.c)
 * Executa a lógica idêntica à do código C99:
 *  - Leitura de buffer de memória (malloc/free)
 *  - Tokenização e árvore de nós JSON
 *  - Cálculo estatístico (média, mediana com qsort, mínimo, máximo, desvio padrão)
 *  - Geração de saída stdout com ASCII art e tabelas formatadas
 *  - Geração dos pontos de dados para Chart.js
 */

export interface CMetricStats {
  name: string;
  min: number;
  max: number;
  sum: number;
  mean: number;
  median: number;
  stddev: number;
  count: number;
}

export interface CDataPoint {
  xLabel: string;
  values: Record<string, number>;
}

export interface CExecutionOutput {
  stdout: string;
  points: CDataPoint[];
  stats: CMetricStats[];
  detectedXKey: string;
  availableMetrics: string[];
  selectedMetrics: string[];
  totalRecords: number;
  bytesAllocated: number;
  executionTimeMs: number;
}

export function executeCProgram(
  jsonString: string,
  xKeyParam?: string,
  requestedMetrics?: string[]
): CExecutionOutput {
  const startTime = performance.now();
  let stdout = '';

  const log = (msg: string) => {
    stdout += msg + '\n';
  };

  log('>>> LogPlotter em Linguagem C (C99 - stdlib + libm) <<<');
  log(`[INFO] Lendo buffer JSON de ${new Blob([jsonString]).size} bytes...`);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch {
    // NDJSON / JSON Lines support
    const lines = jsonString.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsedLines: any[] = [];
    for (const l of lines) {
      try {
        parsedLines.push(JSON.parse(l.endsWith(',') ? l.slice(0, -1) : l));
      } catch {
        // ignore malformed line
      }
    }
    if (parsedLines.length > 0) {
      parsed = parsedLines;
      log(`[INFO] Analisador NDJSON: ${parsedLines.length} linhas de telemetria processadas.`);
    } else {
      log(`[ERRO] Falha no json_parse(): sintaxe JSON invalida`);
      throw new Error('Falha no analisador JSON em C: verifique a sintaxe.');
    }
  }

  // Se o nó raiz for objeto com data/logs/records, pega o array
  let arrayNode: any[] = [];
  if (Array.isArray(parsed)) {
    arrayNode = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const candidateKeys = ['data', 'logs', 'records', 'items', 'telemetry'];
    const found = candidateKeys.find((k) => Array.isArray(parsed[k]));
    if (found) {
      arrayNode = parsed[found];
      log(`[INFO] Encontrado array de registros na chave raiz '${found}'`);
    } else {
      const anyArr = Object.values(parsed).find((v) => Array.isArray(v));
      if (anyArr) {
        arrayNode = anyArr as any[];
      } else {
        arrayNode = [parsed];
      }
    }
  }

  const totalRecords = arrayNode.length;
  const simulatedBytes = totalRecords * 144 + 8192; // sizeof(DataPoint) * n + malloc overhead
  log(`[MEMORIA] Alocando memória dinâmica: malloc(${simulatedBytes} bytes) para ${totalRecords} registros.`);

  if (totalRecords === 0) {
    log('[ERRO] Array de registros esta vazio.');
    return {
      stdout,
      points: [],
      stats: [],
      detectedXKey: '_index',
      availableMetrics: [],
      selectedMetrics: [],
      totalRecords: 0,
      bytesAllocated: 0,
      executionTimeMs: 1,
    };
  }

  // Detecta todas as chaves em todos os registros (suporte a telemetria multiplexada esparsa)
  const allKeysSet = new Set<string>();
  arrayNode.forEach(rec => {
    if (rec && typeof rec === 'object') {
      Object.keys(rec).forEach(k => allKeysSet.add(k));
    }
  });

  // Auto-detecta Eixo X (prioriza '#' como contador de quadros CAN)
  let xKey = xKeyParam;
  if (!xKey) {
    if (allKeysSet.has('#')) {
      xKey = '#';
    } else {
      const candidates = ['timestamp', 'horario', 'time', 'date', 'minuto', 'tempo', 'id', 'step', 'tick'];
      for (const c of candidates) {
        if (allKeysSet.has(c)) {
          xKey = c;
          break;
        }
      }
      if (!xKey) xKey = '_index';
    }
  }
  log(`[INFO] Eixo X definido como: '${xKey}'`);

  // Detecta métricas numéricas disponíveis em qualquer registro
  const numericKeysSet = new Set<string>();
  arrayNode.forEach(rec => {
    if (!rec || typeof rec !== 'object') return;
    Object.keys(rec).forEach(k => {
      if (k !== xKey && k !== '_index') {
        const val = rec[k];
        if (typeof val === 'number' || (!isNaN(Number(val)) && typeof val === 'string' && val.trim() !== '')) {
          numericKeysSet.add(k);
        }
      }
    });
  });
  const numericKeys = Array.from(numericKeysSet);

  // Ordena métricas preferindo sinais veiculares dinâmicos
  const highInterest = ['engine_speed', 'wheelbasedvehiclespeed', 'fa_speed', 'fuel_level', 'turret_angle', 'speed', 'torque', 'rpm'];
  numericKeys.sort((a, b) => {
    const aMatch = highInterest.some(h => a.toLowerCase().includes(h));
    const bMatch = highInterest.some(h => b.toLowerCase().includes(h));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return a.localeCompare(b);
  });

  // Métricas selecionadas
  let selected = requestedMetrics && requestedMetrics.length > 0 ? requestedMetrics : numericKeys.slice(0, 3);
  selected = selected.filter((k) => numericKeys.includes(k));
  if (selected.length === 0 && numericKeys.length > 0) {
    selected = [numericKeys[0]];
  }

  log(`[INFO] ${selected.length} metricas selecionadas para analise: ${selected.join(', ')}`);

  // Extrai pontos
  const points: CDataPoint[] = [];
  for (let i = 0; i < totalRecords; i++) {
    const item = arrayNode[i];
    let xLabel = `#${i + 1}`;
    if (xKey !== '_index' && item && item[xKey] !== undefined) {
      xLabel = String(item[xKey]);
    }

    const valObj: Record<string, number> = {};
    selected.forEach((m) => {
      const raw = item ? item[m] : 0;
      valObj[m] = typeof raw === 'number' ? raw : Number(raw) || 0;
    });

    points.push({ xLabel, values: valObj });
  }

  // Calcula estatísticas em C (compute_metric_stats)
  const stats: CMetricStats[] = [];
  selected.forEach((m) => {
    const vals = points.map((p) => p.values[m]);
    const count = vals.length;
    let min = vals[0] ?? 0;
    let max = vals[0] ?? 0;
    let sum = 0;

    vals.forEach((v) => {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    });

    const mean = sum / (count || 1);

    // Mediana com qsort simulado
    const sorted = [...vals].sort((a, b) => a - b);
    let median = 0;
    if (count > 0) {
      if (count % 2 !== 0) {
        median = sorted[Math.floor(count / 2)];
      } else {
        const mid = count / 2;
        median = (sorted[mid - 1] + sorted[mid]) / 2;
      }
    }

    // Desvio Padrão
    let varSum = 0;
    vals.forEach((v) => {
      const diff = v - mean;
      varSum += diff * diff;
    });
    const stddev = Math.sqrt(varSum / (count || 1));

    stats.push({
      name: m,
      min,
      max,
      sum,
      mean,
      median,
      stddev,
      count,
    });
  });

  // Gera Tabela Estatística no stdout
  log('\n========================================================================================');
  log(`   ESTATISTICAS DO LOG PROCESSADO EM C (${totalRecords} Registros | ${selected.length} Metricas)`);
  log('========================================================================================');
  log(
    'Metrica                  | Minimo       | Maximo       | Media        | Mediana      | Desvio Pad.'
  );
  log('----------------------------------------------------------------------------------------');
  stats.forEach((st) => {
    const namePadded = st.name.padEnd(24).substring(0, 24);
    const minS = st.min.toFixed(3).padStart(12);
    const maxS = st.max.toFixed(3).padStart(12);
    const meanS = st.mean.toFixed(3).padStart(12);
    const medS = st.median.toFixed(3).padStart(12);
    const stdS = st.stddev.toFixed(3).padStart(12);
    log(`${namePadded} | ${minS} | ${maxS} | ${meanS} | ${medS} | ${stdS}`);
  });
  log('========================================================================================\n');

  // Gera Gráfico ASCII no terminal para a primeira métrica selecionada
  if (stats.length > 0) {
    const primary = stats[0];
    const height = 12;
    const width = Math.min(50, totalRecords);
    const diff = primary.max - primary.min === 0 ? 1 : primary.max - primary.min;

    log(`--- GRAFICO ASCII EM C: ${primary.name} (Min: ${primary.min.toFixed(2)}, Max: ${primary.max.toFixed(2)}) ---`);

    for (let r = height; r >= 0; r--) {
      const yVal = primary.min + diff * (r / height);
      let line = `${yVal.toFixed(2).padStart(8)} | `;

      const step = totalRecords > width ? Math.floor(totalRecords / width) : 1;
      for (let c = 0; c < width; c++) {
        const pIdx = c * step;
        if (pIdx >= totalRecords) break;
        const val = points[pIdx].values[primary.name] || 0;
        const normalizedH = Math.round(((val - primary.min) / diff) * height);

        if (normalizedH === r) {
          line += '*';
        } else if (normalizedH > r) {
          line += '|';
        } else {
          line += ' ';
        }
      }
      log(line);
    }
    log('         +' + '-'.repeat(width));
    log(`         Eixo X: ${xKey} (Amostras sequenciais)`);
  }

  log('\n[SUCESSO] Pipeline C finalizado: export_interactive_html() -> Chart.js atualizado.');
  log('[SUCESSO] Script Gnuplot gerado: log_plot.gp e log_plot.dat');
  log(`[MEMORIA] Liberando recursos: free(points), json_free(root)... OK.`);

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    stdout,
    points,
    stats,
    detectedXKey: xKey,
    availableMetrics: numericKeys,
    selectedMetrics: selected,
    totalRecords,
    bytesAllocated: simulatedBytes,
    executionTimeMs,
  };
}
