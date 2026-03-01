import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Block, Page } from '../types';

interface PageState {
  page: Page;
  selectedBlockId: string | null;
  history: Page[];
  historyIndex: number;

  setPage: (page: Page) => void;
  addBlock: (block: Block, index?: number) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  setBlocks: (blocks: Block[]) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const defaultPage: Page = {
  id: uuidv4(),
  title: 'Новая страница',
  blocks: [],
  backgroundColor: '#ffffff',
  maxWidth: 1200,
};

export const usePageStore = create<PageState>((set, get) => ({
  page: defaultPage,
  selectedBlockId: null,
  history: [defaultPage],
  historyIndex: 0,

  setPage: (page) => set({ page }),

  addBlock: (block, index) => {
    const { page } = get();
    const blocks = [...page.blocks];
    if (index !== undefined) {
      blocks.splice(index, 0, block);
    } else {
      blocks.push(block);
    }
    const newPage = { ...page, blocks };
    set({ page: newPage });
    get().pushHistory();
  },

  updateBlock: (id, updates) => {
    const { page } = get();
    const blocks = page.blocks.map((b) => {
      if (b.id !== id) return b;
      const updatedProps = 'props' in updates
        ? { ...b.props, ...(updates as { props: Record<string, unknown> }).props }
        : b.props;
      return { ...b, ...updates, props: updatedProps } as Block;
    });
    const newPage = { ...page, blocks };
    set({ page: newPage });
    get().pushHistory();
  },

  removeBlock: (id) => {
    const { page, selectedBlockId } = get();
    const blocks = page.blocks.filter((b) => b.id !== id);
    const newPage = { ...page, blocks };
    set({
      page: newPage,
      selectedBlockId: selectedBlockId === id ? null : selectedBlockId,
    });
    get().pushHistory();
  },

  moveBlock: (fromIndex, toIndex) => {
    const { page } = get();
    const blocks = [...page.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    const newPage = { ...page, blocks };
    set({ page: newPage });
    get().pushHistory();
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  setBlocks: (blocks) => {
    const { page } = get();
    const newPage = { ...page, blocks };
    set({ page: newPage });
    get().pushHistory();
  },

  pushHistory: () => {
    const { page, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(page)));
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ page: JSON.parse(JSON.stringify(history[newIndex])), historyIndex: newIndex });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ page: JSON.parse(JSON.stringify(history[newIndex])), historyIndex: newIndex });
    }
  },
}));
