import { useAppStore } from '../store/appStore';
import { wordApi } from '../services/api';
import { showToast } from '../lib/utils';
import {
  Sun,
  Moon,
  BarChart3,
  Settings,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { useState, useRef } from 'react';

interface NavbarProps {
  onStatsUpdate?: () => void;
}

export default function Navbar({ onStatsUpdate }: NavbarProps) {
  const {
    theme,
    toggleTheme,
    fetchWords
  } = useAppStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await wordApi.exportCSV();
      showToast('导出成功！', 'success');
    } catch {
      showToast('导出失败，请重试', 'error');
    }
    setShowExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await wordApi.importCSV(file);
      showToast(`成功导入 ${count} 个单词！`, 'success');
      fetchWords();
      onStatsUpdate?.();
    } catch {
      showToast('导入失败，请检查文件格式', 'error');
    }
    setShowDataMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = async () => {
    if (!confirm('警告：此操作将删除所有单词，无法恢复！\n\n确定要清空词库吗？')) {
      return;
    }
    if (!confirm('最后确认：真的要删除所有单词吗？')) {
      return;
    }

    try {
      const count = await wordApi.clearAll();
      showToast(`成功删除 ${count} 个单词！`, 'success');
      fetchWords();
      onStatsUpdate?.();
    } catch {
      showToast('清空失败，请重试', 'error');
    }
    setShowDataMenu(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-2">
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            PTE Word Practice
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* Statistics */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Statistics"
          >
            <BarChart3 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Data Management Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Data Management"
            >
              <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>

            {showDataMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDataMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 animate-fade-in">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    导入CSV
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    清空所有
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="ml-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Upload className="h-4 w-4" />
              导出CSV
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 animate-fade-in">
                  <button
                    onClick={handleExport}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    导出为CSV
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
