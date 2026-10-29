import React, { useState } from 'react';
import { FieldInfo, MetricConfig, GlobalChartType, YAxisScaleConfig, AxisID } from '../types/log';
import { PALETTE } from '../utils/jsonParser';
import { Check, Search, BarChart3, LineChart, Layers, HelpCircle, ArrowRightLeft, UploadCloud, FolderOpen, FileText, SlidersHorizontal, RotateCcw, ArrowDownAZ, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MetricSelectorProps {
  fields: FieldInfo[];
  xAxisKey: string;
  onXAxisChange: (key: string) => void;
  selectedMetrics: MetricConfig[];
  onToggleMetric: (key: string) => void;
  onMetricAxisChange: (key: string, axis: AxisID) => void;
  onSelectAllNumeric: () => void;
  onClearAllMetrics: () => void;
  chartType: GlobalChartType;
  onChartTypeChange: (type: GlobalChartType) => void;
  showPoints: boolean;
  onTogglePoints: () => void;
  fillArea: boolean;
  onToggleFill: () => void;
  dualAxis: boolean;
  onToggleDualAxis: () => void;
  yAxisScale: YAxisScaleConfig;
  onYAxisScaleChange: (scale: YAxisScaleConfig) => void;
  holdSparseTelemetry?: boolean;
  onToggleHoldSparseTelemetry?: () => void;
  showCursor?: boolean;
  onToggleCursor?: () => void;
  onOpenLoadModal?: () => void;
  onLoadFile?: (file: File) => void;
  datasetName?: string;
  totalRecords?: number;
  lightPointStyle?: 'white-core' | 'contrast' | 'dark' | 'custom';
  onChangeLightPointStyle?: (style: 'white-core' | 'contrast' | 'dark' | 'custom') => void;
  customPointColor?: string;
  onChangeCustomPointColor?: (color: string) => void;
  onMetricColorChange?: (key: string, newColor: string) => void;
}

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  fields,
  xAxisKey,
  onXAxisChange,
  selectedMetrics,
  onToggleMetric,
  onMetricAxisChange,
  onMetricColorChange,
  onSelectAllNumeric,
  onClearAllMetrics,
  chartType,
  onChartTypeChange,
  showPoints,
  onTogglePoints,
  lightPointStyle = 'white-core',
  onChangeLightPointStyle,
  customPointColor = '#4f46e5',
  onChangeCustomPointColor,
  fillArea,
  onToggleFill,
  dualAxis,
  onToggleDualAxis,
  yAxisScale,
  onYAxisScaleChange,
  holdSparseTelemetry = true,
  onToggleHoldSparseTelemetry,
  showCursor = true,
  onToggleCursor,
  onOpenLoadModal,
  onLoadFile,
  datasetName,
  totalRecords,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [sortSelectedFirst, setSortSelectedFirst] = useState(true);

  // Estados de colapso das seções para reduzir espaço vertical
  const [openSections, setOpenSections] = useState<{
    origin: boolean;
    xAxis: boolean;
    style: boolean;
    metrics: boolean;
  }>({
    origin: false, // Inicia recolhido para poupar espaço
    xAxis: false,  // Inicia recolhido para poupar espaço
    style: false,  // Inicia recolhido para poupar espaço
    metrics: true, // Aberto por padrão para acesso imediato aos sinais
  });

  const toggleSection = (section: 'origin' | 'xAxis' | 'style' | 'metrics') => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const allCollapsed = !openSections.origin && !openSections.xAxis && !openSections.style && !openSections.metrics;

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setOpenSections({ origin: true, xAxis: true, style: true, metrics: true });
    } else {
      setOpenSections({ origin: false, xAxis: false, style: false, metrics: false });
    }
  };

  const numericFields = fields.filter(f => f.isNumeric);
  const otherFields = fields.filter(f => !f.isNumeric);

  const isMetricSelected = (key: string) => selectedMetrics.some(m => m.key === key);
  const getMetricConfig = (key: string) => selectedMetrics.find(m => m.key === key);

  // Ordenação: primeiro os sinais selecionados, com classificação alfabética em cada grupo
  const sortedNumeric = React.useMemo(() => {
    return [...numericFields].sort((a, b) => {
      if (sortSelectedFirst) {
        const aSel = isMetricSelected(a.key);
        const bSel = isMetricSelected(b.key);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
      }
      return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [numericFields, selectedMetrics, sortSelectedFirst]);

  const filteredNumeric = sortedNumeric.filter(f =>
    f.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && onLoadFile) {
      onLoadFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`w-full max-w-[375px] md:w-[375px] flex flex-col gap-2.5 rounded-xl p-3 sm:p-3.5 border transition-colors duration-200 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
      style={{ width: '375px' }}
    >
      {/* Barra Superior de Ações do Painel Lateral */}
      <div
        className={`flex items-center justify-between pb-1 px-0.5 border-b transition-colors duration-200 ${
          isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-800'
        }`}
      >
        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
          Configurações
        </span>
        <button
          type="button"
          onClick={toggleCollapseAll}
          className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-slate-200 bg-slate-950/80 hover:bg-slate-800 border-slate-800'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
          }`}
          title={allCollapsed ? "Expandir todas as seções" : "Recolher todas as seções para economizar espaço"}
        >
          {allCollapsed ? (
            <>
              <ChevronsUpDown className="w-3 h-3 text-indigo-500" />
              <span>Expandir</span>
            </>
          ) : (
            <>
              <ChevronsDownUp className="w-3 h-3 text-indigo-500" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>

      {/* 0. Opção de Carregar o Log JSON ou CSV (Colapsável) */}
      <div
        className={`rounded-lg overflow-hidden border transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleSection('origin')}
          className={`w-full flex items-center justify-between p-2.5 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-100/70 text-slate-800'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            Origem dos Dados
          </span>
          <div className="flex items-center gap-1.5">
            {totalRecords !== undefined && (
              <span className="text-[10px] text-indigo-300 font-mono tabular-nums bg-indigo-950/70 border border-indigo-800/60 px-1.5 py-0.2 rounded">
                {totalRecords} reg
              </span>
            )}
            {openSections.origin ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.origin && (
          <div className={`p-2.5 pt-1 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
            {datasetName && (
              <div className={`text-xs font-mono truncate mb-2 mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={datasetName}>
                Arquivo: <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{datasetName}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {onOpenLoadModal && (
                <button
                  type="button"
                  onClick={onOpenLoadModal}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Carregar Arquivo</span>
                </button>
              )}

              <label
                title="Selecionar arquivo .csv, .json, .log direto do seu computador"
                className={`flex items-center justify-center p-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors shrink-0 ${
                  isDark
                    ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700'
                    : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border-slate-300 shadow-2xs'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                <input
                  type="file"
                  accept=".json,.log,.ndjson,.txt,.csv,application/json,text/csv,text/plain"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 1. X-Axis Configuration (Colapsável) */}
      <div
        className={`rounded-lg overflow-hidden border transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleSection('xAxis')}
          className={`w-full flex items-center justify-between p-2.5 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-100/70 text-slate-800'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            1. Eixo X
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono border px-1.5 py-0.2 rounded truncate max-w-[120px] ${
                isDark ? 'text-indigo-300 bg-indigo-950/70 border-indigo-800/60' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
              }`}
            >
              {xAxisKey === '_index' ? '# Índice' : (xAxisKey || 'Nenhum')}
            </span>
            {openSections.xAxis ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.xAxis && (
          <div className={`p-2.5 pt-1 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
            <select
              value={xAxisKey}
              onChange={(e) => onXAxisChange(e.target.value)}
              className={`w-full px-2.5 py-1.5 text-xs rounded-lg font-mono mt-1 border focus:outline-none focus:border-indigo-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="_index"># Índice Sequencial (1, 2, 3...)</option>
              <optgroup label="Campos de Data & Horário Detectados">
                {fields
                  .filter(f => f.isDateCandidate)
                  .map(f => (
                    <option key={f.key} value={f.key}>
                      {f.key} (Temporal)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Outros Campos Disponíveis">
                {fields
                  .filter(f => !f.isDateCandidate)
                  .map(f => (
                    <option key={f.key} value={f.key}>
                      {f.key} ({f.type})
                    </option>
                  ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Determina os rótulos do eixo horizontal do gráfico.
            </p>
          </div>
        )}
      </div>

      {/* 2. Visual Style & Chart Controls (Colapsável) */}
      <div
        className={`rounded-lg overflow-hidden border transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleSection('style')}
          className={`w-full flex items-center justify-between p-2.5 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-100/70 text-slate-800'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            2. Estilo do Gráfico
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono border px-1.5 py-0.2 rounded capitalize ${
                isDark ? 'text-indigo-300 bg-indigo-950/70 border-indigo-800/60' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
              }`}
            >
              {chartType === 'line' ? 'Linha' : chartType === 'area' ? 'Área' : chartType === 'bar' ? 'Barras' : 'Degraus'}
            </span>
            {dualAxis && (
              <span
                className={`text-[10px] font-mono border px-1 py-0.2 rounded ${
                  isDark ? 'text-sky-400 bg-sky-950/70 border-sky-800/60' : 'text-sky-700 bg-sky-50 border-sky-200'
                }`}
              >
                Triplo Y
              </span>
            )}
            {openSections.style ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.style && (
          <div className={`p-2.5 pt-1 border-t flex flex-col gap-2.5 ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
        
        {/* Chart type tabs */}
        <div
          className={`grid grid-cols-4 gap-1 p-1 rounded-lg text-xs mb-3 border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/70 border-slate-300'
          }`}
        >
          <button
            type="button"
            onClick={() => onChartTypeChange('line')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-indigo-600 text-white shadow-xs'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            Linha
          </button>
          <button
            type="button"
            onClick={() => onChartTypeChange('area')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'area'
                ? 'bg-indigo-600 text-white shadow-xs'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Área
          </button>
          <button
            type="button"
            onClick={() => onChartTypeChange('bar')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Barras
          </button>
          <button
            type="button"
            onClick={() => onChartTypeChange('stepped')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'stepped'
                ? 'bg-indigo-600 text-white shadow-xs'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Degraus
          </button>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label
            className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
              isDark
                ? 'text-slate-300 bg-slate-950/70 border-slate-800 hover:border-slate-700'
                : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <input
              type="checkbox"
              checked={showPoints}
              onChange={onTogglePoints}
              className="accent-indigo-500 rounded"
            />
            <span>Pontos no gráfico</span>
          </label>

          <label
            className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
              isDark
                ? 'text-slate-300 bg-slate-950/70 border-slate-800 hover:border-slate-700'
                : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <input
              type="checkbox"
              checked={dualAxis}
              onChange={onToggleDualAxis}
              className="accent-indigo-500 rounded"
            />
            <span>Eixos Y múltiplos (Y, Y1, Y2)</span>
          </label>

          {onToggleHoldSparseTelemetry && (
            <label
              className={`col-span-2 flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-300 bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
              title="Zero-Order Hold: mantém o último valor conhecido para sinais de CAN bus ou sensores assíncronos/esparsos"
            >
              <input
                type="checkbox"
                checked={holdSparseTelemetry}
                onChange={onToggleHoldSparseTelemetry}
                className="accent-indigo-500 rounded"
              />
              <span className="flex items-center justify-between flex-1">
                <span>Hold de Telemetria (CAN)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                    isDark
                      ? 'text-indigo-400 bg-indigo-950/90 border-indigo-800/60'
                      : 'text-indigo-700 bg-indigo-50 border-indigo-200 font-medium'
                  }`}
                >
                  Sample &amp; Hold
                </span>
              </span>
            </label>
          )}

          {onToggleCursor && (
            <label
              className={`col-span-2 flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-300 bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
              title="Exibe um cursor vertical no eixo X com painel de inspeção de valores instantâneos das amostras"
            >
              <input
                type="checkbox"
                checked={showCursor}
                onChange={onToggleCursor}
                className="accent-indigo-500 rounded"
              />
              <span className="flex items-center justify-between flex-1">
                <span>Cursor Eixo X (Amostras)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                    isDark
                      ? 'text-indigo-400 bg-indigo-950/90 border-indigo-800/60'
                      : 'text-indigo-700 bg-indigo-50 border-indigo-200 font-medium'
                  }`}
                >
                  Inspeção
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Configuração da Cor e Estilo dos Pontos (Tema Claro) */}
        {showPoints && (
          <div
            className={`p-2.5 rounded-lg border flex flex-col gap-2 transition-all ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-xs" />
                Cor dos Pontos (Tema Claro)
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-medium ${
                  !isDark
                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                    : 'text-slate-400 bg-slate-900 border-slate-700'
                }`}
              >
                {!isDark ? 'Ativo no Gráfico' : 'Tema Claro'}
              </span>
            </div>

            {/* 4 Estilos Rápidos de Cores dos Pontos */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => onChangeLightPointStyle && onChangeLightPointStyle('white-core')}
                className={`flex items-center gap-1.5 p-1.5 rounded-md border text-left transition-all cursor-pointer ${
                  lightPointStyle === 'white-core'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Núcleo branco com borda na cor do sinal: estilo moderno, leve e de alto contraste no fundo claro"
              >
                <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-white shrink-0 shadow-2xs" />
                <span className="truncate font-medium">Núcleo Branco</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeLightPointStyle && onChangeLightPointStyle('contrast')}
                className={`flex items-center gap-1.5 p-1.5 rounded-md border text-left transition-all cursor-pointer ${
                  lightPointStyle === 'contrast'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Cor do sinal com anel escuro para contraste firme"
              >
                <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-indigo-500 shrink-0 shadow-2xs" />
                <span className="truncate font-medium">Borda Escura</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeLightPointStyle && onChangeLightPointStyle('dark')}
                className={`flex items-center gap-1.5 p-1.5 rounded-md border text-left transition-all cursor-pointer ${
                  lightPointStyle === 'dark'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Ponto escuro/grafite com borda fina na cor do sinal"
              >
                <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-slate-900 shrink-0 shadow-2xs" />
                <span className="truncate font-medium">Grafite / Dark</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeLightPointStyle && onChangeLightPointStyle('custom')}
                className={`flex items-center gap-1.5 p-1.5 rounded-md border text-left transition-all cursor-pointer ${
                  lightPointStyle === 'custom'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Definir uma cor específica para todos os pontos no tema claro"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0 shadow-2xs"
                  style={{ backgroundColor: customPointColor || '#4f46e5' }}
                />
                <span className="truncate font-medium">Personalizada</span>
              </button>
            </div>

            {/* Paleta rápida de cores quando 'custom' estiver ativo */}
            {lightPointStyle === 'custom' && (
              <div className={`flex items-center justify-between pt-1.5 border-t text-[11px] ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Selecione a cor:
                </span>
                <div className="flex items-center gap-1.5">
                  {['#4f46e5', '#0f172a', '#dc2626', '#059669', '#d97706', '#ec4899', '#0891b2'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChangeCustomPointColor && onChangeCustomPointColor(c)}
                      className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                        customPointColor === c
                          ? 'scale-125 ring-2 ring-indigo-500 border-white shadow-xs'
                          : 'border-slate-300 hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                      title={`Cor ${c}`}
                    />
                  ))}
                  <label
                    className="relative w-4 h-4 rounded-full border border-slate-300 cursor-pointer overflow-hidden ml-0.5 hover:scale-110 shadow-2xs"
                    title="Escolher qualquer cor hexadecimal personalizada"
                  >
                    <input
                      type="color"
                      value={customPointColor || '#4f46e5'}
                      onChange={(e) => onChangeCustomPointColor && onChangeCustomPointColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ajuste da Escala do Eixo Y */}
        <div className={`mt-3 pt-3 border-t flex flex-col gap-2.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              Escala do Eixo Y
            </span>

            <div
              className={`flex items-center gap-1 p-0.5 rounded-md border text-[11px] ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/70 border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onYAxisScaleChange({ ...yAxisScale, mode: 'auto' })}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  yAxisScale.mode === 'auto'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => onYAxisScaleChange({ ...yAxisScale, mode: 'manual' })}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  yAxisScale.mode === 'manual'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Opções de Escala */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label
              className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-300 bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <input
                type="checkbox"
                checked={yAxisScale.beginAtZero}
                onChange={(e) => onYAxisScaleChange({ ...yAxisScale, beginAtZero: e.target.checked })}
                className="accent-indigo-500 rounded"
              />
              <span>Iniciar no zero (0)</span>
            </label>

            <label
              className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-300 bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <input
                type="checkbox"
                checked={yAxisScale.scaleType === 'logarithmic'}
                onChange={(e) => onYAxisScaleChange({ ...yAxisScale, scaleType: e.target.checked ? 'logarithmic' : 'linear' })}
                className="accent-indigo-500 rounded"
              />
              <span>Escala Log</span>
            </label>
          </div>

          {/* Inputs de Mínimo e Máximo Manual */}
          {yAxisScale.mode === 'manual' && (
            <div
              className={`rounded-lg p-2.5 flex flex-col gap-2 border ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Limites do Eixo Y (Esquerdo):</span>
                <button
                  type="button"
                  onClick={() => onYAxisScaleChange({ ...yAxisScale, minY: '', maxY: '' })}
                  className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-600 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Redefinir
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mínimo (Y)</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    value={yAxisScale.minY}
                    onChange={(e) => onYAxisScaleChange({ ...yAxisScale, minY: e.target.value === '' ? '' : Number(e.target.value) })}
                    className={`w-[120px] px-2 py-1 text-xs rounded font-mono border focus:outline-none focus:border-indigo-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    style={{ width: '120px' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Máximo (Y)</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    value={yAxisScale.maxY}
                    onChange={(e) => onYAxisScaleChange({ ...yAxisScale, maxY: e.target.value === '' ? '' : Number(e.target.value) })}
                    className={`w-[120px] px-2 py-1 text-xs rounded font-mono border focus:outline-none focus:border-indigo-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    style={{ width: '120px' }}
                  />
                </div>
              </div>

              {/* Se Eixo Múltiplo estiver ativo, limites para Y1 */}
              {dualAxis && (
                <div className={`pt-2 border-t mt-1 flex flex-col gap-1.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between text-[11px] font-semibold font-mono text-sky-500">
                    <span>Limites do Eixo Y1 (Direito 1):</span>
                    <button
                      type="button"
                      onClick={() => onYAxisScaleChange({ ...yAxisScale, minY1: '', maxY1: '' })}
                      className="flex items-center gap-1 text-[10px] text-sky-500 hover:text-sky-600 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Redefinir
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mínimo (Y1)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={yAxisScale.minY1}
                        onChange={(e) => onYAxisScaleChange({ ...yAxisScale, minY1: e.target.value === '' ? '' : Number(e.target.value) })}
                        className={`w-[120px] px-2 py-1 text-xs rounded font-mono border focus:outline-none focus:border-sky-500 ${
                          isDark ? 'bg-slate-900 border-slate-700 text-sky-300' : 'bg-slate-50 border-slate-300 text-sky-700'
                        }`}
                        style={{ width: '120px' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Máximo (Y1)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={yAxisScale.maxY1}
                        onChange={(e) => onYAxisScaleChange({ ...yAxisScale, maxY1: e.target.value === '' ? '' : Number(e.target.value) })}
                        className={`w-[120px] px-2 py-1 text-xs rounded font-mono border focus:outline-none focus:border-sky-500 ${
                          isDark ? 'bg-slate-900 border-slate-700 text-sky-300' : 'bg-slate-50 border-slate-300 text-sky-700'
                        }`}
                        style={{ width: '120px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Se Eixo Múltiplo estiver ativo, limites para Y2 */}
              {dualAxis && (
                <div className={`pt-2 border-t mt-1 flex flex-col gap-1.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between text-[11px] font-semibold font-mono text-amber-500">
                    <span>Limites do Eixo Y2 (Direito 2):</span>
                    <button
                      type="button"
                      onClick={() => onYAxisScaleChange({ ...yAxisScale, minY2: '', maxY2: '' })}
                      className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-600 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Redefinir
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mínimo (Y2)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={yAxisScale.minY2}
                        onChange={(e) => onYAxisScaleChange({ ...yAxisScale, minY2: e.target.value === '' ? '' : Number(e.target.value) })}
                        className={`w-[120px] px-2 py-1 text-xs rounded font-mono border focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-900 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-700'
                        }`}
                        style={{ width: '120px' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Máximo (Y2)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={yAxisScale.maxY2}
                        onChange={(e) => onYAxisScaleChange({ ...yAxisScale, maxY2: e.target.value === '' ? '' : Number(e.target.value) })}
                        className={`w-[120px] px-2 py-1 text-xs rounded font-mono border focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-900 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-700'
                        }`}
                        style={{ width: '120px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}
  </div>

      {/* 3. Y-Axis Metrics Selector (Colapsável) */}
      <div
        className={`rounded-lg overflow-hidden border transition-all flex flex-col min-h-0 ${
          isDark ? 'bg-slate-950/70 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleSection('metrics')}
          className={`w-full flex items-center justify-between p-2.5 transition-colors cursor-pointer text-left ${
            isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-100/70 text-slate-800'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Check className="w-3.5 h-3.5 text-indigo-500" />
            3. Variáveis Selecionadas
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono border px-1.5 py-0.2 rounded font-semibold ${
                isDark ? 'text-indigo-300 bg-indigo-950/70 border-indigo-800/60' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
              }`}
            >
              {selectedMetrics.length}/{numericFields.length}
            </span>
            {openSections.metrics ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.metrics && (
          <div className={`p-2.5 pt-1 border-t flex flex-col ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2 mt-1">
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Ativar / desativar sinais:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSelectAllNumeric}
                  className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
                >
                  Todas
                </button>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                <button
                  type="button"
                  onClick={onClearAllMetrics}
                  className={`text-xs transition-colors cursor-pointer ${
                    isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Limpar
                </button>
              </div>
            </div>

        {/* Barra de Busca e Ordenação */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar variáveis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-indigo-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => setSortSelectedFirst(!sortSelectedFirst)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-mono transition-all shrink-0 cursor-pointer ${
              sortSelectedFirst
                ? isDark
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80 shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                : isDark
                  ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900 shadow-2xs'
            }`}
            title={sortSelectedFirst ? 'Ordenação: Selecionados primeiro, depois A-Z' : 'Ordenação: Apenas alfabética A-Z'}
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-medium hidden sm:inline">
              {sortSelectedFirst ? 'Selecionados 1º' : 'A-Z Geral'}
            </span>
          </button>
        </div>

        {/* List of numeric fields */}
        <div className="flex flex-col gap-1.5 max-h-[290px] overflow-y-auto pr-1">
          {numericFields.length === 0 ? (
            <div className="text-center py-6 px-3 flex flex-col items-center gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                Nenhum dado carregado
              </span>
              <p className="text-[11px] text-slate-500 leading-tight">
                Importe um log ou selecione um dos exemplos prontos para exibir os sinais aqui.
              </p>
              {onOpenLoadModal && (
                <button
                  type="button"
                  onClick={onOpenLoadModal}
                  className={`mt-1 px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                    isDark
                      ? 'text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/60'
                      : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-300'
                  }`}
                >
                  Carregar / Exemplos
                </button>
              )}
            </div>
          ) : filteredNumeric.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              Nenhuma variável numérica encontrada com este filtro.
            </div>
          ) : (
            filteredNumeric.map((field, idx) => {
              const selected = isMetricSelected(field.key);
              const config = getMetricConfig(field.key);

              // Indicador visual quando começa o bloco de não-selecionados
              const isFirstUnselected =
                sortSelectedFirst &&
                !selected &&
                idx > 0 &&
                isMetricSelected(filteredNumeric[idx - 1].key);

              return (
                <React.Fragment key={field.key}>
                  {isFirstUnselected && (
                    <div className="flex items-center gap-2 pt-2.5 pb-1 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                      <span>Outros Sinais ({numericFields.length - selectedMetrics.length})</span>
                      <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      selected
                        ? isDark
                          ? 'bg-slate-800/90 border-slate-700 shadow-xs'
                          : 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
                        : isDark
                          ? 'bg-slate-950/50 border-slate-800/70 hover:border-slate-700/70'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleMetric(field.key)}
                      className="accent-indigo-500 rounded cursor-pointer"
                    />

                    {selected && (
                      <label
                        className="relative w-3.5 h-3.5 rounded-full shrink-0 shadow-xs cursor-pointer overflow-hidden border border-slate-500/40 hover:scale-110 transition-transform"
                        style={{ backgroundColor: config?.color || '#3b82f6' }}
                        title="Clique para alterar a cor desta variável e seus pontos no gráfico"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="color"
                          value={config?.color || '#3b82f6'}
                          onChange={(e) => onMetricColorChange && onMetricColorChange(field.key, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-semibold truncate font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        {field.key}
                      </span>
                      {field.min !== undefined && field.max !== undefined && (
                        <span className={`text-[10px] font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          min: {Number(field.min).toFixed(1)} · max: {Number(field.max).toFixed(1)} · méd: {Number(field.avg).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Multi-Axis assignment selector if multi-axis enabled */}
                  {selected && dualAxis && config && (
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        className={`flex items-center rounded p-0.5 text-[10px] font-mono border ${
                          isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onMetricAxisChange(field.key, 'y')}
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            config.yAxis === 'y'
                              ? 'bg-slate-700 text-white font-bold shadow-2xs'
                              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="Plotar no Eixo Esquerdo Principal (Y)"
                        >
                          Y
                        </button>
                        <button
                          type="button"
                          onClick={() => onMetricAxisChange(field.key, 'y1')}
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            config.yAxis === 'y1'
                              ? 'bg-sky-600 text-white font-bold shadow-2xs'
                              : isDark ? 'text-sky-400/80 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'
                          }`}
                          title="Plotar no Eixo Direito 1 (Y1)"
                        >
                          Y1
                        </button>
                        <button
                          type="button"
                          onClick={() => onMetricAxisChange(field.key, 'y2')}
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            config.yAxis === 'y2'
                              ? 'bg-amber-600 text-white font-bold shadow-2xs'
                              : isDark ? 'text-amber-400/80 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                          }`}
                          title="Plotar no Terceiro Eixo (Y2)"
                        >
                          Y2
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
          )}
          </div>
        </div>
      )}
    </div>
  </div>
);
};
