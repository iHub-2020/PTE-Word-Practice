import { useAppStore } from '../store/appStore';
import { audioApi, wordApi } from '../services/api';
import { showToast } from '../lib/utils';
import WordCard from './WordCard';
import type { Word } from '../types';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

export default function LibraryPanel() {
  const {
    words,
    currentWordIndex,
    currentFilter,
    loading,
    setFilter,
    setCurrentWordIndex,
    fetchWords,
  } = useAppStore();

  // 添加单词表单状态
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newLanguage, setNewLanguage] = useState<'en' | 'zh'>('en');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handlePlay = async (word: Word, spellMode: boolean = false) => {
    try {
      const audio = new Audio(audioApi.getWordAudioUrl(word.id, spellMode));
      await audio.play();
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  const scrollToActiveCard = (index: number) => {
    const card = document.getElementById(`word-card-${words[index]?.id}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) {
      showToast('单词和含义不能为空', 'error');
      return;
    }
    setIsAdding(true);
    try {
      await wordApi.addWord({
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        language: newLanguage,
        phonetic: newPhonetic.trim() || undefined,
      });
      setNewWord('');
      setNewMeaning('');
      setNewPhonetic('');
      setShowAddForm(false);
      fetchWords();
    } catch {
      // toast already handled by api layer
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Library
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {words.length} 个单词
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`p-1.5 rounded-lg transition-colors ${showAddForm
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              title="添加单词"
            >
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Add Word Form */}
        {showAddForm && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 animate-fade-in">
            <div className="flex gap-2">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="单词"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value as 'en' | 'zh')}
                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="en">EN</option>
                <option value="zh">ZH</option>
              </select>
            </div>
            <input
              type="text"
              value={newPhonetic}
              onChange={(e) => setNewPhonetic(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="音标（可选）"
            />
            <textarea
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
              placeholder="含义"
            />
            <button
              onClick={handleAddWord}
              disabled={isAdding || !newWord.trim() || !newMeaning.trim()}
              className="w-full py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAdding ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              添加单词
            </button>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${currentFilter === ''
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('en')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${currentFilter === 'en'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            EN
          </button>
          <button
            onClick={() => setFilter('zh')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${currentFilter === 'zh'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            ZH
          </button>
        </div>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">没有找到单词</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">点击右上角"+"按钮或导入CSV文件添加单词</p>
          </div>
        ) : (
          words.map((word, index) => (
            <div
              key={word.id}
              id={`word-card-${word.id}`}
              onClick={() => {
                setCurrentWordIndex(index);
                scrollToActiveCard(index);
              }}
            >
              <WordCard
                word={word}
                isActive={index === currentWordIndex}
                onPlay={(w) => handlePlay(w, false)}
                onPlayPronunciation={(w) => handlePlay(w, false)}
              />
            </div>
          ))
        )}
      </div>

    </div>
  );
}
