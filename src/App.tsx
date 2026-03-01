import Toolbar from './components/editor/Toolbar';
import BlockPanel from './components/editor/BlockPanel';
import Canvas from './components/editor/Canvas';
import PropertiesPanel from './components/editor/PropertiesPanel';
import AIPanel from './components/editor/AIPanel';
import { usePageStore } from './store/pageStore';

export default function App() {
  const selectedBlockId = usePageStore((s) => s.selectedBlockId);

  return (
    <>
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col">
          <AIPanel />
          <div className="border-t border-gray-200" />
          <BlockPanel />
        </aside>

        {/* Canvas */}
        <Canvas />

        {/* Right sidebar */}
        {selectedBlockId && (
          <aside className="w-72 bg-white border-l border-gray-200 overflow-y-auto shrink-0">
            <PropertiesPanel />
          </aside>
        )}
      </div>
    </>
  );
}
