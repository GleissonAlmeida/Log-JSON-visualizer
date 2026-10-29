import React, { useState } from 'react';
import { BookOpen, X, Copy, Check, Terminal, FileCode2, Package, ExternalLink, Github } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* GitHub Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-indigo-400 rounded-lg border border-slate-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 font-mono">README.md</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  v1.0 &bull; C99
                </span>
              </div>
              <p className="text-xs text-slate-400">Documentação completa no padrão GitHub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/README.md"
              download="README.md"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors"
            >
              <span>Baixar README.md</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Markdown-style Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-300 text-sm leading-relaxed font-sans">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
              Language: C99
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono">
              Platform: Windows 11 | Linux
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-rose-950 text-rose-400 border border-rose-800 font-mono">
              Graphics: Chart.js
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              Build: Passing
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-purple-950 text-purple-400 border border-purple-800 font-mono">
              License: Apache-2.0
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">📊 LogPlotter C &bull; Visualizador de Logs CSV &amp; JSON (v2.6)</h1>
            <p className="text-slate-400">
              Leitor de logs e telemetria de alta performance e plotador gráfico interativo desenvolvido em <b>Linguagem C (ANSI C99)</b> com geração dinâmica de gráficos em <b>Chart.js</b> e executável nativo para <b>Windows 11 (64-bit)</b>.
            </p>
          </div>

          <hr className="border-slate-800" />

          {/* Features */}
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
              ✨ Principais Funcionalidades
            </h2>
            <ul className="space-y-2 list-disc list-inside text-slate-300 text-xs sm:text-sm">
              <li><b>Leitor Completo de Arquivos CSV:</b> auto-detecção de delimitadores (vírgula <code>,</code>, ponto-e-vírgula <code>;</code>, tabulação <code>\t</code> e pipe <code>|</code>) e conversão inteligente de formatos numéricos brasileiros/europeus (ex: <code>24,5</code>).</li>
              <li><b>Cursor Interativo do Eixo X:</b> rastreamento de amostras a 60 FPS por ponteiro do mouse, arrasto ou navegação pelo teclado (← / →), com opção de fixar e liberar o cursor.</li>
              <li><b>Hold de Telemetria (Sample & Hold):</b> recupera o último valor válido transmitido na ausência de dados na amostra atual, tanto no traçado gráfico quanto no HUD (com indicador <code>[hold]</code>).</li>
              <li><b>Exportação para PNG com Dados Completos:</b> salva imagem em alta definição gravando o cursor, etiqueta da amostra, pontos nas curvas e cartão de inspeção com os valores numéricos.</li>
              <li><b>Separação Visual da Legenda:</b> margem de respiro dedicada entre os nomes dos sinais e a área do gráfico, eliminando sobreposições.</li>
              <li><b>Classificação de Sinais:</b> agrupamento inteligente que exibe as variáveis selecionadas no topo, com ordenação alfabética (A-Z) e alternador rápido.</li>
              <li><b>Leitura Dinâmica de JSON/JSONL:</b> suporte a upload de arquivos e colagem de texto com detecção automática de registros e propriedades.</li>
              <li><b>Desaninhamento Automático:</b> objetos aninhados são achatados em notação ponto (ex: <code>sensores.temperatura</code>).</li>
              <li><b>Eixo X Flexível:</b> escolha campos temporais (timestamps, horas, datas) ou numeração sequencial (<code>#</code>).</li>
              <li><b>Eixos Y Múltiplos (Y, Y1 e Y2):</b> plote variáveis em até três eixos independentes (Eixo Y esquerdo principal, Eixo Y1 direito e Eixo Y2 direito 2), permitindo comparar sinais de grandezas totalmente distintas (ex: %, hPa e °C) simultaneamente.</li>
              <li><b>Ajuste Fino da Escala Y:</b> modo automático ou manual com limites numéricos, opção de iniciar no zero (0) e escala logarítmica.</li>
              <li><b>Estilos Gráficos:</b> alterne instantaneamente entre Linha, Área, Barras e Degraus (Stepped).</li>
              <li><b>Zoom e Faixa Temporal:</b> controle deslizante com atalhos de 100%, 50%, 25% e últimos 30 pontos.</li>
            </ul>
          </div>

          <hr className="border-slate-800" />

          {/* Windows 11 Executable Guide */}
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Executável para Windows 11 (Sem Instalação)
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              O executável <code>log_plotter.exe</code> foi compilado estaticamente para arquitetura x86-64 com MinGW-w64. Funciona tanto com arquivos <b>.csv</b> quanto com arquivos <b>.json</b> ou <b>.log</b>.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <span>Comandos no Terminal do Windows (PowerShell / CMD)</span>
                <button
                  onClick={() => handleCopy('.\\log_plotter.exe sample_can_bus.csv --html grafico.html\nstart grafico.html', 'cmd')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  {copiedCode === 'cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'cmd' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className="text-slate-500"># Execução direta com arquivo CSV:</div>
              <div className="text-indigo-300">
                .\log_plotter.exe sample_can_bus.csv --html grafico.html
              </div>
              <div className="text-slate-500 pt-1"># Execução com arquivo JSON especificando sinais:</div>
              <div className="text-indigo-300">
                .\log_plotter.exe sample_iot.json -x timestamp -m temperatura,umidade,pressao_hpa --html grafico.html
              </div>
              <div className="text-indigo-300">start grafico.html</div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Compilation Instructions */}
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              Como Compilar a partir do Código-Fonte em C
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              O código em <code>src/c_src/</code> é ANSI C99 estrito e compila com qualquer compilador C moderno:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <span>Compilação com GCC / MinGW</span>
                <button
                  onClick={() => handleCopy('gcc -Wall -Wextra -O2 -std=c99 src/c_src/main.c src/c_src/json_parser.c -lm -o log_plotter', 'gcc')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  {copiedCode === 'gcc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'gcc' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className="text-slate-500"># Linux / macOS:</div>
              <div className="text-indigo-300">
                gcc -Wall -Wextra -O2 -std=c99 src/c_src/main.c src/c_src/json_parser.c -lm -o log_plotter
              </div>
              <div className="text-slate-500 pt-1"># Windows (MinGW-w64 ligação estática):</div>
              <div className="text-indigo-300">
                x86_64-w64-mingw32-gcc -Wall -O2 -std=c99 -static src/c_src/main.c src/c_src/json_parser.c -lm -o log_plotter.exe
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Supported Formats */}
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-indigo-400" />
              Formatos de Arquivo Suportados (CSV &amp; JSON)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <div className="text-indigo-400 font-bold mb-1">Exemplo CSV (com vírgula ou ponto-e-vírgula):</div>
                <pre>{`#,BrakeSwitch,curr_gear,sel_gear,Speed
1,1.0,2.0,2.0,0.00
2,0.0,2.0,2.0,12.50
3,0.0,3.0,3.0,28.40`}</pre>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <div className="text-indigo-400 font-bold mb-1">Exemplo JSON / JSONL:</div>
                <pre>{`[
  { "timestamp": "08:00", "temp": 22.4, "pressao": 1013 },
  { "timestamp": "08:01", "temp": 22.8, "pressao": 1012 }
]`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-500 flex items-center justify-between">
          <span>Licenciado sob Apache 2.0 &bull; Desenvolvido em Linguagem C (C99)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
