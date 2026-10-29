import React, { useState } from 'react';
import { BookOpen, X, Copy, Check, Terminal, FileCode2, Package, ExternalLink, Github } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* GitHub Header Bar */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${
                isDark ? 'bg-slate-800 text-indigo-400 border-slate-700' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  README.md
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  v1.0 &bull; C99
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Documentação completa no padrão GitHub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/README.md"
              download="README.md"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isDark
                  ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700'
                  : 'text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border-slate-300 shadow-2xs'
              }`}
            >
              <span>Baixar README.md</span>
            </a>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Markdown-style Content Body */}
        <div
          className={`p-6 sm:p-8 overflow-y-auto space-y-6 text-sm leading-relaxed font-sans ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
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
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              📊 LogPlotter C &bull; Visualizador de Logs CSV &amp; JSON (v2.7)
            </h1>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Leitor de logs e telemetria de alta performance e plotador gráfico interativo desenvolvido em <b>Linguagem C (ANSI C99)</b> com geração dinâmica de gráficos em <b>Chart.js</b> e executável nativo para <b>Windows 11 (64-bit)</b>.
            </p>
          </div>

          <hr className={isDark ? 'border-slate-800' : 'border-slate-200'} />

          {/* Features */}
          <div>
            <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              ✨ Principais Funcionalidades (v2.7)
            </h2>
            <ul className={`space-y-2 list-disc list-inside text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li><b>Alternância de Tema Claro e Escuro:</b> interface completa com paletas de cores refinadas para modo dark (slate profundo) e light (fundo limpo com alto contraste nos eixos e grades).</li>
              <li><b>Estilos de Pontos no Tema Claro:</b> escolha entre <b>Núcleo Branco</b> (padrão com contorno da série e centro branco para máxima distinção), <b>Borda Escura</b>, <b>Grafite Escuro</b> ou <b>Personalizada</b> (com color picker).</li>
              <li><b>Seletor de Cores por Variável:</b> clique no seletor de cor de qualquer métrica para personalizar a tonalidade da curva em tempo real, sincronizado com o gráfico, cursor e exportação.</li>
              <li><b>Paridade Gráfica Total com o Executável C:</b> o dashboard autônomo gerado pelo executável em C99 possui exatamente os mesmos recursos gráficos, alternância de tema e estilos de pontos.</li>
              <li><b>Leitor Completo de Arquivos CSV:</b> auto-detecção de delimitadores (vírgula <code>,</code>, ponto-e-vírgula <code>;</code>, tabulação <code>\t</code> e pipe <code>|</code>) e conversão inteligente de formatos numéricos brasileiros/europeus (ex: <code>24,5</code>).</li>
              <li><b>Cursor Interativo do Eixo X:</b> rastreamento de amostras a 60 FPS por ponteiro do mouse, arrasto ou navegação pelo teclado (← / →), com opção de fixar e liberar o cursor.</li>
              <li><b>Hold de Telemetria (Sample & Hold):</b> recupera o último valor válido transmitido na ausência de dados na amostra atual, tanto no traçado gráfico quanto no HUD (com indicador <code>[hold]</code>).</li>
              <li><b>Exportação para PNG com Fundo e Cursor:</b> salva imagem em alta definição gravando o cursor, etiqueta da amostra, pontos nas curvas e cartão de inspeção com fundo condizente com o tema (branco ou escuro).</li>
              <li><b>Eixos Y Múltiplos (Y, Y1 e Y2):</b> plote variáveis em até três eixos independentes (Eixo Y esquerdo principal, Eixo Y1 direito e Eixo Y2 direito 2), permitindo comparar sinais de grandezas totalmente distintas (ex: %, hPa e °C) simultaneamente.</li>
              <li><b>Ajuste Fino da Escala Y:</b> modo automático ou manual com limites numéricos, opção de iniciar no zero (0) e escala logarítmica.</li>
              <li><b>Estilos Gráficos:</b> alterne instantaneamente entre Linha, Área, Barras e Degraus (Stepped).</li>
              <li><b>Zoom e Faixa Temporal:</b> controle deslizante com atalhos de 100%, 50%, 25% e últimos 30 pontos.</li>
            </ul>
          </div>

          <hr className={isDark ? 'border-slate-800' : 'border-slate-200'} />

          {/* Windows 11 Executable Guide */}
          <div>
            <h2 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Package className="w-5 h-5 text-indigo-500" />
              Executável para Windows 11 (Sem Instalação)
            </h2>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              O executável <code>log_plotter.exe</code> foi compilado estaticamente para arquitetura x86-64 com MinGW-w64. Funciona tanto com arquivos <b>.csv</b> quanto com arquivos <b>.json</b> ou <b>.log</b>.
            </p>

            <div
              className={`p-4 rounded-xl border space-y-3 font-mono text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <span>Comandos no Terminal do Windows (PowerShell / CMD)</span>
                <button
                  onClick={() => handleCopy('.\\log_plotter.exe sample_can_bus.csv --html grafico.html\nstart grafico.html', 'cmd')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
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

          <hr className={isDark ? 'border-slate-800' : 'border-slate-200'} />

          {/* Compilation Instructions */}
          <div>
            <h2 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Terminal className="w-5 h-5 text-indigo-500" />
              Como Compilar a partir do Código-Fonte em C
            </h2>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              O código em <code>src/c_src/</code> é ANSI C99 estrito e compila com qualquer compilador C moderno:
            </p>

            <div
              className={`p-4 rounded-xl border space-y-2 font-mono text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <span>Compilação com GCC / MinGW</span>
                <button
                  onClick={() => handleCopy('gcc -Wall -Wextra -O2 -std=c99 src/c_src/main.c src/c_src/json_parser.c -lm -o log_plotter', 'gcc')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
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

          <hr className={isDark ? 'border-slate-800' : 'border-slate-200'} />

          {/* Supported Formats */}
          <div>
            <h2 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <FileCode2 className="w-5 h-5 text-indigo-500" />
              Formatos de Arquivo Suportados (CSV &amp; JSON)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-xl border font-mono text-xs overflow-x-auto ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <div className="text-indigo-400 font-bold mb-1">Exemplo CSV (com vírgula ou ponto-e-vírgula):</div>
                <pre>{`#,BrakeSwitch,curr_gear,sel_gear,Speed
1,1.0,2.0,2.0,0.00
2,0.0,2.0,2.0,12.50
3,0.0,3.0,3.0,28.40`}</pre>
              </div>
              <div
                className={`p-3 rounded-xl border font-mono text-xs overflow-x-auto ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
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
        <div
          className={`px-6 py-3 border-t text-xs flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <span>Licenciado sob Apache 2.0 &bull; Desenvolvido em Linguagem C (C99)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
