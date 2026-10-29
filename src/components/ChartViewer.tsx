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
import { Download, Sliders, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Crosshair, Pin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  lightPointStyle?: 'white-core' | 'contrast' | 'dark' | 'custom';
  customPointColor?: string;
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
  lightPointStyle = 'white-core',
  customPointColor = '#4f46e5',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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

      // Cores e estilo dos pontos: adaptados com alto contraste para o tema claro
      let pointBg = baseColor;
      let pointBorder = '#ffffff';
      let pointBorderWidth = 1.5;
      let pointRadius = showPoints ? 3.5 : 0;
      let pointHoverBg = baseColor;
      let pointHoverBorder = '#ffffff';

      if (!isDark) {
        // No tema claro, estilização que garante máxima visibilidade contra o fundo branco
        switch (lightPointStyle) {
          case 'contrast':
            // Preenchido com a cor do sinal e anel grafite escuro
            pointBg = baseColor;
            pointBorder = '#0f172a';
            pointBorderWidth = 2;
            pointRadius = showPoints ? 4 : 0;
            pointHoverBg = '#0f172a';
            pointHoverBorder = baseColor;
            break;
          case 'dark':
            // Ponto grafite escuro com anel da cor do sinal
            pointBg = '#0f172a';
            pointBorder = baseColor;
            pointBorderWidth = 2;
            pointRadius = showPoints ? 4 : 0;
            pointHoverBg = baseColor;
            pointHoverBorder = '#0f172a';
            break;
          case 'custom':
            // Cor personalizada escolhida pelo usuário
            pointBg = customPointColor || '#4f46e5';
            pointBorder = '#0f172a';
            pointBorderWidth = 1.5;
            pointRadius = showPoints ? 4 : 0;
            pointHoverBg = baseColor;
            pointHoverBorder = customPointColor || '#4f46e5';
            break;
          case 'white-core':
          default:
            // Núcleo branco com borda na cor do sinal (estilo clássico de dashboard claro)
            pointBg = '#ffffff';
            pointBorder = baseColor;
            pointBorderWidth = 2.5;
            pointRadius = showPoints ? 4 : 0;
            pointHoverBg = baseColor;
            pointHoverBorder = '#ffffff';
            break;
        }
      }

      return {
        label: metric.label || metric.key,
        data,
        borderColor: baseColor,
        backgroundColor: isArea ? `${baseColor}25` : (chartType === 'bar' ? `${baseColor}90` : `${baseColor}25`),
        borderWidth: 2.2,
        tension: isStepped ? 0 : tension,
        stepped: isStepped ? ('before' as const) : false,
        pointRadius,
        pointHoverRadius: 6.5,
        pointBackgroundColor: pointBg,
        pointBorderColor: pointBorder,
        pointBorderWidth,
        pointHoverBackgroundColor: pointHoverBg,
        pointHoverBorderColor: pointHoverBorder,
        fill: isArea,
        spanGaps: true,
        yAxisID: dualAxis ? metric.yAxis : 'y',
      };
    });
  }, [
    selectedMetrics,
    filteredRecords,
    records,
    startIdx,
    chartType,
    tension,
    showPoints,
    fillArea,
    dualAxis,
    holdSparseTelemetry,
    isDark,
    lightPointStyle,
    customPointColor,
  ]);

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
    if (!cursorEnabled || activeIdx === null || filteredRecords.length === 0 || selectedMetrics.length === 0) {
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
          color: isDark ? '#cbd5e1' : '#334155',
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
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#e2e8f0' : '#334155',
        borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.9)',
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
          color: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.8)',
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
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
          color: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.8)',
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
        },
        title: {
          display: hasY1Axis || hasY2Axis,
          text: 'Eixo Y',
          color: isDark ? '#94a3b8' : '#334155',
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

    // Fundo idêntico ao tema atual da aplicação
    ctx.fillStyle = isDark ? '#090d16' : '#ffffff';
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
          if (isDark) {
            ctx.fillStyle = m.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#090d16';
            ctx.stroke();
          } else {
            // No tema claro, respeita o estilo dos pontos
            if (lightPointStyle === 'white-core') {
              ctx.fillStyle = '#ffffff';
              ctx.fill();
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = m.color;
              ctx.stroke();
            } else if (lightPointStyle === 'dark') {
              ctx.fillStyle = '#0f172a';
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = m.color;
              ctx.stroke();
            } else if (lightPointStyle === 'custom') {
              ctx.fillStyle = customPointColor || '#4f46e5';
              ctx.fill();
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = '#0f172a';
              ctx.stroke();
            } else {
              // contrast
              ctx.fillStyle = m.color;
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#0f172a';
              ctx.stroke();
            }
          }
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
        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = isDark ? 'rgba(10, 15, 29, 0.94)' : 'rgba(255, 255, 255, 0.97)';
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.strokeStyle = isPinned ? 'rgba(245, 158, 11, 0.7)' : (isDark ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.9)');
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Linha divisória interna do cabeçalho
        ctx.beginPath();
        ctx.moveTo(boxX + 8, boxY + headerHeight);
        ctx.lineTo(boxX + boxW - 8, boxY + headerHeight);
        ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Título do cabeçalho
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isPinned ? '#fbbf24' : (isDark ? '#a5b4fc' : '#4338ca');
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
          ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
          const maxKeyW = boxW - 90;
          ctx.fillText(mv.key, boxX + padX + 14, itemY, maxKeyW);

          // Valor numérico formatado
          ctx.textAlign = 'right';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col border rounded-xl overflow-hidden transition-all duration-200 ${
        isFullscreen
          ? isDark
            ? 'fixed inset-0 z-50 p-6 bg-slate-950 text-slate-100 border-slate-800'
            : 'fixed inset-0 z-50 p-6 bg-slate-100 text-slate-900 border-slate-300'
          : isDark
          ? 'w-full bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm'
          : 'w-full bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* Top Header of Chart Viewport */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b transition-colors duration-200 ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className={`text-xs font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              EIXO X: <span className="text-indigo-500 font-mono font-medium">{xAxisKey === '_index' ? 'Índice sequencial' : xAxisKey}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Mostrando {filteredRecords.length} de {records.length} registros (Ptos {startIdx + 1}–{endIdx + 1})
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick window zoom buttons */}
          <div
            className={`hidden sm:flex items-center gap-1 p-0.5 rounded-lg border text-xs ${
              isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={handleResetZoom}
              title="Ver todos os pontos"
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              100%
            </button>
            <button
              onClick={() => handleRangePreset(50)}
              title="Últimos 50%"
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              50%
            </button>
            <button
              onClick={() => handleRangePreset(25)}
              title="Últimos 25%"
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              25%
            </button>
            <button
              onClick={() => {
                const count = Math.min(30, records.length);
                onRangeChange([records.length - count, records.length - 1]);
              }}
              title="Últimos 30 registros"
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/60' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Últimos 30
            </button>
          </div>

          {/* Botão Cursor Eixo X */}
          <button
            onClick={toggleCursor}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              cursorEnabled
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : isDark
                ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700/60'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
            }`}
            title="Ativar/desativar cursor vertical do eixo X para inspecionar amostras"
          >
            <Crosshair className={`w-3.5 h-3.5 ${cursorEnabled ? 'text-white' : 'text-indigo-500'}`} />
            <span>Cursor Eixo X</span>
            {isPinned && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-mono font-bold">Fixado</span>}
          </button>

          <button
            onClick={handleExportPNG}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700/60'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
            }`}
            title="Exportar imagem PNG em alta resolução"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline">Salvar PNG</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border-slate-700/60'
                : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
            }`}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* HUD de Inspeção das Amostras no Cursor do Eixo X */}
      {cursorEnabled && activeIdx !== null && filteredRecords[activeIdx] && selectedMetrics.length > 0 && (
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs transition-colors duration-200 ${
            isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono font-medium ${
                isDark ? 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-indigo-500" />
              <span>Amostra: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{labels[activeIdx]}</strong></span>
              <span className={`text-[10px] ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>({startIdx + activeIdx + 1}/{records.length})</span>
            </div>

            {/* Fixar ou Liberar */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors border cursor-pointer ${
                isPinned
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900'
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border shadow-xs ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className={`text-[11px] font-mono truncate max-w-[130px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={m.key}>
                    {m.key}:
                  </span>
                  <span className={`text-xs font-mono font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {effective.value !== null
                      ? effective.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                      : 'N/D'}
                  </span>
                  {effective.isHeld && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                        isDark ? 'text-indigo-400 bg-indigo-950/70 border-indigo-800/50' : 'text-indigo-600 bg-indigo-50 border-indigo-200'
                      }`}
                      title="Valor mantido da última amostra válida recebida (Sample & Hold de Telemetria)"
                    >
                      hold
                    </span>
                  )}
                  {dualAxis && (
                    <span
                      className={`text-[9px] font-mono px-1 rounded border font-semibold ${
                        m.yAxis === 'y2'
                          ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                          : m.yAxis === 'y1'
                          ? 'text-sky-500 bg-sky-500/10 border-sky-500/30'
                          : isDark ? 'text-slate-400 bg-slate-800/70 border-slate-700/70' : 'text-slate-600 bg-slate-100 border-slate-200'
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
        {/* Gráfico Canvas sempre presente para manter a estrutura e grade */}
        {isBar ? (
          <Bar ref={chartRef} data={{ labels, datasets }} options={options} />
        ) : (
          <Line ref={chartRef} data={{ labels, datasets }} options={options} />
        )}

        {/* Overlay elegante quando o gráfico está vazio */}
        {selectedMetrics.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-6">
            <div
              className={`border rounded-xl px-7 py-5 flex flex-col items-center text-center shadow-xl backdrop-blur-md pointer-events-auto max-w-sm transition-colors duration-200 ${
                isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center mb-3 shadow-inner ${
                  isDark ? 'bg-indigo-950/80 border-indigo-700/60 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}
              >
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Gráfico Vazio</h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Nenhuma variável selecionada no momento. Marque os sinais desejados no painel à esquerda para plotar suas curvas.
              </p>
            </div>
          </div>
        )}

        {/* DOM Cursor Overlay: 100% reativo, sincronizado e sem travas */}
        {cursorEnabled && activeIdx !== null && cursorPos && selectedMetrics.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden z-20 select-none"
            aria-hidden="true"
          >
            {/* Linha Vertical Tracejada */}
            <div
              className={`absolute border-l transition-none ${
                isPinned ? 'border-amber-400' : 'border-indigo-500'
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
            {cursorPos.dots.map((dot, i) => {
              const dotBg = !isDark
                ? lightPointStyle === 'white-core'
                  ? '#ffffff'
                  : lightPointStyle === 'dark'
                  ? '#0f172a'
                  : lightPointStyle === 'custom'
                  ? customPointColor || '#4f46e5'
                  : dot.color
                : dot.color;
              const dotBorder = !isDark
                ? lightPointStyle === 'white-core' || lightPointStyle === 'dark'
                  ? dot.color
                  : '#0f172a'
                : '#020617';

              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg transition-none"
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${dot.y}px`,
                    width: isPinned ? 13 : 11,
                    height: isPinned ? 13 : 11,
                    backgroundColor: dotBg,
                    borderColor: dotBorder,
                  }}
                  title={`${dot.label}: ${dot.valFormatted}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Range Scrubber Timeline Bar */}
      <div
        className={`px-5 py-3 border-t transition-colors duration-200 ${
          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className={`flex items-center justify-between text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Filtro de Faixa Temporal:</span>
            <span className="font-mono text-indigo-500 tabular-nums font-semibold">
              Ponto {startIdx + 1} até {endIdx + 1} (Total: {endIdx - startIdx + 1} pontos)
            </span>
          </div>
          <button
            onClick={handleResetZoom}
            className={`flex items-center gap-1 transition-colors font-medium text-xs cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Redefinir
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono w-12 text-right ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Início:</span>
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
              className={`w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg ${
                isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
            <span className={`text-xs font-mono tabular-nums w-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{startIdx + 1}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono w-12 text-right ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Fim:</span>
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
              className={`w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg ${
                isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
            <span className={`text-xs font-mono tabular-nums w-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{endIdx + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
