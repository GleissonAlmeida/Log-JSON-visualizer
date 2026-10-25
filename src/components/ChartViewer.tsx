import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { MetricConfig, GlobalChartType, YAxisScaleConfig } from '../types/log';
import { Download, Sliders, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartViewerProps {
  records: Record<string, any>[];
  xAxisKey: string;
  selectedMetrics: MetricConfig[];
  chartType: GlobalChartType;
  tension: number;
  showPoints: boolean;
  fillArea: boolean;
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
  dualAxis: boolean;
  yAxisScale: YAxisScaleConfig;
  onToggleMetricAxis?: (key: string) => void;
}

export const ChartViewer: React.FC<ChartViewerProps> = ({
  records,
  xAxisKey,
  selectedMetrics,
  chartType,
  tension,
  showPoints,
  fillArea,
  range,
  onRangeChange,
  dualAxis,
  yAxisScale,
}) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Filter records based on active range
  const [startIdx, endIdx] = range;
  const filteredRecords = React.useMemo(() => {
    return records.slice(startIdx, endIdx + 1);
  }, [records, startIdx, endIdx]);

  // Generate X-Axis labels
  const labels = React.useMemo(() => {
    return filteredRecords.map((r, i) => {
      if (xAxisKey === '_index') return `#${startIdx + i + 1}`;
      const val = r[xAxisKey];
      if (val === undefined || val === null) return `#${startIdx + i + 1}`;
      return String(val);
    });
  }, [filteredRecords, xAxisKey, startIdx]);

  // Determine if we need right Y axis
  const hasRightAxis = dualAxis && selectedMetrics.some(m => m.yAxis === 'y1');
  const [forwardFill, setForwardFill] = React.useState(false);

  // Build datasets
  const datasets = React.useMemo(() => {
    return selectedMetrics.map(metric => {
      let lastKnownVal: number | null = null;
      const data = filteredRecords.map(r => {
        const val = r[metric.key];
        if (typeof val === 'number') {
          lastKnownVal = val;
          return val;
        }
        if (val !== undefined && val !== null) {
          const parsed = Number(val);
          if (!isNaN(parsed)) {
            lastKnownVal = parsed;
            return parsed;
          }
        }
        return forwardFill ? lastKnownVal : null;
      });

      const baseColor = metric.color;
      const isStepped = chartType === 'stepped' || forwardFill;

      return {
        label: metric.label || metric.key,
        data,
        borderColor: baseColor,
        backgroundColor: fillArea ? `${baseColor}25` : `${baseColor}90`,
        borderWidth: 2.2,
        tension: isStepped ? 0 : tension,
        stepped: isStepped ? ('before' as const) : false,
        pointRadius: showPoints ? 3.5 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        fill: fillArea,
        yAxisID: dualAxis ? metric.yAxis : 'y',
        spanGaps: true, // Crucial for sparse CAN telemetry logs!
      };
    });
  }, [selectedMetrics, filteredRecords, chartType, tension, showPoints, fillArea, dualAxis, forwardFill]);

  const options: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 350,
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#cbd5e1',
          font: {
            family: 'Plus Jakarta Sans',
            size: 12,
            weight: 600,
          },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(51, 65, 85, 0.8)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        bodyFont: {
          family: 'JetBrains Mono',
          size: 12,
        },
        titleFont: {
          family: 'Plus Jakarta Sans',
          size: 13,
          weight: 600,
        },
        callbacks: {
          title: (items: any) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const record = filteredRecords[idx];
            if (xAxisKey === '_index') return `Registro #${startIdx + idx + 1}`;
            if (xAxisKey === '#') return `Passo / Frame CAN #${record['#'] ?? (startIdx + idx)}`;
            return `${xAxisKey}: ${record[xAxisKey]}`;
          },
          label: (context: any) => {
            const val = context.parsed.y;
            if (val === null || val === undefined || isNaN(val)) {
              return ` ${context.dataset.label}: (sem transmissão neste tick)`;
            }
            const formatted = Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
            return ` ${context.dataset.label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.35)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 14,
        },
      },
      y: {
        type: yAxisScale.scaleType,
        display: true,
        position: 'left',
        beginAtZero: yAxisScale.beginAtZero,
        min: yAxisScale.mode === 'manual' && yAxisScale.minY !== '' ? Number(yAxisScale.minY) : undefined,
        max: yAxisScale.mode === 'manual' && yAxisScale.maxY !== '' ? Number(yAxisScale.maxY) : undefined,
        grid: {
          color: 'rgba(51, 65, 85, 0.35)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
        },
      },
      ...(hasRightAxis
        ? {
            y1: {
              type: yAxisScale.scaleType,
              display: true,
              position: 'right',
              beginAtZero: yAxisScale.beginAtZero,
              min: yAxisScale.mode === 'manual' && yAxisScale.minY1 !== '' ? Number(yAxisScale.minY1) : undefined,
              max: yAxisScale.mode === 'manual' && yAxisScale.maxY1 !== '' ? Number(yAxisScale.maxY1) : undefined,
              grid: {
                drawOnChartArea: false, // avoid overlapping grid lines
              },
              ticks: {
                color: '#38bdf8',
                font: {
                  family: 'JetBrains Mono',
                  size: 11,
                },
              },
            },
          }
        : {}),
    },
  };

  const handleExportPNG = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const a = document.createElement('a');
      a.href = url;
      a.download = `grafico_log_${xAxisKey}_${Date.now()}.png`;
      a.click();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Quick range jump presets
  const handleRangePreset = (percent: number) => {
    const count = Math.max(5, Math.floor(records.length * (percent / 100)));
    const start = Math.max(0, records.length - count);
    onRangeChange([start, records.length - 1]);
  };

  const handleResetZoom = () => {
    onRangeChange([0, records.length - 1]);
  };

  const isBar = chartType === 'bar';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-950' : 'w-full'
      }`}
    >
      {/* Top Header of Chart Viewport */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">
              EIXO X:{' '}
              <span className="text-indigo-400 font-mono">
                {xAxisKey === '_index' ? 'Índice sequencial' : xAxisKey === '#' ? 'Passo / Frame CAN (#)' : xAxisKey}
              </span>
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Mostrando {filteredRecords.length} de {records.length} registros (Ptos {startIdx + 1}–{endIdx + 1})
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* CAN Forward-Fill (Zero-Order Hold) toggle */}
          <button
            onClick={() => setForwardFill(!forwardFill)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              forwardFill
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700/60 hover:text-white hover:bg-slate-700'
            }`}
            title="Preenchimento CAN: mantém o último valor recebido para cobrir gaps em telemetrias multiplexadas"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${forwardFill ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Forward-Fill {forwardFill ? 'ON' : 'OFF'}</span>
          </button>

          {/* Quick window zoom buttons */}
          <div className="hidden sm:flex items-center gap-1 p-0.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={handleResetZoom}
              title="Ver todos os pontos"
              className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
            >
              100%
            </button>
            <button
              onClick={() => handleRangePreset(50)}
              title="Últimos 50%"
              className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
            >
              50%
            </button>
            <button
              onClick={() => handleRangePreset(25)}
              title="Últimos 25%"
              className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
            >
              25%
            </button>
            <button
              onClick={() => {
                const count = Math.min(30, records.length);
                onRangeChange([records.length - count, records.length - 1]);
              }}
              title="Últimos 30 registros"
              className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
            >
              Últimos 30
            </button>
          </div>

          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
            title="Exportar imagem PNG em alta resolução"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Salvar PNG</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className={`relative w-full p-4 ${isFullscreen ? 'flex-1 min-h-[500px]' : 'h-[440px] md:h-[480px]'}`}>
        {selectedMetrics.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Sliders className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nenhuma métrica selecionada</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Selecione uma ou mais variáveis no painel lateral à esquerda para plotar no gráfico interativo.
            </p>
          </div>
        ) : (
          isBar ? (
            <Bar ref={chartRef} data={{ labels, datasets }} options={options} />
          ) : (
            <Line ref={chartRef} data={{ labels, datasets }} options={options} />
          )
        )}
      </div>

      {/* Interactive Range Scrubber Timeline Bar */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Filtro de Faixa Temporal:</span>
            <span className="font-mono text-indigo-400 tabular-nums">
              Ponto {startIdx + 1} até {endIdx + 1} (Total: {endIdx - startIdx + 1} pontos)
            </span>
          </div>
          <button
            onClick={handleResetZoom}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors font-medium text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Redefinir
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 w-12 text-right">Início:</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, endIdx - 2)}
              value={startIdx}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < endIdx) {
                  onRangeChange([val, endIdx]);
                }
              }}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-xs font-mono text-slate-400 tabular-nums w-12">{startIdx + 1}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 w-12 text-right">Fim:</span>
            <input
              type="range"
              min={Math.min(records.length - 1, startIdx + 2)}
              max={records.length - 1}
              value={endIdx}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > startIdx) {
                  onRangeChange([startIdx, val]);
                }
              }}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-xs font-mono text-slate-400 tabular-nums w-12">{endIdx + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
