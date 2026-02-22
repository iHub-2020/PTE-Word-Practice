import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { Play, Pause, Repeat, Shuffle, Volume2, VolumeX, AlertCircle, Download, Music, Trash2, Music2 } from 'lucide-react';
import { showToast } from '../lib/utils';

interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  duration: string;
  url: string;
  isCustom?: boolean;
  uploadedAt?: Date;
}

// 预设音乐 - 清空，因为没有实际的音频文件
const JAZZ_TRACKS: MusicTrack[] = [];
const MORNING_TRACKS: MusicTrack[] = [];

export default function MusicPlayer() {
  const {
    musicEnabled,
    musicVolume,
    musicAutoMix,
    musicLoop,
    currentMusicCategory,
    currentMusicIndex,
    toggleMusic,
    setMusicVolume,
    setMusicCategory,
    setMusicIndex,
    toggleMusicAutoMix,
    toggleMusicLoop,
  } = useAppStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 平滑音量滑块：拖拽中使用本地 state，松手后才提交
  const [localVolume, setLocalVolume] = useState(musicVolume);
  const isDraggingVolume = useRef(false);

  useEffect(() => {
    if (!isDraggingVolume.current) {
      setLocalVolume(musicVolume);
    }
  }, [musicVolume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    isDraggingVolume.current = true;
    const v = parseFloat(e.target.value);
    setLocalVolume(v);
    // 实时更新音频音量以获得即时反馈
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  const handleVolumeCommit = useCallback(() => {
    isDraggingVolume.current = false;
    setMusicVolume(localVolume);
  }, [localVolume, setMusicVolume]);

  const tracks = useMemo(() => {
    if (currentMusicCategory === 'jazz') {
      return [...JAZZ_TRACKS, ...customTracks];
    }
    return [...MORNING_TRACKS, ...customTracks];
  }, [currentMusicCategory, customTracks]);

  const playNext = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIndex = (currentMusicIndex + 1) % tracks.length;
    setMusicIndex(nextIndex);
    setCurrentTrack(tracks[nextIndex]);
  }, [currentMusicIndex, tracks, setMusicIndex]);

  const playPrev = useCallback(() => {
    if (tracks.length === 0) return;
    const prevIndex = (currentMusicIndex - 1 + tracks.length) % tracks.length;
    setMusicIndex(prevIndex);
    setCurrentTrack(tracks[prevIndex]);
  }, [currentMusicIndex, tracks, setMusicIndex]);

  const playNextRef = useRef(playNext);
  const playPrevRef = useRef(playPrev);

  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playPrevRef.current = playPrev; }, [playPrev]);

  const musicAutoMixRef = useRef(musicAutoMix);
  const musicLoopRef = useRef(musicLoop);

  useEffect(() => { musicAutoMixRef.current = musicAutoMix; }, [musicAutoMix]);
  useEffect(() => { musicLoopRef.current = musicLoop; }, [musicLoop]);

  // 仅在挂载时创建 Audio 元素（不在 volume/loop 变化时销毁重建）
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = musicVolume;
    audioRef.current.loop = musicLoop;

    audioRef.current.onended = () => {
      if (musicAutoMixRef.current) {
        playNextRef.current();
      } else if (musicLoopRef.current) {
        audioRef.current?.play().catch(() => { });
      } else {
        setIsPlaying(false);
      }
    };

    audioRef.current.onerror = () => {
      setAudioError('音频加载失败');
      setIsPlaying(false);
      setIsLoading(false);
    };

    audioRef.current.oncanplaythrough = () => setIsLoading(false);
    audioRef.current.onwaiting = () => setIsLoading(true);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 音量变化时仅更新属性，不重建 Audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // 循环模式变化时仅更新属性，不重建 Audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = musicLoop;
    }
  }, [musicLoop]);

  // 关闭背景音乐时暂停音频
  useEffect(() => {
    if (!musicEnabled && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [musicEnabled]);

  // 组件挂载时从服务器加载已上传的音乐列表
  useEffect(() => {
    const fetchMusicList = async () => {
      try {
        const response = await fetch('/api/music/list');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const serverTracks: MusicTrack[] = result.data.map((t: { filename: string; title: string; url: string; size: number }) => ({
              id: `custom-${t.filename}`,
              title: t.title,
              duration: '--:--',
              url: t.url,
              isCustom: true,
            }));
            setCustomTracks(serverTracks);
          }
        }
      } catch (err) {
        console.error('获取音乐列表失败:', err);
      }
    };
    fetchMusicList();
  }, []);

  useEffect(() => {
    if (tracks.length > 0) {
      setCurrentTrack(tracks[0]);
      setMusicIndex(0);
    } else {
      setCurrentTrack(null);
    }
    setAudioError(null);
  }, [currentMusicCategory, tracks, setMusicIndex]);

  const handlePlay = useCallback(async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack) {
        showToast('请先上传音乐文件', 'info');
        return;
      }
      setIsLoading(true);
      setAudioError(null);
      try {
        audioRef.current.src = currentTrack.url;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('播放音乐失败:', error);
        setAudioError('无法播放此音频');
        showToast('背景音乐功能需要音频文件支持', 'info');
      } finally {
        setIsLoading(false);
      }
    }
  }, [isPlaying, currentTrack]);

  const handleTrackSelect = useCallback((index: number) => {
    if (!tracks[index]) return;
    setMusicIndex(index);
    setCurrentTrack(tracks[index]);
    setAudioError(null);
    if (musicEnabled && isPlaying && audioRef.current && tracks[index]) {
      audioRef.current.src = tracks[index].url;
      audioRef.current.play().catch(() => setAudioError('音频加载失败'));
    }
  }, [tracks, musicEnabled, isPlaying, setMusicIndex]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
    if (!allowedTypes.includes(file.type)) {
      showToast('请选择有效的音频文件 (MP3, WAV, OGG, M4A)', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast('文件大小不能超过50MB', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', currentMusicCategory);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/music/upload', { method: 'POST', body: formData });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        const newTrack: MusicTrack = {
          id: `custom-${data.filename || data.trackId}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          duration: data.duration || '--:--',
          url: data.url,
          isCustom: true,
          uploadedAt: new Date(),
        };
        setCustomTracks(prev => [...prev, newTrack]);
        showToast('音乐导入成功', 'success');
      } else if (response.status === 413) {
        showToast('文件过大，请选择小于50MB的文件', 'error');
      } else {
        try {
          const error = await response.json();
          showToast(error.error || error.message || '上传失败', 'error');
        } catch {
          showToast(`上传失败 (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('上传失败:', error);
      showToast('上传失败，请重试', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('确定要删除这首音乐吗？')) return;
    try {
      const response = await fetch(`/api/music/${trackId}`, { method: 'DELETE' });
      if (response.ok) {
        setCustomTracks(prev => prev.filter(t => t.id !== trackId));
        showToast('音乐已删除', 'success');
      } else {
        showToast('删除失败', 'error');
      }
    } catch (error) {
      console.error('删除失败:', error);
      showToast('删除失败，请重试', 'error');
    }
  };

  if (!musicEnabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <button onClick={toggleMusic} className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
          <Music className="h-5 w-5" />
          <span>启用背景音乐</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-primary" />
          <span className="font-medium text-gray-900 dark:text-white">背景音乐</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isUploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
          >
            {isUploading ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Download className="h-4 w-4" />}
            <span>导入</span>
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          <button onClick={toggleMusic} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="关闭背景音乐">
            <VolumeX className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="flex-1">上传中... {uploadProgress}%</span>
          </div>
          <div className="mt-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setMusicCategory('jazz')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${currentMusicCategory === 'jazz' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
          Jazz
        </button>
        <button onClick={() => setMusicCategory('morning')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${currentMusicCategory === 'morning' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
          Morning
        </button>
      </div>

      {audioError && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{audioError}</span>
          </div>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Music className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无音乐</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">点击上方"导入"按钮上传音乐</p>
          </div>
        ) : tracks.map((track, index) => (
          <div key={track.id} className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index === currentMusicIndex ? 'bg-primary/5' : ''}`}>
            <button onClick={() => handleTrackSelect(index)} className="flex items-center gap-2 flex-1 text-left">
              {index === currentMusicIndex && isPlaying ? (
                <div className="flex items-center gap-0.5">
                  <span className="w-1 h-3 bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              ) : <Play className="h-3 w-3 text-gray-400" />}
              <span className={`text-sm ${index === currentMusicIndex ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{track.title}</span>
              {track.isCustom && <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">自定义</span>}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">{track.duration}</span>
              {track.isCustom && <button onClick={() => handleDeleteTrack(track.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors" title="删除"><Trash2 className="h-3 w-3 text-red-500" /></button>}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="h-4 w-4 text-gray-400" />
          <input type="range" min="0" max="1" step="0.01" value={localVolume}
            onChange={handleVolumeChange}
            onMouseUp={handleVolumeCommit}
            onTouchEnd={handleVolumeCommit}
            className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer slider-smooth" />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={toggleMusicLoop} className={`p-1.5 rounded-lg transition-colors ${musicLoop ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`} title="循环播放"><Repeat className="h-4 w-4" /></button>
          <button onClick={playPrev} disabled={tracks.length === 0} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
            <Play className="h-4 w-4 rotate-180 text-gray-700 dark:text-gray-300" />
          </button>
          <button onClick={handlePlay} disabled={isLoading || tracks.length === 0}
            className="p-3 rounded-full bg-primary hover:bg-secondary text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
          <button onClick={playNext} disabled={tracks.length === 0} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
            <Play className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button onClick={toggleMusicAutoMix} className={`p-1.5 rounded-lg transition-colors ${musicAutoMix ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`} title="自动播放下一首"><Shuffle className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}