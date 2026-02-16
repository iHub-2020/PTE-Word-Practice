import type { Word, Statistics } from '../types';
import { API_BASE } from '../lib/utils';
import { toast } from '../store/toastStore';

// 通用 fetch 包装器
const fetchApi = async <T>(
  url: string,
  options?: RequestInit,
  errorMessage: string = '操作失败'
): Promise<T> => {
  try {
    const res = await fetch(url, options);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    // 检查是否是204 No Content
    if (res.status === 204) {
      return undefined as T;
    }
    
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.error || errorMessage);
    }
    
    return data.data || data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      toast.error('网络连接失败，请检查网络');
    }
    throw error;
  }
};

export const wordApi = {
  // 获取单词列表
  async getWords(language?: string): Promise<Word[]> {
    const url = language ? `${API_BASE}/words?language=${language}` : `${API_BASE}/words`;
    return fetchApi<Word[]>(url, undefined, '获取单词列表失败');
  },

  // 添加单词
  async addWord(word: Partial<Word>): Promise<Word> {
    const res = await fetch(`${API_BASE}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(word),
    });
    const data = await res.json();
    
    if (data.success) {
      toast.success('单词添加成功');
      return data.data;
    } else {
      toast.error(data.error || '添加单词失败');
      throw new Error(data.error);
    }
  },

  // 更新单词
  async updateWord(id: number, word: Partial<Word>): Promise<Word> {
    const res = await fetch(`${API_BASE}/words/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(word),
    });
    const data = await res.json();
    
    if (data.success) {
      toast.success('单词更新成功');
      return data.data;
    } else {
      toast.error(data.error || '更新单词失败');
      throw new Error(data.error);
    }
  },

  // 删除单词
  async deleteWord(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/words/${id}`, { method: 'DELETE' });
    const data = await res.json();
    
    if (data.success) {
      toast.success('单词删除成功');
    } else {
      toast.error(data.error || '删除单词失败');
      throw new Error(data.error);
    }
  },

  // 标记复习
  async markReviewed(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/words/${id}/review`, { method: 'POST' });
    const data = await res.json();
    
    if (!data.success) {
      toast.error(data.error || '标记复习失败');
      throw new Error(data.error);
    }
  },

  // 获取统计
  async getStatistics(): Promise<Statistics> {
    return fetchApi<Statistics>(`${API_BASE}/statistics`, undefined, '获取统计信息失败');
  },

  // 导出CSV
  async exportCSV(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' }),
      });
      
      if (!res.ok) throw new Error('导出失败');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `words_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
      throw error;
    }
  },

  // 导入CSV
  async importCSV(file: File): Promise<number> {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        const count = parseInt(data.message.match(/\d+/)?.[0] || '0');
        toast.success(`成功导入 ${count} 个单词`);
        return count;
      } else {
        toast.error(data.error || '导入失败');
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('导入失败');
      throw error;
    }
  },

  // 清空所有
  async clearAll(): Promise<number> {
    const res = await fetch(`${API_BASE}/words/clear-all`, { method: 'DELETE' });
    const data = await res.json();
    
    if (data.success) {
      toast.success(`已删除 ${data.deleted_count} 个单词`);
      return data.deleted_count;
    } else {
      toast.error(data.error || '清空失败');
      throw new Error(data.error);
    }
  },
};

export const audioApi = {
  // 获取单词音频
  getWordAudioUrl(id: number, spell: boolean = false, spellDelay: number = 0.5): string {
    return `${API_BASE}/words/${id}/audio?spell=${spell}&spell_delay=${spellDelay}`;
  },

  // 获取含义音频
  async playMeaning(text: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: 'zh' }),
      });
      
      if (res.status === 204) return; // No content
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('播放含义失败:', error);
      // 不显示 toast，因为含义播放失败不应该打断用户体验
    }
  },
};
