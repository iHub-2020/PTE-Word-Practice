import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { audioApi } from '../services/api';
import type { Word } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
} from 'lucide-react';
import AdvancedSettings from './AdvancedSettings';

// 播放步骤类型
type PlayStep = 'pronunciation' | 'spelling' | 'meaning' | 'complete' | 'waiting';

export default function PlayerPanel() {
  const {
    words,
    currentWordIndex,
    isPlaying,
    playbackConfig,
    setCurrentWordIndex,
    togglePlay,
    updateConfig,
  } = useAppStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const meaningAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 跟踪当前单词的循环次数和步骤
  const currentRepeatCountRef = useRef<number>(0);
  const currentStepRef = useRef<PlayStep>('pronunciation');
  const currentListLoopCountRef = useRef<number>(0);
  const completedWordsRef = useRef<Set<number>>(new Set());

  // 防止竞态条件
  const isProcessingRef = useRef<boolean>(false);

  // 标记是否正在正常播放流程中，避免 cleanup 干扰
  const isPlayingNormallyRef = useRef<boolean>(false);

  // 标记自动切换（使用 playInterval）vs 用户操作（100ms 快速启动）
  const isAutoTransitionRef = useRef<boolean>(false);

  // 持久化当前单词，避免在异步回调中引用失效
  const currentWordRef = useRef<Word | null>(null);
  const currentWord = words[currentWordIndex];

  // ★ 将所有播放流程中使用的可变状态转为 ref，彻底消除闭包过期问题
  const currentWordIndexRef = useRef(currentWordIndex);
  const playbackConfigRef = useRef(playbackConfig);
  const wordsLengthRef = useRef(words.length);

  useEffect(() => { currentWordIndexRef.current = currentWordIndex; }, [currentWordIndex]);
  useEffect(() => { playbackConfigRef.current = playbackConfig; }, [playbackConfig]);
  useEffect(() => { wordsLengthRef.current = words.length; }, [words.length]);

  // Wake Lock: 防止手机息屏中断播放
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ★ 核心修复：使用 ref 保存最新的回调引用，解决 Audio onended 闭包过期问题
  const handleAudioEndRef = useRef<() => void>(() => { });

  // 安全清除 audio src，不触发 onerror
  const safeResetAudio = useCallback((audio: HTMLAudioElement) => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }, []);

  // 清理所有待处理的操作
  // force=true 时无视 isPlayingNormallyRef 保护（用于用户手动切换单词）
  const cleanup = useCallback((force: boolean = false) => {
    // 保护：在正常播放流程中，不要清理（除非强制）
    if (!force && isPlayingNormallyRef.current) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (audioRef.current) {
      safeResetAudio(audioRef.current);
    }
    if (meaningAudioRef.current) {
      safeResetAudio(meaningAudioRef.current);
    }
    isProcessingRef.current = false;
    isPlayingNormallyRef.current = false;
  }, [safeResetAudio]);

  // 播放音频（发音或拼读）
  const playMainAudio = useCallback(async (spellMode: boolean = false) => {
    const word = currentWordRef.current;
    if (!word) return;

    // 标记正在正常播放流程中
    isPlayingNormallyRef.current = true;

    // 只停止主音频，不调用 cleanup 避免清空含义音频时触发 error
    if (audioRef.current) {
      audioRef.current.pause();
    }
    isProcessingRef.current = true;

    try {
      const url = audioApi.getWordAudioUrl(
        word.id,
        spellMode,
        playbackConfig.spellDelay
      );

      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        // 自动播放限制，等用户交互
        isProcessingRef.current = false;
        isPlayingNormallyRef.current = false;
      } else {
        isProcessingRef.current = false;
      }
    }
  }, [playbackConfig.spellDelay]);

  // 播放含义
  const playMeaning = useCallback(async () => {
    const word = currentWordRef.current;
    if (!word) return;

    // 安全停止主音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    try {
      // 清洗含义文本，用于 TTS 朗读
      const plainMeaning = word.meaning
        .replace(/<[^>]+>/g, ' ')           // 去除 HTML 标签
        // 去除附加含义段落（时态、复数、比较级等）
        .replace(/时\s*态[:：].*/gs, '')
        .replace(/复\s*数[:：].*/gs, '')
        .replace(/比较级[:：].*/gs, '')
        .replace(/最高级[:：].*/gs, '')
        .replace(/副\s*词[:：].*/gs, '')
        .replace(/名\s*词[:：].*/gs, '')
        .replace(/形容词[:：].*/gs, '')
        .replace(/反义词[:：].*/gs, '')
        .replace(/同义词[:：].*/gs, '')
        // 词性缩写 → 中文全称
        .replace(/\bvt\.\s*/g, '及物动词 ')
        .replace(/\bvi\.\s*/g, '不及物动词 ')
        .replace(/\bn\.\s*/g, '名词 ')
        .replace(/\badj\.\s*/g, '形容词 ')
        .replace(/\badv\.\s*/g, '副词 ')
        .replace(/\bprep\.\s*/g, '介词 ')
        .replace(/\bconj\.\s*/g, '连词 ')
        .replace(/\bpron\.\s*/g, '代词 ')
        .replace(/\bint\.\s*/g, '感叹词 ')
        // 去除括号及其内容
        .replace(/[（(][^）)]*[）)]/g, '')
        // 序号前添加停顿
        .replace(/(\d+)\.\s*/g, '，$1，')
        .replace(/^，/, '')
        // 分号→逗号（TTS 停顿）
        .replace(/[;；]/g, '，')
        // 清理多余标点和空白
        .replace(/[，,]{2,}/g, '，')
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，第]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!plainMeaning || plainMeaning.length < 2) {
        handleAudioEndRef.current();
        return;
      }

      isProcessingRef.current = true;

      // 使用 TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainMeaning, lang: 'zh' })
      });

      if (response.status === 204) {
        handleAudioEndRef.current();
        return;
      }

      if (!response.ok) {
        throw new Error(`TTS fail: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (meaningAudioRef.current) {
        meaningAudioRef.current.src = url;
        await meaningAudioRef.current.play();
        URL.revokeObjectURL(url);
      }
    } catch {
      handleAudioEndRef.current();
    }
  }, [currentWord]);

  // 处理音频播放结束
  const handleAudioEnd = useCallback(() => {
    const config = playbackConfigRef.current;
    const { autoMeaning } = config;
    // Fix: Play meaning if autoMeaning is enabled, regardless of repeat count
    const shouldPlayMeaning = autoMeaning;

    switch (currentStepRef.current) {
      case 'pronunciation':
        // 发音播放完毕
        if (config.spellMode) {
          // 启用拼读模式 → 播放拼读
          currentStepRef.current = 'spelling';
          timeoutRef.current = setTimeout(() => {
            playMainAudio(true);
          }, config.playInterval * 1000);
        } else if (shouldPlayMeaning) {
          // 不拼读，直接播放含义
          currentStepRef.current = 'meaning';
          timeoutRef.current = setTimeout(() => {
            playMeaning();
          }, config.playInterval * 1000);
        } else {
          // 不拼读也不读含义，直接重复或下一个
          handleRepeatOrNext();
        }
        break;

      case 'spelling':
        // 拼读播放完毕 → 播放含义（如果启用）
        if (shouldPlayMeaning) {
          currentStepRef.current = 'meaning';
          timeoutRef.current = setTimeout(() => {
            playMeaning();
          }, config.meaningDelay * 1000);
        } else {
          handleRepeatOrNext();
        }
        break;

      case 'meaning':
        // 含义播放完毕
        handleRepeatOrNext();
        break;

      case 'complete':
        // 当前单词播放完毕，进入下一个单词
        handleNextWord();
        break;

      case 'waiting':
        isProcessingRef.current = false;
        break;
    }
  }, [playMainAudio, playMeaning]);

  // 处理循环或下一个单词
  const handleRepeatOrNext = useCallback(() => {
    const config = playbackConfigRef.current;
    const { enableWordRepeat, wordRepeat } = config;
    const actualRepeatCount = enableWordRepeat ? wordRepeat : 1;

    if (currentRepeatCountRef.current < actualRepeatCount - 1) {
      // 还需要重复，增加循环次数并重新开始
      currentRepeatCountRef.current += 1;
      currentStepRef.current = 'pronunciation';
      timeoutRef.current = setTimeout(() => {
        playMainAudio(false);
      }, config.playInterval * 1000);
    } else {
      // 循环次数完成，进入下一个单词
      currentStepRef.current = 'complete';
      handleNextWord();
    }
  }, [playMainAudio]);

  // 处理下一个单词
  const handleNextWord = useCallback(() => {
    const config = playbackConfigRef.current;
    const { enableListLoop, listLoops, continuousPlay } = config;
    const idx = currentWordIndexRef.current;
    const len = wordsLengthRef.current;

    // 检查 words 数组是否为空
    if (len === 0) {
      togglePlay();
      return;
    }

    // 标记当前单词已完成
    completedWordsRef.current.add(idx);

    // 重置下一个单词的状态
    currentRepeatCountRef.current = 0;
    currentStepRef.current = 'pronunciation';
    isProcessingRef.current = false;

    // 如果不启用连续播放，停止并等待用户操作
    if (!continuousPlay) {
      return;
    }

    if (idx < len - 1) {
      // 下一个单词
      isAutoTransitionRef.current = true;
      setCurrentWordIndex(idx + 1);
    } else if (enableListLoop) {
      // 检查是否应该继续列表循环
      const allWordsCompleted = completedWordsRef.current.size >= len;

      if (allWordsCompleted && currentListLoopCountRef.current < listLoops - 1) {
        currentListLoopCountRef.current += 1;
        completedWordsRef.current.clear();
        isAutoTransitionRef.current = true;
        setCurrentWordIndex(0);
      } else if (!allWordsCompleted) {
        isAutoTransitionRef.current = true;
        setCurrentWordIndex(0);
      } else {
        // 所有轮次都完成
        togglePlay();
      }
    } else {
      // 到达末尾，不循环，停止播放
      togglePlay();
    }
  }, [setCurrentWordIndex, togglePlay]);

  // ★ 核心修复：始终保持 ref 指向最新的 handleAudioEnd
  useEffect(() => {
    handleAudioEndRef.current = handleAudioEnd;
  }, [handleAudioEnd]);

  // Wake Lock: 播放时防止息屏
  useEffect(() => {
    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch { /* 静默忽略不支持的浏览器 */ }
    };

    if (isPlaying) {
      acquireWakeLock();
    } else {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    }

    return () => {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [isPlaying]);

  // 监听 isPlaying 和 currentWordIndex 变化
  useEffect(() => {
    // 同步更新 currentWordRef
    currentWordRef.current = currentWord;

    if (isPlaying && currentWord) {
      // 重置状态
      currentRepeatCountRef.current = 0;
      currentStepRef.current = 'pronunciation';
      isProcessingRef.current = false;
      isPlayingNormallyRef.current = true;

      // 如果是第一个单词，重置列表循环状态
      if (currentWordIndex === 0) {
        currentListLoopCountRef.current = 0;
        completedWordsRef.current.clear();
      }

      // 开始播放发音（自动切换时使用 playInterval，手动操作 100ms 快启）
      const delay = isAutoTransitionRef.current
        ? playbackConfigRef.current.playInterval * 1000
        : 100;
      isAutoTransitionRef.current = false;
      timeoutRef.current = setTimeout(() => {
        playMainAudio(false);
      }, delay);
    } else if (!isPlaying) {
      isPlayingNormallyRef.current = false;
      cleanup();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying, currentWordIndex, currentWord]);

  // 设置主音频元素
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      const audio = audioRef.current;

      // ★ 使用 ref 间接调用，确保始终执行最新的 handleAudioEnd
      audio.onended = () => {
        handleAudioEndRef.current();
      };

      audio.onerror = () => {
        isProcessingRef.current = false;
      };

      return () => {
        if (audio) {
          audio.pause();
          audio.onended = null;
          audio.onerror = null;
        }
      };
    }
  }, []);

  // 设置含义音频元素
  useEffect(() => {
    if (!meaningAudioRef.current) {
      meaningAudioRef.current = new Audio();
      const audio = meaningAudioRef.current;

      // ★ 使用 ref 间接调用
      audio.onended = () => {
        handleAudioEndRef.current();
      };

      audio.onerror = () => {
        // 即使错误也通过 ref 继续流程
        handleAudioEndRef.current();
      };

      return () => {
        if (audio) {
          audio.pause();
          audio.onended = null;
          audio.onerror = null;
        }
      };
    }
  }, []);

  const handlePrev = () => {
    cleanup(true);  // 强制停止所有音频
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  const handleNext = () => {
    cleanup(true);  // 强制停止所有音频
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    }
  };

  const handlePlayPause = () => {
    togglePlay();
  };

  if (!currentWord && words.length > 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">请选择要播放的单词</p>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">没有单词可播放</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">请先导入单词</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* Current Word Display */}
      <div className="p-6 text-center border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {currentWord.language.toUpperCase()}
          </span>
          {currentWord.phonetic && (
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {currentWord.phonetic}
            </span>
          )}
        </div>

        <h2 className="text-4xl font-bold text-primary mb-3">{currentWord.word}</h2>

        <div
          className="text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto text-left"
          dangerouslySetInnerHTML={{
            __html: currentWord.meaning
              .replace(/(\d+\.)/g, '<br>$1')
              .replace(/时\s*态[:：]?/g, '<br>时态:')
              .replace(/复\s*数[:：]?/g, '<br>复数:')
          }}
        />

        {currentWord.example && (
          <p className="text-sm italic text-gray-400 dark:text-gray-500 mt-3">
            "{currentWord.example}"
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-2">
        <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-primary transition-all duration-300"
            style={{
              width: words.length > 0
                ? `${((currentWordIndex + 1) / words.length) * 100}%`
                : '0%'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>{currentWordIndex + 1}</span>
          <span>{words.length}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-4">

          {/* Shuffle / Continuous Play */}
          <button
            onClick={() => updateConfig({
              continuousPlay: !playbackConfig.continuousPlay,
              enableListLoop: !playbackConfig.continuousPlay
            })}
            className={`p-2 rounded-lg transition-colors ${playbackConfig.enableListLoop
              ? 'bg-primary/10 text-primary'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            title="连续播放"
          >
            <Shuffle className="h-5 w-5" />
          </button>

          {/* Previous */}
          <button
            onClick={handlePrev}
            disabled={currentWordIndex === 0}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="p-4 rounded-full bg-primary hover:bg-secondary text-white transition-colors shadow-lg"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={currentWordIndex >= words.length - 1}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Repeat */}
          <button
            onClick={() => updateConfig({
              enableWordRepeat: !playbackConfig.enableWordRepeat,
              wordRepeat: playbackConfig.enableWordRepeat ? 1 : 3
            })}
            className={`p-2 rounded-lg transition-colors ${playbackConfig.enableWordRepeat
              ? 'bg-primary/10 text-primary'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            title="单词重复"
          >
            <Repeat className="h-5 w-5" />
          </button>

        </div>
      </div>

      {/* Quick Settings */}
      <div className="px-6 pb-4 flex items-center justify-center gap-4 text-sm flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={playbackConfig.spellMode}
            onChange={(e) => updateConfig({ spellMode: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-gray-600 dark:text-gray-400">拼读模式</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={playbackConfig.autoMeaning}
            onChange={(e) => updateConfig({ autoMeaning: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-gray-600 dark:text-gray-400">自动读含义</span>
        </label>

      </div>

      {/* Advanced Settings Panel */}
      <div className="px-4 pb-4">
        <AdvancedSettings />
      </div>

    </div>
  );
}
