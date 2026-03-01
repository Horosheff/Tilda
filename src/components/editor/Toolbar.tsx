import { Download, FileJson, Undo2, Redo2, Eye, Code2 } from 'lucide-react';
import { usePageStore } from '../../store/pageStore';
import { downloadHtml, downloadJson, exportToHtml } from '../../export/htmlExport';
import { useState } from 'react';

export default function Toolbar() {
  const page = usePageStore((s) => s.page);
  const undo = usePageStore((s) => s.undo);
  const redo = usePageStore((s) => s.redo);
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-800">Tilda Space</h1>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            AI Builder
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Отменить"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Повторить"
          >
            <Redo2 size={18} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={() => setShowPreview(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Предпросмотр"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => setShowCode(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Код HTML"
          >
            <Code2 size={18} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={() => downloadJson(page)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <FileJson size={16} />
            JSON
          </button>
          <button
            onClick={() => downloadHtml(page)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={16} />
            HTML
          </button>
        </div>
      </header>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-700">Предпросмотр</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
            <iframe
              srcDoc={exportToHtml(page)}
              className="flex-1 w-full border-0"
              title="Preview"
            />
          </div>
        </div>
      )}

      {showCode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-700">HTML код</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(exportToHtml(page))}
                  className="text-sm text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-50 cursor-pointer"
                >
                  Копировать
                </button>
                <button
                  onClick={() => setShowCode(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-sm text-gray-700 bg-gray-50 font-mono whitespace-pre-wrap">
              {exportToHtml(page)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
