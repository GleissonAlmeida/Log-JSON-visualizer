import React from 'react';
import { Download, Monitor, CheckCircle, Terminal, FileCode2, Package, Sparkles, ExternalLink } from 'lucide-react';

export const WindowsDownloadView: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
              <Monitor className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60">
                  Microsoft Windows 11 &bull; 64-bit
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Compilado &amp; Pronto
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                LogPlotter em Linguagem C para Windows 11
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                Binário nativo em código C compilado estaticamente para arquitetura x86-64. Não requer instalação de Python, Node.js ou compiladores. Basta baixar e executar.
              </p>
            </div>
          </div>

          {/* Quick Download Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
            <a
              href="/log_plotter_windows11.zip?v=2.7.0"
              download="log_plotter_windows11.zip"
              className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
            >
              <Package className="w-4 h-4" />
              <span>Baixar Pacote Completo (.ZIP)</span>
            </a>

            <a
              href="/log_plotter.exe?v=2.7.0"
              download="log_plotter.exe"
              className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Baixar Apenas o Executável (.EXE)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Package Contents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="p-2.5 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 mb-3">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-mono">log_plotter.exe</h3>
            <p className="text-xs text-slate-400 mt-1">
              Binário executável puro compilado com GCC (MinGW-w64). Ligação estática com a biblioteca de matemática (<code className="text-indigo-300 font-mono">-lm -static</code>).
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 mt-3 pt-3 border-t border-slate-800">
            Tamanho: ~336 KB &bull; Sem dependências
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="p-2.5 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-mono">executar_no_windows.bat</h3>
            <p className="text-xs text-slate-400 mt-1">
              Script de automação para Windows 11. Processa o log com 2 cliques e abre automaticamente o gráfico gerado no navegador padrão.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 mt-3 pt-3 border-t border-slate-800">
            Execução com 2 cliques no Windows Explorer
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="p-2.5 w-fit rounded-lg bg-amber-500/10 text-amber-400 mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 font-mono">sample_iot.json</h3>
            <p className="text-xs text-slate-400 mt-1">
              Arquivo com série temporal de telemetria industrial (temperatura, umidade, vibração e pressão) pronto para teste imediato.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 mt-3 pt-3 border-t border-slate-800">
            Compatível com qualquer outro arquivo JSON
          </span>
        </div>
      </div>

      {/* Step by step Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Como usar no Windows 11 (Passo a Passo)
        </h3>

        <div className="space-y-6">
          {/* Method 1 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                1
              </span>
              <h4 className="text-sm font-semibold text-slate-200">
                Opção Automática (2 Cliques no Windows Explorer):
              </h4>
            </div>
            <p className="text-xs text-slate-400 ml-8 leading-relaxed">
              Baixe o arquivo <b>log_plotter_windows11.zip</b>, extraia em uma pasta qualquer e dê um duplo clique no arquivo <b>executar_no_windows.bat</b>. O programa processará o arquivo <code>sample_iot.json</code> e abrirá o arquivo <code>grafico_c.html</code> no Microsoft Edge ou Google Chrome automaticamente.
            </p>
          </div>

          {/* Method 2 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                2
              </span>
              <h4 className="text-sm font-semibold text-slate-200">
                Pelo Windows Terminal / PowerShell / Prompt de Comando (CMD):
              </h4>
            </div>
            <p className="text-xs text-slate-400 ml-8 leading-relaxed">
              Abra a pasta onde você salvou o executável no terminal do Windows e execute com os seus arquivos de log:
            </p>
            <div className="ml-8 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-slate-500"># 1. Execução padrão exibindo estatísticas e gráfico ASCII:</div>
              <div className="text-indigo-300">.\log_plotter.exe sample_iot.json</div>
              <div className="text-slate-500 pt-1"># 2. Especificando o campo do Eixo X e as métricas do Eixo Y:</div>
              <div className="text-indigo-300">.\log_plotter.exe seu_log.json -x timestamp -m temperatura,umidade,pressao_hpa</div>
              <div className="text-slate-500 pt-1"># 3. Gerando o gráfico interativo HTML5 (Chart.js):</div>
              <div className="text-indigo-300">.\log_plotter.exe seu_log.json --html relatorio_grafico.html</div>
              <div className="text-indigo-300">start relatorio_grafico.html</div>
            </div>
          </div>

          {/* Method 3 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                3
              </span>
              <h4 className="text-sm font-semibold text-slate-200">
                Informações Técnicas de Compatibilidade do Executável:
              </h4>
            </div>
            <ul className="ml-8 space-y-1 text-xs text-slate-400 font-mono">
              <li>&bull; <span className="text-slate-300">Formato:</span> PE32+ executable (console) x86-64 para Microsoft Windows</li>
              <li>&bull; <span className="text-slate-300">Sistemas compatíveis:</span> Windows 11 (todas as edições), Windows 10 (64-bit), Windows Server 2019/2022</li>
              <li>&bull; <span className="text-slate-300">Dependências:</span> Nenhuma DLL adicional requerida (ligação estática)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
