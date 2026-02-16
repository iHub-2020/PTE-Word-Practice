import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import LibraryPanel from './components/LibraryPanel';
import PlayerPanel from './components/PlayerPanel';
import MusicPlayer from './components/MusicPlayer';
import BackgroundAnimation from './components/BackgroundAnimation';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppStore } from './store/appStore';
import { wordApi } from './services/api';
import type { Statistics } from './types';

function App() {
  const { fetchWords } = useAppStore();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch words on mount
  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const data = await wordApi.getStatistics();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background Animation */}
      <BackgroundAnimation />

      {/* Toast Notifications */}
      <Toast />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <Navbar onStatsUpdate={fetchStats} />

        {/* Main Layout */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Player - first on mobile (order-1), center on desktop (order-2) */}
            <div className="lg:col-span-4 xl:col-span-5 order-1 lg:order-2 lg:sticky lg:top-20 lg:z-20">
              <ErrorBoundary
                fallback={
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">播放器加载失败</p>
                  </div>
                }
              >
                <PlayerPanel />
              </ErrorBoundary>
            </div>

            {/* Left Sidebar - Library - third on mobile (order-3), left on desktop (order-1) */}
            <div className="lg:col-span-5 xl:col-span-4 order-3 lg:order-1">
              <ErrorBoundary
                fallback={
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">词库面板加载失败</p>
                  </div>
                }
              >
                <LibraryPanel />
              </ErrorBoundary>
            </div>

            {/* Right Sidebar - Music & Stats - second on mobile (order-2), right on desktop (order-3) */}
            <div className="lg:col-span-3 xl:col-span-3 space-y-6 order-2 lg:order-3">

              {/* Music Player */}
              <ErrorBoundary
                fallback={
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-gray-500 dark:text-gray-400">音乐播放器加载失败</p>
                  </div>
                }
              >
                <MusicPlayer />
              </ErrorBoundary>

              {/* Quick Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  统计
                </h3>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : stats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">单词总数</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {stats.total_words || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">已复习</span>
                      <span className="font-medium text-green-600">
                        {stats.reviewed_words || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">复习率</span>
                      <span className="font-medium text-primary">
                        {stats.total_words > 0
                          ? Math.round((stats.reviewed_words / stats.total_words) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    暂无数据
                  </div>
                )}
              </div>

            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 mt-8 py-4">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Word Practice App - 学习英语/中文单词的利器</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
