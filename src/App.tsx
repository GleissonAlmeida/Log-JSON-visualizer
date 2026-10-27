import React, { useState } from 'react';
import { parseJsonLog, PALETTE } from './utils/jsonParser';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { MetricConfig, GlobalChartType, YAxisScaleConfig } from './types/log';
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
} from 'lucide-react';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // Initial parse result
  const [parseResult, setParseResult] = useState(() => {
    const initialJson = JSON.stringify(SAMPLE_DATASETS[0].data, null, 2);
    return parseJsonLog(initialJson, SAMPLE_DATASETS[0].name);
  });

  // Chart configuration state
  const [xAxisKey, setXAxisKey] = useState<string>(parseResult.detectedXKey);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricConfig[]>(() => {
    // Select first 3 metrics with second assigned to Y1 as in screenshot
    return parseResult.detectedYKeys.map((key, i) => ({
      key,
      label: key,
      color: PALETTE[i % PALETTE.length],
      yAxis: i === 1 ? 'y1' : 'y',
    }));
  });

  const [chartType, setChartType] = useState<GlobalChartType>('line');
  const [tension, setTension] = useState<number>(0.25);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [fillArea, setFillArea] = useState<boolean>(false);
  const [dualAxis, setDualAxis] = useState<boolean>(true);
  const [holdSparseTelemetry, setHoldSparseTelemetry] = useState<boolean>(true);

  // Y-Axis scale configuration
  const [yAxisScale, setYAxisScale] = useState<YAxisScaleConfig>({
    mode: 'auto',
    beginAtZero: false,
    scaleType: 'linear',
    minY: '',
    maxY: '',
    minY1: '',
    maxY1: '',
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
        yAxis: i === 1 ? 'y1' : 'y',
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
        return [
          ...prev,
          {
            key,
            label: key,
            color: nextColor,
            yAxis: prev.length >= 1 && dualAxis ? 'y1' : 'y',
          },
        ];
      }
    });
  };

  // Change axis assignment
  const handleMetricAxisChange = (key: string, axis: 'y' | 'y1') => {
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
      yAxis: i % 2 === 1 ? 'y1' : 'y',
    }));
    setSelectedMetrics(all);
  };

  const handleClearAllMetrics = () => {
    setSelectedMetrics([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow">
            <Monitor className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white">
              LogPlotter <span className="text-indigo-400 font-mono font-normal">Windows 11 (.EXE)</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href="/log_plotter.exe"
            download="log_plotter.exe"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
            title="Download do executável log_plotter.exe para Windows 11"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Baixar .EXE</span>
          </a>

          <a
            href="/log_plotter_windows11.zip"
            download="log_plotter_windows11.zip"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg transition-colors shadow-sm"
            title="Download do pacote com log_plotter.exe, sample_iot.json e script de 2 cliques"
          >
            <Package className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pacote .ZIP</span>
          </a>

          <button
            onClick={() => setIsDocOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
            title="Abrir documentação estilo GitHub (README.md)"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Documentação</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Carregar Log JSON</span>
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
              onSelectAllNumeric={handleSelectAllNumeric}
              onClearAllMetrics={handleClearAllMetrics}
              chartType={chartType}
              onChartTypeChange={setChartType}
              showPoints={showPoints}
              onTogglePoints={() => setShowPoints(!showPoints)}
              fillArea={fillArea}
              onToggleFill={() => setFillArea(!fillArea)}
              dualAxis={dualAxis}
              onToggleDualAxis={() => setDualAxis(!dualAxis)}
              holdSparseTelemetry={holdSparseTelemetry}
              onToggleHoldSparseTelemetry={() => setHoldSparseTelemetry(!holdSparseTelemetry)}
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
              fillArea={fillArea}
              range={range}
              onRangeChange={setRange}
              dualAxis={dualAxis}
              holdSparseTelemetry={holdSparseTelemetry}
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
