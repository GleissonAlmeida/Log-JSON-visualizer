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
import { Download, Sliders, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Crosshair, Pin, Database, Sparkles, FolderOpen, ArrowRight } from 'lucide-react';
import { SAMPLE_DATASETS, SampleDataset } from '../data/sampleDatasets';

// Plugin para adicionar espaçamento vertical entre a legenda dos sinais e a área do gráfico,
// garantindo que a etiqueta (badge) do cursor não sobreponha os itens da legenda.
const legendSpacingPlugin = {
  id: 'legendSpacingPlugin',
  beforeInit(chart: any) {
    if (!chart.legend) return;
    const origFit = chart.legend.fit;
    chart.legend.fit = function () {
      origFit.bind(chart.legend)();
      this.height += 36; // Espaço de respiro para a etiqueta do cursor
    };
  },
};

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
  Filler,
  legendSpacingPlugin
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
  holdSparseTelemetry?: boolean;
  showCursor?: boolean;
  onToggleCursor?: () => void;
  onToggleMetricAxis?: (key: string) => void;
  onOpenLoadModal?: () => void;
  onSelectSample?: (sample: SampleDataset) => void;
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
  holdSparseTelemetry = true,
  showCursor,
  onToggleCursor,
  onOpenLoadModal,
  onSelectSample,
}) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartCanvasAreaRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
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
      if (xAxisKey === '#') return `#${val}`;
      return String(val);
    });
  }, [filteredRecords, xAxisKey, startIdx]);

  // Determine if we need right Y axes (Y1 and Y2)
  const hasY1Axis = dualAxis && selectedMetrics.some(m => m.yAxis === 'y1');
  const hasY2Axis = dualAxis && selectedMetrics.some(m => m.yAxis === 'y2');

  // Build datasets with spanGaps and forward-fill (Sample & Hold) for sparse/interleaved telemetry
  const datasets = React.useMemo(() => {
    return selectedMetrics.map(metric => {
      // Find initial non-null value for clean forward-fill
      let lastVal: number | null = null;
      if (holdSparseTelemetry) {
        // Look backwards before startIdx in raw records first
        for (let k = startIdx; k >= 0; k--) {
          const v = records[k]?.[metric.key];
          if (v !== undefined && v !== null && !isNaN(Number(v))) {
            lastVal = Number(v);
            break;
          }
        }
        // If not found in past, look forward
        if (lastVal === null) {
          const firstEntry = filteredRecords.find(r => {
            const v = r[metric.key];
            return v !== undefined && v !== null && !isNaN(Number(v));
          });
          if (firstEntry) lastVal = Number(firstEntry[metric.key]);
        }
      }

      const data = filteredRecords.map(r => {
        const val = r[metric.key];
        if (typeof val === 'number' && !isNaN(val)) {
          lastVal = val;
          return val;
        }
        if (val !== undefined && val !== null) {
          const parsed = Number(val);
          if (!isNaN(parsed)) {
            lastVal = parsed;
            return parsed;
          }
        }
        return holdSparseTelemetry ? lastVal : null;
      });

      const baseColor = metric.color;
      const isStepped = chartType === 'stepped';
      const isArea = chartType === 'area';

      return {
        label: metric.label || metric.key,
        data,
        borderColor: baseColor,
        backgroundColor: isArea ? `${baseColor}25` : (chartType === 'bar' ? `${baseColor}90` : `${baseColor}25`),
        borderWidth: 2.2,
        tension: isStepped ? 0 : tension,
        stepped: isStepped ? ('before' as const) : false,
        pointRadius: showPoints ? 3.5 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        fill: isArea,
        spanGaps: true,
        yAxisID: dualAxis ? metric.yAxis : 'y',
      };
    });
  }, [selectedMetrics, filteredRecords, records, startIdx, chartType, tension, showPoints, fillArea, dualAxis, holdSparseTelemetry]);

  // Função para obter o valor efetivo de uma métrica na amostra atual.
  // Quando a métrica não estiver presente na amostra e o 'Hold de Telemetria (CAN)' estiver ativo,
  // retorna o último valor válido recebido (Sample & Hold).
  const getMetricEffectiveValue = React.useCallback(
    (metricKey: string, idx: number): { value: number | null; isHeld: boolean } => {
      if (idx < 0 || idx >= filteredRecords.length) {
        return { value: null, isHeld: false };
      }
      const directVal = filteredRecords[idx]?.[metricKey];
      if (directVal !== undefined && directVal !== null && !isNaN(Number(directVal))) {
        return { value: Number(directVal), isHeld: false };
      }

      if (!holdSparseTelemetry) {
        return { value: null, isHeld: false };
      }

      // Procura o último valor válido anterior na janela filtrada
      for (let k = idx - 1; k >= 0; k--) {
        const v = filteredRecords[k]?.[metricKey];
        if (v !== undefined && v !== null && !isNaN(Number(v))) {
          return { value: Number(v), isHeld: true };
        }
      }

      // Se não encontrou na janela, procura no histórico anterior em records (antes do início do filtro)
      for (let k = startIdx - 1; k >= 0; k--) {
        const v = records[k]?.[metricKey];
        if (v !== undefined && v !== null && !isNaN(Number(v))) {
          return { value: Number(v), isHeld: true };
        }
      }

      // Caso o sinal comece mais adiante na janela
      for (let k = idx + 1; k < filteredRecords.length; k++) {
        const v = filteredRecords[k]?.[metricKey];
        if (v !== undefined && v !== null && !isNaN(Number(v))) {
          return { value: Number(v), isHeld: true };
        }
      }

      return { value: null, isHeld: false };
    },
    [filteredRecords, records, startIdx, holdSparseTelemetry]
  );
  const [internalCursorEnabled, setInternalCursorEnabled] = React.useState<boolean>(true);
  const cursorEnabled = showCursor !== undefined ? showCursor : internalCursorEnabled;
  const toggleCursor = () => {
    if (onToggleCursor) onToggleCursor();
    else setInternalCursorEnabled(!internalCursorEnabled);
  };
  const [cursorIndex, setCursorIndex] = React.useState<number | null>(null);
  const [isPinned, setIsPinned] = React.useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const activeIdx = React.useMemo(() => {
    if (!cursorEnabled || filteredRecords.length === 0) return null;
    if (cursorIndex !== null && cursorIndex >= 0 && cursorIndex < filteredRecords.length) {
      return cursorIndex;
    }
    return Math.floor(filteredRecords.length / 2);
  }, [cursorEnabled, cursorIndex, filteredRecords.length]);

  const updateCursorFromClientX = React.useCallback(
    (clientX: number) => {
      if (!cursorEnabled || filteredRecords.length === 0) return;
      const chart = chartRef.current;
      if (!chart || !chart.chartArea || !chart.canvas) return;
      const rect = chart.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const { left, right } = chart.chartArea;
      const clampedX = Math.max(left, Math.min(right, x));
      const ratio = (clampedX - left) / (right - left);
      const newIdx = Math.max(
        0,
        Math.min(filteredRecords.length - 1, Math.round(ratio * (filteredRecords.length - 1)))
      );
      setCursorIndex(newIdx);
    },
    [cursorEnabled, filteredRecords.length]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cursorEnabled) return;
    if (e.button === 0) {
      isDraggingRef.current = true;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      updateCursorFromClientX(e.clientX);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cursorEnabled) return;
    if (isPinned && !isDraggingRef.current) return;
    updateCursorFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cursorEnabled) return;
    if (pointerStartRef.current) {
      const dist = Math.hypot(e.clientX - pointerStartRef.current.x, e.clientY - pointerStartRef.current.y);
      if (dist > 6) return; // Arrastou, não inverte fixação
    }
    updateCursorFromClientX(e.clientX);
    setIsPinned((prev) => !prev);
  };

  // Posicionamento do cursor visual no DOM (garante sincronia total a 60fps sem delay de canvas)
  const [cursorPos, setCursorPos] = React.useState<{
    x: number;
    top: number;
    height: number;
    dots: { y: number; color: string; label: string; valFormatted: string }[];
  } | null>(null);

  const updateCursorOverlay = React.useCallback(() => {
    if (!cursorEnabled || activeIdx === null || filteredRecords.length === 0) {
      setCursorPos(null);
      return;
    }
    const chart = chartRef.current;
    if (!chart || !chart.chartArea || !chart.canvas) {
      setCursorPos(null);
      return;
    }
    const container = chartCanvasAreaRef.current;
    if (!container) return;

    const canvasRect = chart.canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const canvasOffsetLeft = canvasRect.left - containerRect.left;
    const canvasOffsetTop = canvasRect.top - containerRect.top;

    const { left, right, top, bottom } = chart.chartArea;

    let localX = 0;
    const meta0 = chart.getDatasetMeta(0);
    if (meta0 && meta0.data && meta0.data[activeIdx] && typeof meta0.data[activeIdx].x === 'number') {
      localX = meta0.data[activeIdx].x;
    } else if (chart.scales && chart.scales.x && typeof chart.scales.x.getPixelForValue === 'function') {
      localX = chart.scales.x.getPixelForValue(activeIdx);
    }
    if (!localX || isNaN(localX) || localX < left || localX > right) {
      const ratio = filteredRecords.length > 1 ? activeIdx / (filteredRecords.length - 1) : 0;
      localX = left + ratio * (right - left);
    }

    const dots: { y: number; color: string; label: string; valFormatted: string }[] = [];
    selectedMetrics.forEach((m, mIdx) => {
      let ptY: number | null = null;
      const meta = chart.getDatasetMeta(mIdx);
      if (meta && meta.data && meta.data[activeIdx] && typeof meta.data[activeIdx].y === 'number') {
        ptY = meta.data[activeIdx].y;
      } else {
        const scaleKey = dualAxis ? m.yAxis : 'y';
        const scale = chart.scales?.[scaleKey];
        const effective = getMetricEffectiveValue(m.key, activeIdx);
        if (scale && effective.value !== null) {
          const y = scale.getPixelForValue(effective.value);
          if (typeof y === 'number' && !isNaN(y)) {
            ptY = y;
          }
        }
      }

      if (ptY !== null && ptY >= top - 8 && ptY <= bottom + 8) {
        const effective = getMetricEffectiveValue(m.key, activeIdx);
        dots.push({
          y: canvasOffsetTop + ptY,
          color: m.color,
          label: m.key,
          valFormatted:
            effective.value !== null
              ? effective.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
              : 'N/D',
        });
      }
    });

    setCursorPos({
      x: canvasOffsetLeft + localX,
      top: canvasOffsetTop + top,
      height: bottom - top,
      dots,
    });
  }, [cursorEnabled, activeIdx, filteredRecords, selectedMetrics, dualAxis, getMetricEffectiveValue]);

  React.useEffect(() => {
    updateCursorOverlay();
    const frameId = requestAnimationFrame(updateCursorOverlay);
    const timer = setTimeout(updateCursorOverlay, 60);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [updateCursorOverlay, activeIdx, range]);

  React.useEffect(() => {
    const handleResize = () => updateCursorOverlay();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCursorOverlay]);

  // Navegação por teclado (Seta Esquerda / Seta Direita)
  React.useEffect(() => {
    if (!cursorEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.getAttribute('type') !== 'range'
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursorIndex((prev) => Math.max(0, (prev ?? 0) - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCursorIndex((prev) => Math.min(filteredRecords.length - 1, (prev ?? 0) + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cursorEnabled, filteredRecords.length]);

  const options: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: {
      padding: {
        top: 4,
        bottom: 4,
      },
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
            const xVal = xAxisKey === '_index' ? `Registro #${startIdx + idx + 1}` : `${xAxisKey}: ${record[xAxisKey]}`;
            return xVal;
          },
          label: (context: any) => {
            const val = context.parsed.y;
            const formatted = val !== null && val !== undefined ? Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : 'N/D';
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
        title: {
          display: hasY1Axis || hasY2Axis,
          text: 'Eixo Y',
          color: '#94a3b8',
          font: {
            family: 'JetBrains Mono',
            size: 10,
            weight: 'bold',
          },
        },
      },
      ...(hasY1Axis
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
              title: {
                display: true,
                text: 'Eixo Y1',
                color: '#38bdf8',
                font: {
                  family: 'JetBrains Mono',
                  size: 10,
                  weight: 'bold',
                },
              },
            },
          }
        : {}),
      ...(hasY2Axis
        ? {
            y2: {
              type: yAxisScale.scaleType,
              display: true,
              position: 'right',
              beginAtZero: yAxisScale.beginAtZero,
              min: yAxisScale.mode === 'manual' && yAxisScale.minY2 !== '' ? Number(yAxisScale.minY2) : undefined,
              max: yAxisScale.mode === 'manual' && yAxisScale.maxY2 !== '' ? Number(yAxisScale.maxY2) : undefined,
              grid: {
                drawOnChartArea: false, // avoid overlapping grid lines
              },
              ticks: {
                color: '#fbbf24',
                font: {
                  family: 'JetBrains Mono',
                  size: 11,
                },
              },
              title: {
                display: true,
                text: 'Eixo Y2',
                color: '#fbbf24',
                font: {
                  family: 'JetBrains Mono',
                  size: 10,
                  weight: 'bold',
                },
              },
            },
          }
        : {}),
    },
  };

  // Função utilitária para retângulos arredondados no Canvas de exportação
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  };

  const handleExportPNG = () => {
    const chart = chartRef.current;
    if (!chart || !chart.canvas) return;

    const srcCanvas = chart.canvas as HTMLCanvasElement;
    const dpr = chart.currentDevicePixelRatio || window.devicePixelRatio || 1;

    // Criar canvas de exportação com resolução nativa idêntica
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = srcCanvas.width;
    exportCanvas.height = srcCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Fundo escuro idêntico ao tema da aplicação (slate-950)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Desenhar o gráfico original do Chart.js
    ctx.drawImage(srcCanvas, 0, 0);

    // Se o cursor estiver ativo, desenhar a linha do cursor, badge da amostra, dots e os valores
    if (cursorEnabled && activeIdx !== null && chart.chartArea) {
      ctx.save();
      ctx.scale(dpr, dpr);

      const { left, right, top, bottom } = chart.chartArea;

      // Calcular posição X da amostra no canvas
      let x = 0;
      const meta0 = chart.getDatasetMeta(0);
      if (meta0 && meta0.data && meta0.data[activeIdx] && typeof meta0.data[activeIdx].x === 'number') {
        x = meta0.data[activeIdx].x;
      } else if (chart.scales && chart.scales.x && typeof chart.scales.x.getPixelForValue === 'function') {
        x = chart.scales.x.getPixelForValue(activeIdx);
      }
      if (!x || isNaN(x) || x < left || x > right) {
        const ratio = filteredRecords.length > 1 ? activeIdx / (filteredRecords.length - 1) : 0;
        x = left + ratio * (right - left);
      }

      // 1. Linha vertical tracejada do cursor
      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = isPinned ? 2.5 : 2;
      ctx.strokeStyle = isPinned ? '#f59e0b' : '#818cf8';
      ctx.moveTo(x, top - 6);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Badge da Amostra do Eixo X no topo
      const sampleLabel = labels[activeIdx] || `#${startIdx + activeIdx + 1}`;
      const badgeText = isPinned ? `${sampleLabel} (fixo)` : sampleLabel;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 16;
      const badgeH = 20;
      const badgeX = Math.max(left + 2, Math.min(right - badgeW - 2, x - badgeW / 2));
      const badgeY = top - 25;

      ctx.fillStyle = isPinned ? '#b45309' : '#4f46e5';
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
      ctx.fill();
      ctx.strokeStyle = isPinned ? '#f59e0b' : '#818cf8';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

      // 3. Dots nas curvas de dados e coleta dos valores dos sinais
      const metricValues: {
        key: string;
        color: string;
        valueStr: string;
        isHeld: boolean;
        y: number | null;
      }[] = [];

      selectedMetrics.forEach((m, mIdx) => {
        let ptY: number | null = null;
        const meta = chart.getDatasetMeta(mIdx);
        if (meta && meta.data && meta.data[activeIdx] && typeof meta.data[activeIdx].y === 'number') {
          ptY = meta.data[activeIdx].y;
        } else {
          const scaleKey = dualAxis ? m.yAxis : 'y';
          const scale = chart.scales?.[scaleKey];
          const effective = getMetricEffectiveValue(m.key, activeIdx);
          if (scale && effective.value !== null) {
            const calculatedY = scale.getPixelForValue(effective.value);
            if (typeof calculatedY === 'number' && !isNaN(calculatedY)) {
              ptY = calculatedY;
            }
          }
        }

        const effective = getMetricEffectiveValue(m.key, activeIdx);
        const valueStr =
          effective.value !== null
            ? effective.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
            : 'N/D';

        metricValues.push({
          key: m.key,
          color: m.color,
          valueStr,
          isHeld: effective.isHeld,
          y: ptY,
        });

        // Desenhar ponto na curva
        if (ptY !== null && ptY >= top - 6 && ptY <= bottom + 6) {
          ctx.beginPath();
          ctx.arc(x, ptY, isPinned ? 5.5 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = m.color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#090d16';
          ctx.stroke();
        }
      });

      // 4. Cartão Flutuante de Inspeção com os valores de cada métrica
      if (metricValues.length > 0) {
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        const lineHeight = 19;
        const padX = 12;
        const padY = 10;
        const headerHeight = 22;

        let maxTextW = ctx.measureText(`Amostra: ${sampleLabel}`).width;
        metricValues.forEach((mv) => {
          const lineStr = `${mv.key}: ${mv.valueStr}${mv.isHeld ? ' (hold)' : ''}`;
          const w = ctx.measureText(lineStr).width + 16;
          if (w > maxTextW) maxTextW = w;
        });

        const boxW = Math.max(160, Math.min(270, maxTextW + padX * 2));
        const boxH = headerHeight + metricValues.length * lineHeight + padY + 4;

        // Posicionar ao lado do cursor (invertendo se estiver próximo da borda direita)
        let boxX = x + 16;
        if (boxX + boxW > right - 8) {
          boxX = x - boxW - 16;
        }
        if (boxX < left + 8) {
          boxX = left + 8;
        }

        let boxY = top + 10;
        if (boxY + boxH > bottom - 8) {
          boxY = Math.max(top + 8, bottom - boxH - 8);
        }

        // Fundo do cartão
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = 'rgba(10, 15, 29, 0.94)';
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.strokeStyle = isPinned ? 'rgba(245, 158, 11, 0.7)' : 'rgba(99, 102, 241, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Linha divisória interna do cabeçalho
        ctx.beginPath();
        ctx.moveTo(boxX + 8, boxY + headerHeight);
        ctx.lineTo(boxX + boxW - 8, boxY + headerHeight);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Título do cabeçalho
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isPinned ? '#fbbf24' : '#a5b4fc';
        ctx.fillText(`Amostra: ${sampleLabel}`, boxX + padX, boxY + headerHeight / 2);

        // Posição no total
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText(
          `${startIdx + activeIdx + 1}/${records.length}`,
          boxX + boxW - padX,
          boxY + headerHeight / 2
        );

        // Lista de métricas e valores instantâneos
        metricValues.forEach((mv, idx) => {
          const itemY = boxY + headerHeight + padY / 2 + (idx + 0.5) * lineHeight;

          // Indicador circular da cor do sinal
          ctx.beginPath();
          ctx.arc(boxX + padX + 4, itemY, 4, 0, Math.PI * 2);
          ctx.fillStyle = mv.color;
          ctx.fill();

          // Nome do sinal
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.font = '10px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#94a3b8';
          const maxKeyW = boxW - 90;
          ctx.fillText(mv.key, boxX + padX + 14, itemY, maxKeyW);

          // Valor numérico formatado
          ctx.textAlign = 'right';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(mv.valueStr, boxX + boxW - padX, itemY);

          // Indicador [hold] se for Sample & Hold
          if (mv.isHeld) {
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.fillStyle = '#818cf8';
            ctx.fillText('[H]', boxX + boxW - padX - ctx.measureText(mv.valueStr).width - 6, itemY);
          }
        });
      }

      ctx.restore();
    }

    const url = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `grafico_log_${xAxisKey}_${Date.now()}.png`;
    a.click();
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

  // Empty state view: rendered when app is initialized or cleared without data
  if (records.length === 0) {
    return (
      <div className="flex flex-col gap-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 sm:p-7 shadow-sm">
        {/* Banner de Boas-Vindas & Inicialização Limpa */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-6 border-b border-slate-800/80">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400 shadow-inner shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">LogPlotter Iniciado</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                  Início Limpo (0 registros)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                O aplicativo foi iniciado sem nenhum dado carregado. Você pode importar seus próprios arquivos de telemetria (<span className="text-indigo-300 font-mono">.csv, .json, .log, .ndjson</span>) ou clicar diretamente em qualquer um dos <strong>{SAMPLE_DATASETS.length} exemplos prontos</strong> integrados abaixo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenLoadModal && (
              <button
                type="button"
                onClick={onOpenLoadModal}
                className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Carregar Meu Arquivo</span>
              </button>
            )}
          </div>
        </div>

        {/* Grade com Todos os Exemplos Integrados */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                Biblioteca de Exemplos Integrados ({SAMPLE_DATASETS.length} Conjuntos de Teste)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Clique para carregar e plotar imediatamente</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {SAMPLE_DATASETS.map((sample) => {
              const recordCount = sample.data ? sample.data.length : 0;
              return (
                <div
                  key={sample.id}
                  className="group relative flex flex-col justify-between bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/60 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-950/30 hover:bg-slate-950/90"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/70 border border-indigo-800/50 px-2 py-0.5 rounded-md">
                        {sample.badge}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {recordCount} reg
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-white transition-colors mb-1.5">
                      {sample.name}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-3">
                      {sample.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-850/80 mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {sample.id.includes('csv') ? 'Tabela CSV' : 'Série Temporal'}
                    </span>
                    {onSelectSample && (
                      <button
                        type="button"
                        onClick={() => onSelectSample(sample)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-600 border border-indigo-700/50 hover:border-indigo-500 rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        <span>Carregar</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé com Dicas de Formato */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/50 border border-slate-800/60 rounded-lg text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Formatos aceitos nativamente: <strong>.csv, .json, .ndjson, .log</strong></span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Detecção automática de colunas numéricas, eixos triplos Y/Y1/Y2 e sincronização temporal.
          </span>
        </div>
      </div>
    );
  }

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
              EIXO X: <span className="text-indigo-400 font-mono">{xAxisKey === '_index' ? 'Índice sequencial' : xAxisKey}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Mostrando {filteredRecords.length} de {records.length} registros (Ptos {startIdx + 1}–{endIdx + 1})
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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

          {/* Botão Cursor Eixo X */}
          <button
            onClick={toggleCursor}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              cursorEnabled
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700/60'
            }`}
            title="Ativar/desativar cursor vertical do eixo X para inspecionar amostras"
          >
            <Crosshair className={`w-3.5 h-3.5 ${cursorEnabled ? 'text-white' : 'text-indigo-400'}`} />
            <span>Cursor Eixo X</span>
            {isPinned && <span className="text-[10px] bg-amber-500/80 text-white px-1.5 py-0.2 rounded font-mono font-bold">Fixado</span>}
          </button>

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

      {/* HUD de Inspeção das Amostras no Cursor do Eixo X */}
      {cursorEnabled && activeIdx !== null && filteredRecords[activeIdx] && selectedMetrics.length > 0 && (
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-mono font-medium">
              <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
              <span>Amostra: <strong className="text-white">{labels[activeIdx]}</strong></span>
              <span className="text-indigo-400 text-[10px]">({startIdx + activeIdx + 1}/{records.length})</span>
            </div>


            {/* Fixar ou Liberar */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
                isPinned
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={isPinned ? 'Cursor fixado no ponto. Clique para liberar' : 'Clique no gráfico ou aqui para fixar o cursor'}
            >
              <Pin className="w-3 h-3" />
              <span>{isPinned ? 'Liberar Cursor' : 'Fixar Cursor'}</span>
            </button>
          </div>

          {/* Valores instantâneos de cada sinal na amostra (com suporte a Hold de Telemetria / Sample & Hold) */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedMetrics.map((m) => {
              const effective = getMetricEffectiveValue(m.key, activeIdx);
              return (
                <div
                  key={m.key}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 shadow-sm"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[130px]" title={m.key}>
                    {m.key}:
                  </span>
                  <span className="text-xs font-mono font-bold text-white tabular-nums">
                    {effective.value !== null
                      ? effective.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                      : 'N/D'}
                  </span>
                  {effective.isHeld && (
                    <span
                      className="text-[9px] font-mono px-1 py-0.2 rounded text-indigo-400 bg-indigo-950/70 border border-indigo-800/50"
                      title="Valor mantido da última amostra válida recebida (Sample & Hold de Telemetria)"
                    >
                      hold
                    </span>
                  )}
                  {dualAxis && (
                    <span
                      className={`text-[9px] font-mono px-1 rounded border font-semibold ${
                        m.yAxis === 'y2'
                          ? 'text-amber-400 bg-amber-950/70 border-amber-800/70'
                          : m.yAxis === 'y1'
                          ? 'text-sky-400 bg-sky-950/70 border-sky-800/70'
                          : 'text-slate-400 bg-slate-800/70 border-slate-700/70'
                      }`}
                    >
                      {m.yAxis === 'y2' ? 'Y2' : m.yAxis === 'y1' ? 'Y1' : 'Y'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        ref={chartCanvasAreaRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          isDraggingRef.current = false;
        }}
        onClick={handleContainerClick}
        style={{ cursor: cursorEnabled ? (isPinned ? 'pointer' : 'crosshair') : 'default' }}
        className={`relative w-full p-4 select-none ${
          isFullscreen ? 'flex-1 min-h-[500px]' : 'h-[440px] md:h-[480px]'
        }`}
      >
        {selectedMetrics.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Sliders className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nenhuma métrica selecionada</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Selecione uma ou mais variáveis no painel lateral à esquerda para plotar no gráfico interativo.
            </p>
          </div>
        ) : (
          <>
            {isBar ? (
              <Bar ref={chartRef} data={{ labels, datasets }} options={options} />
            ) : (
              <Line ref={chartRef} data={{ labels, datasets }} options={options} />
            )}

            {/* DOM Cursor Overlay: 100% reativo, sincronizado e sem travas */}
            {cursorEnabled && activeIdx !== null && cursorPos && (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden z-20 select-none"
                aria-hidden="true"
              >
                {/* Linha Vertical Tracejada */}
                <div
                  className={`absolute border-l transition-none ${
                    isPinned ? 'border-amber-400' : 'border-indigo-400'
                  }`}
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.top - 6}px`,
                    height: `${cursorPos.height + 6}px`,
                    borderLeftWidth: isPinned ? '2.5px' : '2px',
                    borderLeftStyle: 'dashed',
                    opacity: 0.95,
                    transform: 'translateX(-50%)',
                  }}
                />

                {/* Badge Superior com Identificação da Amostra do Eixo X no espaço entre a legenda e o gráfico */}
                <div
                  className={`absolute -translate-x-1/2 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-white shadow-xl whitespace-nowrap border flex items-center gap-1 transition-none ${
                    isPinned
                      ? 'bg-amber-600 border-amber-400 shadow-amber-950/60'
                      : 'bg-indigo-600 border-indigo-400 shadow-indigo-950/60'
                  }`}
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.top - 25}px`,
                  }}
                >
                  <span>{labels[activeIdx] || `#${startIdx + activeIdx + 1}`}</span>
                  {isPinned && (
                    <span className="text-[9px] opacity-80 font-sans font-normal ml-0.5">(fixo)</span>
                  )}
                </div>

                {/* Marcadores circulares sobre os dados no exato cruzamento (dots) */}
                {cursorPos.dots.map((dot, i) => (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 shadow-lg transition-none"
                    style={{
                      left: `${cursorPos.x}px`,
                      top: `${dot.y}px`,
                      width: isPinned ? 12 : 10,
                      height: isPinned ? 12 : 10,
                      backgroundColor: dot.color,
                    }}
                    title={`${dot.label}: ${dot.valFormatted}`}
                  />
                ))}
              </div>
            )}
          </>
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
