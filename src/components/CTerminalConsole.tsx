import React, { useState } from 'react';
import { Terminal, Play, RotateCcw, Copy, Check, Cpu } from 'lucide-react';

interface CTerminalConsoleProps {
  stdout: string;
  bytesAllocated: number;
  executionTimeMs: number;
  onReRun: () => void;
  xKey: string;
  selectedMetrics: string[];
}

export const CTerminalConsole: React.FC<CTerminalConsoleProps> = ({
  stdout,
  bytesAllocated,
  executionTimeMs,
  onReRun,
  xKey,
  selectedMetrics,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stdout);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-slate-400 font-semibold ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            Terminal C99 &bull; ./log_plotter (stdout)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Tempo C: <b className="text-slate-200">{executionTimeMs}ms</b>
            </span>
            <span>&bull;</span>
            <span>
              RAM simulada: <b className="text-slate-200">{bytesAllocated} bytes</b>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onReRun}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors"
              title="Executar novamente o binário compilado em C"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Executar C</span>
            </button>
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Copiar saída do terminal"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Command Line Callout */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
        <span className="text-emerald-400 font-bold">$</span>
        <span className="text-slate-200">
          ./log_plotter log.json -x {xKey} -m {selectedMetrics.join(',') || 'todas'} --html grafico_c.html
        </span>
      </div>

      {/* Stdout body */}
      <div className="p-4 overflow-x-auto max-h-[460px] text-slate-300 leading-relaxed font-mono whitespace-pre selection:bg-indigo-500 selection:text-white">
        {stdout}
      </div>
    </div>
  );
};
