import { create } from 'zustand';
import type { Word, PlaybackConfig } from '../types';
import { wordApi } from '../services/api';

interface AppState {
  // Words
  words: Word[];
  currentWordIndex: number;
  currentFilter: string;
  loading: boolean;

  // Playback
  isPlaying: boolean;
  playbackConfig: PlaybackConfig;

  // Theme
  theme: 'light' | 'dark';

  // Music
  musicEnabled: boolean;
  musicVolume: number;
  musicAutoMix: boolean;
  musicLoop: boolean;
  currentMusicCategory: 'jazz' | 'morning';
  currentMusicIndex: number;

  // Actions
  fetchWords: () => Promise<void>;
  setFilter: (lang: string) => void;
  setCurrentWordIndex: (index: number) => void;
  togglePlay: () => void;
  updateConfig: (config: Partial<PlaybackConfig>) => void;
  toggleTheme: () => void;
  toggleMusic: () => void;
  setMusicVolume: (volume: number) => void;
  setMusicCategory: (category: 'jazz' | 'morning') => void;
  setMusicIndex: (index: number) => void;
  toggleMusicAutoMix: () => void;
  toggleMusicLoop: () => void;
}

const defaultConfig: PlaybackConfig = {
  wordRepeat: 3,              // 默认重复3次
  enableWordRepeat: true,     // 默认启用单词重复
  listLoops: 1,
  enableListLoop: true,       // 默认启用列表循环（连续播放下一个单词）
  spellMode: true,            // 默认启用拼读模式
  autoMeaning: true,          // 默认启用读含义
  continuousPlay: true,       // 默认启用连续播放
  playInterval: 0.5,          // 默认间隔0.5秒
  spellDelay: 0.5,
  meaningDelay: 1,
};

const STORAGE_KEY = 'pte-playback-config';

// 从 localStorage 读取持久化配置
const loadPersistedConfig = (): PlaybackConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch { /* 忽略解析错误 */ }
  return defaultConfig;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  words: [],
  currentWordIndex: 0,
  currentFilter: '',
  loading: false,

  isPlaying: false,
  playbackConfig: loadPersistedConfig(),

  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

  musicEnabled: false,
  musicVolume: 0.5,
  musicAutoMix: true,
  musicLoop: true,
  currentMusicCategory: 'jazz',
  currentMusicIndex: 0,

  // Actions
  fetchWords: async () => {
    set({ loading: true });
    try {
      const { currentFilter } = get();
      const words = await wordApi.getWords(currentFilter || undefined);
      set({ words, loading: false });
    } catch (error) {
      console.error('Failed to fetch words:', error);
      set({ loading: false });
    }
  },

  setFilter: (lang: string) => {
    set({ currentFilter: lang, currentWordIndex: 0 });
    get().fetchWords();
  },

  setCurrentWordIndex: (index: number) => {
    const { words } = get();
    if (words.length === 0) return;
    const newIndex = Math.max(0, Math.min(index, words.length - 1));
    set({ currentWordIndex: newIndex });
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  updateConfig: (config: Partial<PlaybackConfig>) => {
    set((state) => {
      const newConfig = { ...state.playbackConfig, ...config };
      // 持久化到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      } catch { /* 存储已满时静默 */ }
      return { playbackConfig: newConfig };
    });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // Tailwind darkMode: 'class' 需要 dark class
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  },

  toggleMusic: () => {
    set((state) => ({ musicEnabled: !state.musicEnabled }));
  },

  setMusicVolume: (volume: number) => {
    set({ musicVolume: volume });
  },

  setMusicCategory: (category: 'jazz' | 'morning') => {
    set({ currentMusicCategory: category, currentMusicIndex: 0 });
  },

  setMusicIndex: (index: number) => {
    set({ currentMusicIndex: index });
  },

  toggleMusicAutoMix: () => {
    set((state) => ({ musicAutoMix: !state.musicAutoMix }));
  },

  toggleMusicLoop: () => {
    set((state) => ({ musicLoop: !state.musicLoop }));
  },
}));

// Initialize theme
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  // Tailwind darkMode: 'class' 需要 dark class
  document.documentElement.classList.toggle('dark', savedTheme === 'dark');
}
