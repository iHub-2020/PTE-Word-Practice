import os
import logging
import re
import time
from gtts import gTTS
from gtts.tts import gTTSError
from config import AUDIO_FOLDER, DEFAULT_AUDIO_LANG, AUDIO_CACHE_TIMEOUT, AUDIO_MAX_RETRIES, AUDIO_RETRY_DELAY, AUDIO_REQUEST_TIMEOUT
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AudioService:
    """音频服务类"""
    
    def __init__(self):
        self.audio_folder = AUDIO_FOLDER
        self.logger = logger

    def _sanitize_filename(self, text):
        """清理文件名，移除特殊字符"""
        safe_text = "".join(c for c in text if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
        return safe_text.replace(' ', '_')

    def _get_audio_path(self, text, lang='en', spell_mode=False):
        """生成音频文件路径"""
        safe_text = self._sanitize_filename(text)
        mode_suffix = "_spell" if spell_mode else ""
        filename = f"{safe_text}_{lang}{mode_suffix}.mp3"
        return os.path.join(self.audio_folder, filename)

    def _is_audio_valid(self, filepath):
        """检查音频文件是否有效（未过期）"""
        if not os.path.exists(filepath):
            return False
        
        # 检查文件修改时间
        file_modified = datetime.fromtimestamp(os.path.getmtime(filepath))
        if datetime.now() - file_modified > timedelta(seconds=AUDIO_CACHE_TIMEOUT):
            try:
                os.remove(filepath)
                return False
            except OSError:
                pass
        
        return True

    def _clean_chinese_text(self, text):
        """清理中文文本，移除格式标记并扩展词性缩写"""
        if not text:
            return ""
        
        # 移除角括号、尖括号和方括号
        text = re.sub(r'[<>【】\[\]]', '', text)
        
        # 移除附加语法信息（时态、比较级、副词、名词等）
        # 移除附加语法信息（时态、比较级、副词、名词等）
        # 匹配模式：时态: xxx (匹配到换行符或字符串结束)
        patterns_to_remove = [
            r'时\s*态[:：].*', 
            r'比较级[:：].*',
            r'副\s*词[:：].*',
            r'名\s*词[:：].*',
            r'形容词[:：].*',
            r'反义词[:：].*',
            r'同义词[:：].*',
        ]
        
        for pattern in patterns_to_remove:
            # 使用 re.MULTILINE 确保 ^ 和 $ 也能匹配行首尾（虽然这里主要是一次性处理）
            # 直接替换掉匹配到的内容为空
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # 词性缩写扩展映射表（英文缩写 -> 中文全称）
        pos_mapping = {
            'vt.': '及物动词',
            'vi.': '不及物动词',
            'v.': '动词',
            'n.': '名词',
            'adj.': '形容词',
            'adv.': '副词',
            'prep.': '介词',
            'conj.': '连词',
            'pron.': '代词',
            'int.': '感叹词',
            'art.': '冠词',
            'num.': '数词',
            'aux.': '助动词',
        }
        
        # 替换词性缩写为中文全称
        for abbr, full in pos_mapping.items():
            text = text.replace(abbr, full)
        
        # 移除开头的数字和点（如 "1."、"2."） - 已注释掉保留序号
        # text = re.sub(r'^\d+\.\s*', '', text)
        
        # 移除括号内的内容（如 "(猛力地)"）
        text = re.sub(r'\([^)]*\)', '', text)
        
        # 移除时态和比较级标记
        text = re.sub(r'\b(past|present|future|comparative|superlative)\b', '', text, flags=re.IGNORECASE)
        
        # 清理多余的空格和标点
        text = re.sub(r'\s+', ' ', text).strip()
        text = re.sub(r'[，,]\s*[，,]', '，', text)  # 合并多个逗号
        text = text.strip('，,')
        
        return text

    def _split_chinese_with_pauses(self, text):
        """将中文文本按逗号分割，添加停顿"""
        if not text:
            return ""
        
        # 按逗号分割
        parts = text.split('，')
        # 过滤空部分并添加停顿
        cleaned_parts = [part.strip() for part in parts if part.strip()]
        
        # 如果没有逗号，直接返回原文本
        if len(cleaned_parts) <= 1:
            return text
        
        # 用停顿连接各部分
        return '，'.join(cleaned_parts)

    def generate_audio(self, text, lang=DEFAULT_AUDIO_LANG, spell_mode=False, spell_delay=0.5):
        """生成音频文件"""
        try:
            if not text or not text.strip():
                self.logger.warning("文本为空，无法生成音频")
                return None

            text = text.strip()
            
            # 对于中文，需要特殊处理
            if lang == 'zh':
                text = self._clean_chinese_text(text)
                # 换行符转换为较长的停顿
                text = text.replace('\n', ' ... ... ')
                text = self._split_chinese_with_pauses(text)
            
            if not text:
                self.logger.warning("清理后文本为空，无法生成音频")
                return None
            
            audio_path = self._get_audio_path(text, lang, spell_mode)
            
            # 检查缓存
            if self._is_audio_valid(audio_path):
                self.logger.debug(f"使用缓存音频: {audio_path}")
                return audio_path

            # 生成新音频
            self.logger.info(f"生成新音频: {text} (lang: {lang}, spell: {spell_mode})")
            
            # 对于拼读模式，逐个字母生成
            if spell_mode:
                # 根据 spell_delay 计算停顿字符数量 (每0.5秒约等于1个点)
                pause_count = max(1, int(spell_delay * 2))
                pause_str = ' ' + '.' * pause_count + ' '
                
                # 检查是否为多个单词（如 "world renowned"）
                if ' ' in text:
                    words = text.split()
                    spelled_parts = []
                    for word in words:
                        # 每个单词的字母用停顿分隔
                        spelled_parts.append(pause_str.join(word.upper()))
                    # 单词之间用更长的停顿连接
                    spelled_text = ' ... ... '.join(spelled_parts)
                else:
                    # 单个单词：字母间用停顿分隔
                    spelled_text = pause_str.join(text.upper())
            else:
                spelled_text = text

            # CRITICAL FIX: 添加tld='com'参数，禁用法语等其他语言模块
            # 这样可以避免gTTS加载Francochinois等不需要的语言包
            # 添加重试机制处理网络连接问题
            self.logger.info(f"调用 gTTS: text={spelled_text[:50]}..., lang={lang}")

            max_retries = AUDIO_MAX_RETRIES
            retry_delay = AUDIO_RETRY_DELAY  # seconds
            
            for attempt in range(max_retries):
                try:
                    # 使用 tld='com' 明确使用 Google.com 服务器
                    tts = gTTS(text=spelled_text, lang=lang, slow=False, tld='com')
                    tts.save(audio_path)
                    
                    # 如果成功，跳出重试循环
                    break
                    
                except gTTSError as e:
                    self.logger.warning(f"gTTS API错误 (尝试 {attempt + 1}/{max_retries}): {e}")
                    
                    if attempt < max_retries - 1:
                        self.logger.info(f"等待 {retry_delay} 秒后重试...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # 指数退避
                    else:
                        # 最后一次尝试失败，抛出异常
                        raise
                        
                except Exception as e:
                    self.logger.error(f"音频生成错误 (尝试 {attempt + 1}/{max_retries}): {e}")
                    
                    if attempt < max_retries - 1:
                        self.logger.info(f"等待 {retry_delay} 秒后重试...")
                        time.sleep(retry_delay)
                        retry_delay *= 2
                    else:
                        raise
            
            # 验证文件大小
            if os.path.exists(audio_path):
                file_size = os.path.getsize(audio_path)
                self.logger.info(f"音频生成成功: {audio_path}, 大小: {file_size} bytes")
                if file_size < 100:
                    self.logger.warning(f"音频文件过小，可能生成失败: {audio_path}")
            else:
                self.logger.error(f"音频文件未创建: {audio_path}")
            
            return audio_path
            
        except Exception as e:
            self.logger.error(f"音频生成失败: {e}")
            import traceback
            self.logger.error(f"详细错误: {traceback.format_exc()}")
            return None

    def generate_word_with_spell(self, word, lang=DEFAULT_AUDIO_LANG, spell_interval=0.5):
        """生成单词和拼读的组合音频"""
        try:
            if not word or not word.strip():
                return None
            
            word = word.strip()
            
            # 生成单词音频
            word_audio = self.generate_audio(word, lang, spell_mode=False)
            if not word_audio:
                return None
            
            # 生成拼读音频
            if len(word) > 1:
                spell_audio = self.generate_audio(word, lang, spell_mode=True)
                if spell_audio:
                    # 这里可以合并音频文件，或者返回两个路径
                    # 暂时返回单词音频，拼读逻辑在前端处理
                    return word_audio
            
            return word_audio
            
        except Exception as e:
            self.logger.error(f"生成单词拼读音频失败: {e}")
            return None

    def generate_meaning_audio(self, meaning, lang='zh'):
        """生成中文含义音频"""
        return self.generate_audio(meaning, lang, spell_mode=False)

    def get_audio_info(self, audio_path):
        """获取音频文件信息"""
        try:
            if not os.path.exists(audio_path):
                return None
            
            stat = os.stat(audio_path)
            return {
                'path': audio_path,
                'size': stat.st_size,
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'exists': True
            }
        except Exception as e:
            self.logger.error(f"获取音频信息失败: {e}")
            return None

    def cleanup_old_audio(self, max_age_hours=24):
        """清理过期的音频文件"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
            cleaned_count = 0
            
            for filename in os.listdir(self.audio_folder):
                if filename.endswith('.mp3'):
                    filepath = os.path.join(self.audio_folder, filename)
                    try:
                        file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                        if file_time < cutoff_time:
                            os.remove(filepath)
                            cleaned_count += 1
                    except OSError:
                        continue
            
            self.logger.info(f"清理了 {cleaned_count} 个过期音频文件")
            return cleaned_count
        except Exception as e:
            self.logger.error(f"清理音频文件失败: {e}")
            return 0

    def get_supported_languages(self):
        """获取支持的语言列表 - 仅中英文"""
        return {
            'en': 'English',
            'zh': '中文'
        }

    def validate_language(self, lang):
        """验证语言代码是否支持 - 仅中英文"""
        return lang in ['en', 'zh']

    def get_pronunciation_tips(self, word, lang='en'):
        """获取发音提示 - 仅中英文"""
        tips = {
            'en': {
                'common_patterns': [
                    'tion usually pronounced as /ʃən/',
                    'sion often pronounced as /ʒən/',
                    'ough has multiple pronunciations',
                    'igh pronounced as /aɪ/'
                ]
            },
            'zh': {
                'common_patterns': [
                    '注意声调',
                    '多音字要查字典',
                    '注意平翘舌音'
                ]
            }
        }
        return tips.get(lang, {})
    
    def is_audio_generation_safe(self, text, lang='zh'):
        """检查文本是否适合音频生成"""
        if not text or not text.strip():
            return False
        
        # 检查是否包含特殊字符可能导致问题
        problematic_chars = ['<', '>', '&', '"', "'", '\\', '/']
        if any(char in text for char in problematic_chars):
            return False
        
        # 对于中文，检查是否有过多的格式标记
        if lang == 'zh':
            # 如果文本大部分是格式标记，则不适合
            cleaned = self._clean_chinese_text(text)
            if len(cleaned) < len(text) * 0.3:  # 如果清理后剩下不到30%
                return False
        
        return True
