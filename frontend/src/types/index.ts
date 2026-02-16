export interface Word {
  id: number;
  word: string;
  meaning: string;
  phonetic?: string;
  example?: string;
  language: 'en' | 'zh';
  difficulty: number;
  review_count: number;
  last_reviewed: string | null;
  created_at: string;
  updated_at: string;
}

export interface Statistics {
  total_words: number;
  reviewed_words: number;
  unreviewed_words: number;
  english_words: number;
  chinese_words: number;
}

export interface PlaybackConfig {
  wordRepeat: number;
  enableWordRepeat: boolean;
  listLoops: number;
  enableListLoop: boolean;
  spellMode: boolean;
  autoMeaning: boolean;
  continuousPlay: boolean;
  playInterval: number;
  spellDelay: number;
  meaningDelay: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  category: 'jazz' | 'morning';
  url: string;
}
