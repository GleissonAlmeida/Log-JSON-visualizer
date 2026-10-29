import React, { useState, useRef } from 'react';
import { SAMPLE_DATASETS, SampleDataset } from '../data/sampleDatasets';
import { UploadCloud, FileCode2, Sparkles, X, AlertTriangle, Check, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface JsonInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadData: (jsonString: string, filename?: string) => void;
  currentDatasetName?: string;
}

export const JsonInputModal: React.FC<JsonInputModalProps> = ({
  isOpen,
  onClose,
  onLoadData,
  currentDatasetName,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('samples');
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        onLoadData(text, file.name);
        onClose();
      } catch (err: any) {
        setErrorMsg(`Erro ao ler o arquivo: ${err.message || 'Arquivo corrompido'}`);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    setErrorMsg(null);
    if (!pasteText.trim()) {
      setErrorMsg('Por favor, cole algum conteúdo JSON, JSONL ou CSV antes de continuar.');
      return;
    }
    try {
      onLoadData(pasteText, 'log_colado.txt');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar os dados.');
    }
  };

  const handleBeautify = () => {
    try {
      const parsed = JSON.parse(pasteText);
      setPasteText(JSON.stringify(parsed, null, 2));
      setErrorMsg(null);
    } catch {
      setErrorMsg('A formatação automática requer sintaxe JSON válida. Para CSV, os dados são interpretados diretamente.');
    }
  };

  const handleSelectSample = (sample: SampleDataset) => {
    const jsonStr = sample.rawString || JSON.stringify(sample.data, null, 2);
    onLoadData(jsonStr, sample.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Carregar Dados de Log (JSON / CSV)
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Suporta tabelas .csv, arrays JSON convencionais, objetos aninhados e arquivos .log / JSONL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div
          className={`flex border-b px-6 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/70'
          }`}
        >
          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'samples'
                ? 'border-indigo-500 text-indigo-500'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Exemplos Prontos
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-500'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload de Arquivo (.csv, .json, .log)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-500'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Colar Texto (JSON / CSV)
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'samples' && (
            <div className="flex flex-col gap-3">
              <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Escolha um conjunto de dados de exemplo realista para explorar imediatamente os gráficos e métricas:
              </p>
              {SAMPLE_DATASETS.map((sample) => {
                const isCurrent = currentDatasetName === sample.name;
                return (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? isDark
                          ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400/30'
                        : isDark
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {sample.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {sample.badge}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {sample.description}
                      </p>
                      <span className="text-[11px] text-slate-500 font-mono mt-1">
                        {sample.data.length} registros · {Object.keys(sample.data[0] || {}).length} propriedades
                      </span>
                    </div>
                    <div className="shrink-0 pt-1">
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs">
                        Carregar
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : isDark
                      ? 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950/80'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100/70'
                }`}
              >
                <div
                  className={`p-3 rounded-full mb-3 ${
                    isDark ? 'bg-slate-800 text-indigo-400' : 'bg-white text-indigo-600 shadow-2xs border border-slate-200'
                  }`}
                >
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  Clique para selecionar ou arraste o arquivo aqui
                </h4>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Arquivos suportados: .csv, .json, .log, .ndjson, .txt (tamanho recomendado até 10 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.log,.ndjson,.txt,.csv,application/json,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div
                className={`border rounded-xl p-4 text-xs leading-relaxed ${
                  isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className={`font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Dica de Formatos Suportados:
                </span>
                O analisador aceita automaticamente:
                <ul
                  className={`list-disc list-inside mt-1 space-y-0.5 font-mono text-[11px] ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <li>Tabelas CSV delimitadas por vírgula (<code>,</code>), ponto-e-vírgula (<code>;</code>) ou tabulação (<code>\t</code>)</li>
                  <li>Array de objetos JSON: <code>[{'{"timestamp": "...", "temp": 24}'}]</code></li>
                  <li>Objeto encapsulado: <code>{'{"logs": [...]}'}</code> ou <code>{'{"data": [...]}'}</code></li>
                  <li>Objetos aninhados: <code>{'{"metrics": {"cpu": 45}}'}</code> (convertido em metrics.cpu)</li>
                  <li>JSON Lines (JSONL): um objeto JSON por linha</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Cole o código JSON ou os dados em formato CSV / Log:
                </label>
                <button
                  type="button"
                  onClick={handleBeautify}
                  className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
                >
                  Formatar JSON (Identar)
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='Cole aqui seu JSON ou CSV. Exemplo CSV:&#10;timestamp,pressao,temperatura,rpm&#10;10:00:01,1013.2,24.5,1200&#10;10:00:02,1013.8,24.8,1250'
                rows={10}
                className={`w-full p-3 font-mono text-xs rounded-xl border leading-relaxed resize-y focus:outline-none focus:border-indigo-500 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors cursor-pointer"
                >
                  Processar e Plotar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
