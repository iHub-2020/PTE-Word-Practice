from datetime import datetime
import os
import csv
import json
import logging
from extensions import db
from models import Word

logger = logging.getLogger(__name__)



class WordService:
    """单词服务类"""
    
    def __init__(self):
        self.logger = logger

    def get_all_words(self, language=None):
        """获取所有单词，可按语言过滤"""
        query = Word.query
        if language:
            query = query.filter_by(language=language)
        return query.order_by(Word.created_at.desc()).all()

    def get_word(self, word_id):
        """根据ID获取单词"""
        return Word.query.get(word_id)

    def get_word_by_text(self, word_text):
        """根据单词文本获取单词"""
        return Word.query.filter_by(word=word_text).first()

    def _strip_html_tags(self, text):
        """移除HTML标签，保留结构，并将列表转换为序号格式"""
        if not text:
            return ""
        
        import re
        import html
        
        # 1. 解码HTML实体
        text = html.unescape(text)
        
        # 移除script和style
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)

        # 2. 处理有序列表 <ol> -> 1. 2. 3.
        def replace_ol(match):
            content = match.group(1)
            # 查找所有<li>项
            items = re.findall(r'<li[^>]*>(.*?)</li>', content, flags=re.DOTALL | re.IGNORECASE)
            if not items:
                return content
            
            result = []
            for i, item in enumerate(items, 1):
                # 清理item内部的标签（递归或简单清理）
                clean_item = re.sub(r'<[^>]+>', '', item).strip()
                if clean_item:
                    result.append(f"{i}. {clean_item}")
            
            return '\n'.join(result) + '\n'

        # 匹配 <ol>...</ol>
        text = re.sub(r'<ol[^>]*>(.*?)</ol>', replace_ol, text, flags=re.DOTALL | re.IGNORECASE)
        
        # 3. 处理无序列表 <ul> -> • 
        def replace_ul(match):
            content = match.group(1)
            items = re.findall(r'<li[^>]*>(.*?)</li>', content, flags=re.DOTALL | re.IGNORECASE)
            if not items:
                return content
            
            result = []
            for item in items:
                clean_item = re.sub(r'<[^>]+>', '', item).strip()
                if clean_item:
                    result.append(f"• {clean_item}")
            
            return '\n'.join(result) + '\n'

        text = re.sub(r'<ul[^>]*>(.*?)</ul>', replace_ul, text, flags=re.DOTALL | re.IGNORECASE)
        
        # 4. 处理独立的 <li> (如果存在且未被包裹)
        text = re.sub(r'<li[^>]*>', '\n• ', text, flags=re.IGNORECASE)
        
        # 5. 将块级标签转换为换行
        text = re.sub(r'<(br|div|p|h\d|tr)[^>]*>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</(div|p|h\d|tr)[^>]*>', '\n', text, flags=re.IGNORECASE)
        
        # 6. 移除剩余标签
        text = re.sub(r'<[^>]+>', '', text)
        
        # 7. 清理空白
        # 合并多余换行
        text = re.sub(r'\n\s*\n', '\n', text)
        # 清理每行首尾空白
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        
        return text

    def add_word(self, word, meaning, phonetic='', example='', language='en', difficulty=1):
        """添加新单词"""
        try:
            # 检查单词是否已存在
            existing_word = self.get_word_by_text(word)
            if existing_word:
                self.logger.warning(f"单词 '{word}' 已存在")
                return None

            new_word = Word(
                word=word.strip(),
                meaning=meaning.strip(),
                phonetic=phonetic.strip(),
                example=example.strip(),
                language=language,
                difficulty=difficulty
            )
            db.session.add(new_word)
            db.session.commit()
            self.logger.info(f"成功添加单词: {word}")
            return new_word
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"添加单词失败: {e}")
            return None

    def update_word(self, word_id, word=None, meaning=None, phonetic=None, example=None, language=None, difficulty=None):
        """更新单词信息"""
        try:
            existing_word = Word.query.get(word_id)
            if not existing_word:
                return None

            # 更新字段
            if word is not None:
                existing_word.word = word.strip()
            if meaning is not None:
                existing_word.meaning = meaning.strip()
            if phonetic is not None:
                existing_word.phonetic = phonetic.strip()
            if example is not None:
                existing_word.example = example.strip()
            if language is not None:
                existing_word.language = language
            if difficulty is not None:
                existing_word.difficulty = difficulty

            db.session.commit()
            self.logger.info(f"成功更新单词: {word_id}")
            return existing_word
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"更新单词失败: {e}")
            return None

    def delete_word(self, word_id):
        """删除单词"""
        try:
            word = Word.query.get(word_id)
            if not word:
                return False
            db.session.delete(word)
            db.session.commit()
            self.logger.info(f"成功删除单词: {word_id}")
            return True
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"删除单词失败: {e}")
            return False

    def mark_reviewed(self, word_id):
        """标记单词为已复习"""
        try:
            word = Word.query.get(word_id)
            if word:
                word.review_count += 1
                word.last_reviewed = datetime.utcnow()
                db.session.commit()
                return True
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"标记复习失败: {e}")
        return False

    def get_words_for_review(self, limit=10):
        """获取需要复习的单词"""
        # 获取复习次数较少或很久未复习的单词
        return Word.query.filter(
            db.or_(
                Word.last_reviewed.is_(None),
                Word.last_reviewed < datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            )
        ).order_by(
            db.asc(Word.review_count),
            db.asc(Word.last_reviewed)
        ).limit(limit).all()

    def import_from_file(self, file_path):
        """从文件导入单词"""
        try:
            if not os.path.exists(file_path):
                self.logger.error(f"文件不存在: {file_path}")
                return False

            imported_count = 0
            
            if file_path.endswith('.csv'):
                # 尝试不同的编码
                encodings = ['utf-8', 'gbk', 'gb2312']
                df = None
                for encoding in encodings:
                    try:
                        with open(file_path, 'r', encoding=encoding) as f:
                            reader = csv.DictReader(f)
                            rows = list(reader)
                            break
                    except UnicodeDecodeError:
                        continue
                
                if not rows:
                    raise ValueError("无法解码CSV文件或文件为空")
                
                for row in rows:
                    try:
                        # 标准化列名
                        word = str(row.get('单词', row.get('word', ''))).strip()
                        meaning = str(row.get('解释', row.get('meaning', row.get('解释', '')))).strip()
                        phonetic = str(row.get('音标', row.get('phonetic', ''))).strip()
                        example = str(row.get('笔记', row.get('example', ''))).strip()
                        
                        # 清理HTML标签（防止欧路词典等第三方数据污染）
                        meaning = self._strip_html_tags(meaning)
                        example = self._strip_html_tags(example)
                        
                        if word and meaning:
                            # 检测语言
                            language = 'zh' if any(ord(char) > 127 for char in word) else 'en'
                            self.add_word(word, meaning, phonetic, example, language)
                            imported_count += 1
                    except Exception as e:
                        self.logger.warning(f"导入行数据失败: {e}")
                        continue
                        
            elif file_path.endswith('.json'):
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if isinstance(data, list):
                    rows = data
                elif isinstance(data, dict):
                    rows = [data]
                else:
                    raise ValueError("JSON格式不支持")
                
                for row in rows:
                    try:
                        # 标准化列名
                        word = str(row.get('单词', row.get('word', ''))).strip()
                        meaning = str(row.get('解释', row.get('meaning', row.get('解释', '')))).strip()
                        phonetic = str(row.get('音标', row.get('phonetic', ''))).strip()
                        example = str(row.get('笔记', row.get('example', ''))).strip()
                        
                        # 清理HTML标签
                        meaning = self._strip_html_tags(meaning)
                        example = self._strip_html_tags(example)
                        
                        if word and meaning:
                            # 检测语言
                            language = 'zh' if any(ord(char) > 127 for char in word) else 'en'
                            self.add_word(word, meaning, phonetic, example, language)
                            imported_count += 1
                    except Exception as e:
                        self.logger.warning(f"导入行数据失败: {e}")
                        continue
            else:
                self.logger.error(f"不支持的文件格式: {file_path}")
                return False

            self.logger.info(f"成功导入 {imported_count} 个单词")
            return imported_count
        except Exception as e:
            self.logger.error(f"导入文件失败: {e}")
            return False

    def get_statistics(self):
        """获取单词统计信息"""
        try:
            total_words = Word.query.count()
            english_words = Word.query.filter_by(language='en').count()
            chinese_words = Word.query.filter_by(language='zh').count()
            reviewed_words = Word.query.filter(Word.review_count > 0).count()
            
            return {
                'total_words': total_words,
                'english_words': english_words,
                'chinese_words': chinese_words,
                'reviewed_words': reviewed_words,
                'unreviewed_words': total_words - reviewed_words
            }
        except Exception as e:
            self.logger.error(f"获取统计信息失败: {e}")
            return {}