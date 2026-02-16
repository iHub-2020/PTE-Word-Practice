import type { Word } from '../types';
import { Play, Volume2, Check, Pencil, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { wordApi } from '../services/api';
import { showToast } from '../lib/utils';
import { useState } from 'react';

interface WordCardProps {
  word: Word;
  isActive: boolean;
  onPlay: (word: Word) => void;
  onPlayPronunciation: (word: Word) => void;
}

export default function WordCard({ word, isActive, onPlay, onPlayPronunciation }: WordCardProps) {
  const { fetchWords } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editWord, setEditWord] = useState(word.word);
  const [editMeaning, setEditMeaning] = useState(word.meaning);

  const handleMarkReviewed = async () => {
    try {
      await wordApi.markReviewed(word.id);
      showToast('已标记为复习', 'success');
      fetchWords();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除单词 "${word.word}" 吗？`)) return;

    try {
      await wordApi.deleteWord(word.id);
      showToast('删除成功', 'success');
      fetchWords();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await wordApi.updateWord(word.id, {
        word: editWord,
        meaning: editMeaning,
      });
      showToast('更新成功', 'success');
      setIsEditing(false);
      fetchWords();
    } catch {
      showToast('更新失败', 'error');
    }
  };

  const formatMeaning = (text: string) => {
    if (!text) return '';
    return text
      .replace(/(\d+\.)/g, '<br>$1')
      .replace(/时\s*态[:：]?/g, '<br>时态:')
      .replace(/复\s*数[:：]?/g, '<br>复数:')
      .replace(/比\s*较\s*级[:：]?/g, '<br>比较级:')
      .replace(/最\s*高\s*级[:：]?/g, '<br>最高级:')
      .replace(/^<br>/, '');
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-primary animate-fade-in">
        <div className="space-y-3">
          <input
            type="text"
            value={editWord}
            onChange={(e) => setEditWord(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            placeholder="单词"
          />
          <textarea
            value={editMeaning}
            onChange={(e) => setEditMeaning(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            rows={3}
            placeholder="含义"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 border transition-all duration-200 hover:shadow-md ${isActive
        ? 'border-primary shadow-md'
        : 'border-gray-200 dark:border-gray-700'
        }`}
    >
      <div>
        {/* Header: Word + Action Buttons */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-xl font-bold text-primary">{word.word}</h3>
          {word.phonetic && (
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {word.phonetic}
            </span>
          )}
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
            {word.language.toUpperCase()}
          </span>

          {/* Action Buttons - pushed to right */}
          <div className="ml-auto flex gap-1 flex-shrink-0">
            <button
              onClick={() => onPlay(word)}
              className="p-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-primary transition-colors"
              title="播放完整"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPlayPronunciation(word)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="仅发音"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleMarkReviewed}
              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors"
              title="标记复习"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
              title="编辑"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Meaning - full width */}
        <div
          className="text-sm text-gray-600 dark:text-gray-300 mb-2 text-left"
          dangerouslySetInnerHTML={{ __html: formatMeaning(word.meaning) }}
        />

        {word.example && (
          <p className="text-xs italic text-gray-400 dark:text-gray-500">
            "{word.example}"
          </p>
        )}
      </div>
    </div>
  );
}
