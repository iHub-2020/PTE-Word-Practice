import { useAppStore } from '../store/appStore';
import { Settings, RotateCcw, X, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { showToast } from '../lib/utils';

interface AdvancedSettingsProps {
  onClose?: () => void;
}

export default function AdvancedSettings({ onClose }: AdvancedSettingsProps) {
  const { playbackConfig, updateConfig } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ fileCount: number; totalSizeMB: number } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const fetchCacheInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/cache/info');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setCacheInfo({ fileCount: data.fileCount, totalSizeMB: data.totalSizeMB });
      }
    } catch { /* 静默 */ }
  }, []);

  useEffect(() => {
    if (isExpanded) fetchCacheInfo();
  }, [isExpanded, fetchCacheInfo]);

  const handleClearCache = async () => {
    if (!confirm('确定要清空所有音频缓存吗？清空后首次播放每个单词时需要重新生成。')) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/cache/clear', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        showToast(`已清空 ${data.deleted} 个缓存文件`, 'success');
        setCacheInfo({ fileCount: 0, totalSizeMB: 0 });
      } else {
        showToast('清空缓存失败', 'error');
      }
    } catch {
      showToast('清空缓存失败', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleReset = () => {
    updateConfig({
      wordRepeat: 3,
      enableWordRepeat: true,
      listLoops: 1,
      enableListLoop: true,
      spellMode: true,
      autoMeaning: true,
      continuousPlay: true,
      playInterval: 0.5,
      spellDelay: 0.5,
      meaningDelay: 1,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* Header - Clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <span className="font-medium text-gray-900 dark:text-white">高级设置</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Show active indicators */}
          {(playbackConfig.enableWordRepeat || playbackConfig.playInterval !== 2 || playbackConfig.spellDelay !== 0.5) && (
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              已配置
            </span>
          )}
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700">

          {/* Word Repeat Settings */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                单词重复次数
              </label>
              <span className="text-sm font-bold text-primary">
                {playbackConfig.enableWordRepeat ? playbackConfig.wordRepeat : 1} 次
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={playbackConfig.enableWordRepeat ? playbackConfig.wordRepeat : 1}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateConfig({
                    wordRepeat: value,
                    enableWordRepeat: value > 1
                  });
                }}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {playbackConfig.enableWordRepeat ? `${playbackConfig.wordRepeat}次` : '关闭'}
              </span>
            </div>
          </div>

          {/* List Loop Settings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                列表循环次数
              </label>
              <span className="text-sm font-bold text-primary">
                {playbackConfig.enableListLoop ? playbackConfig.listLoops : 1} 次
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={playbackConfig.enableListLoop ? playbackConfig.listLoops : 1}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateConfig({
                    listLoops: value,
                    enableListLoop: value > 1
                  });
                }}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {playbackConfig.enableListLoop ? `${playbackConfig.listLoops}次` : '关闭'}
              </span>
            </div>
          </div>

          {/* Play Interval */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                单词切换间隔
              </label>
              <span className="text-sm font-bold text-primary">
                {playbackConfig.playInterval.toFixed(1)} 秒
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={playbackConfig.playInterval}
                onChange={(e) => updateConfig({ playInterval: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {playbackConfig.playInterval}s
              </span>
            </div>
          </div>

          {/* Spell Delay */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                拼读字母间隔
              </label>
              <span className="text-sm font-bold text-primary">
                {playbackConfig.spellDelay.toFixed(1)} 秒
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={playbackConfig.spellDelay}
                onChange={(e) => updateConfig({ spellDelay: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {playbackConfig.spellDelay}s
              </span>
            </div>
          </div>

          {/* Meaning Delay */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                含义切换间隔
              </label>
              <span className="text-sm font-bold text-primary">
                {playbackConfig.meaningDelay.toFixed(1)} 秒
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={playbackConfig.meaningDelay}
                onChange={(e) => updateConfig({ meaningDelay: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {playbackConfig.meaningDelay}s
              </span>
            </div>
          </div>

          {/* 音频缓存管理 */}
          <div className="pt-3 mt-1 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">音频缓存</span>
              {cacheInfo && (
                <span className="text-xs text-gray-400">
                  {cacheInfo.fileCount} 个文件 · {cacheInfo.totalSizeMB} MB
                </span>
              )}
            </div>
            <button
              onClick={handleClearCache}
              disabled={isClearing || (cacheInfo?.fileCount === 0)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isClearing ? '清空中...' : '清空缓存'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>重置默认</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-primary hover:bg-secondary rounded-lg transition-colors text-white text-sm"
              >
                <X className="h-4 w-4" />
                <span>关闭</span>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
