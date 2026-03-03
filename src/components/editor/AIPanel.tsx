import { useState } from 'react';
import { Sparkles, Loader2, Key, AlertCircle } from 'lucide-react';
import { usePageStore } from '../../store/pageStore';
import { initGemini, generatePageBlocks, isGeminiInitialized } from '../../services/geminiService';
import { KV_AI_TEMPLATE_HTML } from '../../templates/kv-ai-reference';

export default function AIPanel() {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const setBlocks = usePageStore((s) => s.setBlocks);
  const addBlock = usePageStore((s) => s.addBlock);
  const page = usePageStore((s) => s.page);

  const handleConnect = () => {
    if (!apiKey.trim()) return;
    initGemini(apiKey.trim());
    setConnected(true);
    setError('');
  };

  const handleGenerate = async (mode: 'replace' | 'append') => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const blocks = await generatePageBlocks(prompt, templateHtml.trim() || undefined);
      if (mode === 'replace') {
        setBlocks(blocks);
      } else {
        blocks.forEach((b) => addBlock(b));
      }
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setLoading(false);
    }
  };

  if (!connected && !isGeminiInitialized()) {
    return (
      <div className="p-3 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Sparkles size={14} />
          AI Генерация
        </h3>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Подключите Gemini API для генерации страниц с помощью ИИ
          </p>
          <div className="space-y-2">
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Gemini API Key"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={!apiKey.trim()}
              className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Подключить
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Получите ключ на{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-500 hover:underline"
            >
              aistudio.google.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
        <Sparkles size={14} className="text-indigo-500" />
        AI Генерация
      </h3>

      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опишите страницу, которую хотите создать...&#10;&#10;Например: Лендинг для кофейни с красивыми фото, меню и формой заказа"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y min-h-[100px]"
          rows={4}
          disabled={loading}
        />

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTemplate((s) => !s)}
            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
          >
            <span>Эталонная страница (шаблон)</span>
            <span className="text-gray-400">{showTemplate ? '▼' : '▶'}</span>
          </button>
          {showTemplate && (
            <>
              <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50/50 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setTemplateHtml(KV_AI_TEMPLATE_HTML); }}
                  className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                >
                  Стиль kv-ai.ru
                </button>
              </div>
              <textarea
              value={templateHtml}
              onChange={(e) => setTemplateHtml(e.target.value)}
              placeholder="Вставьте HTML готовой страницы с Tilda — ИИ создаст похожий стиль и структуру.&#10;Скопировать: откройте страницу в браузере → ПКМ → «Просмотреть код» → скопируйте нужный фрагмент или экспортируйте через Настройки сайта → Экспорт."
              className="w-full px-3 py-2 text-sm border-0 border-t border-gray-200 rounded-none focus:ring-2 focus:ring-indigo-500 outline-none resize-y min-h-[80px] font-mono text-xs"
              rows={4}
              disabled={loading}
            />
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 text-red-600 text-xs rounded-lg">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('replace')}
            disabled={loading || !prompt.trim()}
            className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Создать
          </button>
          {page.blocks.length > 0 && (
            <button
              onClick={() => handleGenerate('append')}
              disabled={loading || !prompt.trim()}
              className="py-2 px-3 border border-indigo-300 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              + Добавить
            </button>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p>Примеры запросов:</p>
        <ul className="space-y-0.5 ml-3 list-disc">
          <li className="cursor-pointer hover:text-indigo-500" onClick={() => setPrompt('Лендинг для IT-стартапа с hero секцией, преимуществами и CTA')}>
            Лендинг для IT-стартапа
          </li>
          <li className="cursor-pointer hover:text-indigo-500" onClick={() => setPrompt('Страница портфолио дизайнера с галереей работ и контактной формой')}>
            Портфолио дизайнера
          </li>
          <li className="cursor-pointer hover:text-indigo-500" onClick={() => setPrompt('Страница ресторана с меню, фото блюд и формой бронирования')}>
            Страница ресторана
          </li>
        </ul>
      </div>
    </div>
  );
}
