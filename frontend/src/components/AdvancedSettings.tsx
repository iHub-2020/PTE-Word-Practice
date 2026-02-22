import { useAppStore } from '../store/appStore';
import { Settings, RotateCcw, X, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { showToast } from '../lib/utils';

interface AdvancedSettingsProps {
  onClose?: () => void;
}

/**
 * 平滑滑块 Hook：拖拽过程中使用本地 state，
 * 松手后才提交到 Zustand store，避免高频 re-render 导致卡顿。
 */
function useSmoothSlider(storeValue: number, onCommit: (v: number) => void) {
  const [localValue, setLocalValue] = useState(storeValue);
  const isDragging = useRef(false);

  // 当外部 store 值改变时（如重置），同步本地值
  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(storeValue);
    }
  }, [storeValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    isDragging.current = true;
    setLocalValue(parseFloat(e.target.value));
  }, []);

  const handleCommit = useCallback(() => {
    isDragging.current = false;
    onCommit(localValue);
  }, [localValue, onCommit]);

  return { localValue, handleChange, handleCommit };
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

  // --- 平滑滑块 ---
  const wordRepeatSlider = useSmoothSlider(
    playbackConfig.enableWordRepeat ? playbackConfig.wordRepeat : 1,
    useCallback((v: number) => updateConfig({ wordRepeat: v, enableWordRepeat: v > 1 }), [updateConfig])
  );

  const listLoopsSlider = useSmoothSlider(
    playbackConfig.enableListLoop ? playbackConfig.listLoops : 1,
    useCallback((v: number) => updateConfig({ listLoops: v, enableListLoop: v > 1 }), [updateConfig])
  );

  const playIntervalSlider = useSmoothSlider(
    playbackConfig.playInterval,
    useCallback((v: number) => updateConfig({ playInterval: v }), [updateConfig])
  );

  const spellDelaySlider = useSmoothSlider(
    playbackConfig.spellDelay,
    useCallback((v: number) => updateConfig({ spellDelay: v }), [updateConfig])
  );

  const meaningDelaySlider = useSmoothSlider(
    playbackConfig.meaningDelay,
    useCallback((v: number) => updateConfig({ meaningDelay: v }), [updateConfig])
  );

  const sliderClass = "flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-smooth";

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
                {wordRepeatSlider.localValue} 次
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={wordRepeatSlider.localValue}
                onChange={wordRepeatSlider.handleChange}
                onMouseUp={wordRepeatSlider.handleCommit}
                onTouchEnd={wordRepeatSlider.handleCommit}
                className={sliderClass}
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {wordRepeatSlider.localValue > 1 ? `${wordRepeatSlider.localValue}次` : '关闭'}
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
                {listLoopsSlider.localValue} 次
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={listLoopsSlider.localValue}
                onChange={listLoopsSlider.handleChange}
                onMouseUp={listLoopsSlider.handleCommit}
                onTouchEnd={listLoopsSlider.handleCommit}
                className={sliderClass}
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {listLoopsSlider.localValue > 1 ? `${listLoopsSlider.localValue}次` : '关闭'}
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
                {playIntervalSlider.localValue.toFixed(1)} 秒
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={playIntervalSlider.localValue}
                onChange={playIntervalSlider.handleChange}
                onMouseUp={playIntervalSlider.handleCommit}
                onTouchEnd={playIntervalSlider.handleCommit}
                className={sliderClass}
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {playIntervalSlider.localValue}s
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
                {spellDelaySlider.localValue.toFixed(1)} 秒
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={spellDelaySlider.localValue}
                onChange={spellDelaySlider.handleChange}
                onMouseUp={spellDelaySlider.handleCommit}
                onTouchEnd={spellDelaySlider.handleCommit}
                className={sliderClass}
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {spellDelaySlider.localValue}s
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
                {meaningDelaySlider.localValue.toFixed(1)} 秒
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={meaningDelaySlider.localValue}
                onChange={meaningDelaySlider.handleChange}
                onMouseUp={meaningDelaySlider.handleCommit}
                onTouchEnd={meaningDelaySlider.handleCommit}
                className={sliderClass}
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {meaningDelaySlider.localValue}s
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
