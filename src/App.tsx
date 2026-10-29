import React, { useState } from 'react';
import { parseJsonLog, PALETTE } from './utils/jsonParser';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { MetricConfig, GlobalChartType, YAxisScaleConfig, AxisID } from './types/log';
import { ChartViewer } from './components/ChartViewer';
import { MetricSelector } from './components/MetricSelector';
import { JsonInputModal } from './components/JsonInputModal';
import { DocumentationModal } from './components/DocumentationModal';
import {
  UploadCloud,
  Monitor,
  Download,
  Package,
  BookOpen,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // Initial parse result
  const [parseResult, setParseResult] = useState(() => {
    const initialJson = JSON.stringify(SAMPLE_DATASETS[0].data, null, 2);
    return parseJsonLog(initialJson, SAMPLE_DATASETS[0].name);
  });

  // Chart configuration state
  const [xAxisKey, setXAxisKey] = useState<string>(parseResult.detectedXKey);
  // Iniciar o aplicativo com o gráfico vazio (nenhuma métrica selecionada por padrão)
  const [selectedMetrics, setSelectedMetrics] = useState<MetricConfig[]>([]);

  const [chartType, setChartType] = useState<GlobalChartType>('line');
  const [tension, setTension] = useState<number>(0.25);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  // Estilo e cor dos pontos no tema claro
  const [lightPointStyle, setLightPointStyle] = useState<'white-core' | 'contrast' | 'dark' | 'custom'>(() => {
    return (localStorage.getItem('logplotter_light_point_style') as any) || 'white-core';
  });
  const [customPointColor, setCustomPointColor] = useState<string>(() => {
    return localStorage.getItem('logplotter_custom_point_color') || '#4f46e5';
  });

  const handleLightPointStyleChange = (style: 'white-core' | 'contrast' | 'dark' | 'custom') => {
    setLightPointStyle(style);
    localStorage.setItem('logplotter_light_point_style', style);
  };

  const handleCustomPointColorChange = (color: string) => {
    setCustomPointColor(color);
    localStorage.setItem('logplotter_custom_point_color', color);
  };

  const handleMetricColorChange = (key: string, newColor: string) => {
    setSelectedMetrics((prev) =>
      prev.map((m) => (m.key === key ? { ...m, color: newColor } : m))
    );
  };

  const [fillArea, setFillArea] = useState<boolean>(false);
  const [dualAxis, setDualAxis] = useState<boolean>(true);
  const [holdSparseTelemetry, setHoldSparseTelemetry] = useState<boolean>(true);
  const [showCursor, setShowCursor] = useState<boolean>(true);

  // Y-Axis scale configuration
  const [yAxisScale, setYAxisScale] = useState<YAxisScaleConfig>({
    mode: 'auto',
    beginAtZero: false,
    scaleType: 'linear',
    minY: '',
    maxY: '',
    minY1: '',
    maxY1: '',
    minY2: '',
    maxY2: '',
  });

  // Range window slider [start, end]
  const [range, setRange] = useState<[number, number]>([0, parseResult.records.length - 1]);

  const [datasetName, setDatasetName] = useState<string>(SAMPLE_DATASETS[0].name);

  // Direct file loader
  const handleDirectFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        handleLoadData(text, file.name);
      } catch (err: any) {
        alert(`Erro ao ler o arquivo: ${err.message || 'Arquivo corrompido'}`);
      }
    };
    reader.readAsText(file);
  };

  // Handler to load new JSON content
  const handleLoadData = (jsonStr: string, name?: string) => {
    try {
      const parsed = parseJsonLog(jsonStr, name || 'Log Carregado');
      setParseResult(parsed);
      setDatasetName(name || 'Log Personalizado');
      setXAxisKey(parsed.detectedXKey);
      setRange([0, parsed.records.length - 1]);

      const newMetrics: MetricConfig[] = parsed.detectedYKeys.map((key, i) => ({
        key,
        label: key,
        color: PALETTE[i % PALETTE.length],
        yAxis: i === 1 ? 'y1' : (i === 2 ? 'y2' : 'y'),
      }));
      setSelectedMetrics(newMetrics);
    } catch (err: any) {
      alert(`Erro ao processar o log: ${err.message || 'JSON inválido'}`);
    }
  };

  // Toggle metric selection
  const handleToggleMetric = (key: string) => {
    setSelectedMetrics((prev) => {
      const exists = prev.find((m) => m.key === key);
      if (exists) {
        return prev.filter((m) => m.key !== key);
      } else {
        const nextColor = PALETTE[prev.length % PALETTE.length];
        const nextAxis: AxisID =
          !dualAxis
            ? 'y'
            : prev.length % 3 === 1
            ? 'y1'
            : prev.length % 3 === 2
            ? 'y2'
            : 'y';
        return [
          ...prev,
          {
            key,
            label: key,
            color: nextColor,
            yAxis: nextAxis,
          },
        ];
      }
    });
  };

  // Change axis assignment
  const handleMetricAxisChange = (key: string, axis: AxisID) => {
    setSelectedMetrics((prev) =>
      prev.map((m) => (m.key === key ? { ...m, yAxis: axis } : m))
    );
  };

  const handleSelectAllNumeric = () => {
    const numerics = parseResult.fields.filter((f) => f.isNumeric);
    const all: MetricConfig[] = numerics.map((f, i) => ({
      key: f.key,
      label: f.key,
      color: PALETTE[i % PALETTE.length],
      yAxis: i % 3 === 1 ? 'y1' : (i % 3 === 2 ? 'y2' : 'y'),
    }));
    setSelectedMetrics(all);
  };

  const handleClearAllMetrics = () => {
    setSelectedMetrics([]);
  };

  const handleChartTypeChange = (type: GlobalChartType) => {
    setChartType(type);
    if (type === 'line') {
      setFillArea(false);
    } else if (type === 'area') {
      setFillArea(true);
    } else if (type === 'bar' || type === 'stepped') {
      setFillArea(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header Bar */}
      <header
        className={`flex items-center justify-between gap-4 px-6 py-3 border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-200 ${
          theme === 'dark'
            ? 'border-slate-800 bg-slate-900/95 text-white'
            : 'border-slate-200 bg-white/95 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow">
            <Monitor className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              LogPlotter <span className="text-indigo-500 font-mono font-normal">Windows 11 (.EXE)</span>
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                theme === 'dark'
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              v2.7 C99 + Preview 1:1
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Alternador de Tema Escuro / Claro */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-slate-600'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
            title={theme === 'dark' ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
            aria-label="Alternar Tema Claro / Escuro"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-200 font-medium">Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-slate-800 font-medium">Tema Escuro</span>
              </>
            )}
          </button>

          <a
            href="/grafico_c.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-xs ${
              theme === 'dark'
                ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700/60'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
            }`}
            title="Abrir diretamente o arquivo grafico_c.html exportado pelo log_plotter.exe"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ver HTML do .EXE</span>
          </a>

          <a
            href="/log_plotter.exe?v=2.7.0"
            download="log_plotter.exe"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-xs ${
              theme === 'dark'
                ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300'
            }`}
            title="Download do executável log_plotter.exe v2.7 100% Offline (com Chart.js embutido, sem necessidade de internet)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Baixar .EXE (Offline v2.7)</span>
          </a>

          <a
            href="/log_plotter_windows11.zip?v=2.7.0"
            download="log_plotter_windows11.zip"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-xs ${
              theme === 'dark'
                ? 'text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/60'
                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
            }`}
            title="Download do pacote .ZIP atualizado (v2.7 100% Offline) com log_plotter.exe, sample_can_bus.csv, sample_can_bus.json, scripts e documentação"
          >
            <Package className="w-3.5 h-3.5 text-indigo-500" />
            <span>Pacote .ZIP</span>
          </a>

          <button
            onClick={() => setIsDocOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-xs cursor-pointer ${
              theme === 'dark'
                ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300'
            }`}
            title="Abrir documentação estilo GitHub (README.md)"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Documentação</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Carregar Log (JSON / CSV)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: ONLY the exact two-column layout requested */}
      <main className="flex-1 max-w-[1580px] w-full mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Coluna Esquerda: Controles */}
          <div className="lg:col-span-4 xl:col-span-3">
            <MetricSelector
              fields={parseResult.fields}
              xAxisKey={xAxisKey}
              onXAxisChange={setXAxisKey}
              selectedMetrics={selectedMetrics}
              onToggleMetric={handleToggleMetric}
              onMetricAxisChange={handleMetricAxisChange}
              onMetricColorChange={handleMetricColorChange}
              onSelectAllNumeric={handleSelectAllNumeric}
              onClearAllMetrics={handleClearAllMetrics}
              chartType={chartType}
              onChartTypeChange={handleChartTypeChange}
              showPoints={showPoints}
              onTogglePoints={() => setShowPoints(!showPoints)}
              lightPointStyle={lightPointStyle}
              onChangeLightPointStyle={handleLightPointStyleChange}
              customPointColor={customPointColor}
              onChangeCustomPointColor={handleCustomPointColorChange}
              fillArea={fillArea}
              onToggleFill={() => setFillArea(!fillArea)}
              dualAxis={dualAxis}
              onToggleDualAxis={() => setDualAxis(!dualAxis)}
              holdSparseTelemetry={holdSparseTelemetry}
              onToggleHoldSparseTelemetry={() => setHoldSparseTelemetry(!holdSparseTelemetry)}
              showCursor={showCursor}
              onToggleCursor={() => setShowCursor(!showCursor)}
              yAxisScale={yAxisScale}
              onYAxisScaleChange={setYAxisScale}
              onOpenLoadModal={() => setIsModalOpen(true)}
              onLoadFile={handleDirectFile}
              datasetName={datasetName}
              totalRecords={parseResult.totalRecords}
            />
          </div>

          {/* Coluna Direita: Gráfico Interativo */}
          <div className="lg:col-span-8 xl:col-span-9">
            <ChartViewer
              records={parseResult.records}
              xAxisKey={xAxisKey}
              selectedMetrics={selectedMetrics}
              chartType={chartType}
              tension={tension}
              showPoints={showPoints}
              lightPointStyle={lightPointStyle}
              customPointColor={customPointColor}
              fillArea={fillArea}
              range={range}
              onRangeChange={setRange}
              dualAxis={dualAxis}
              holdSparseTelemetry={holdSparseTelemetry}
              showCursor={showCursor}
              onToggleCursor={() => setShowCursor(!showCursor)}
              yAxisScale={yAxisScale}
            />
          </div>
        </div>
      </main>

      {/* Modal for loading JSON data */}
      <JsonInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadData={handleLoadData}
      />

      {/* Modal for GitHub-style documentation */}
      <DocumentationModal
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
      />
    </div>
  );
}
