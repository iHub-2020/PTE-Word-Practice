from datetime import datetime
from extensions import db

class Word(db.Model):
    """单词数据模型"""
    __tablename__ = 'words'
    
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False, index=True)
    meaning = db.Column(db.String(500), nullable=False)
    phonetic = db.Column(db.String(200), default='')  # 音标
    example = db.Column(db.Text, default='')
    language = db.Column(db.String(10), default='en')  # 语言：en=英文, zh=中文
    difficulty = db.Column(db.Integer, default=1)  # 难度等级 1-5
    review_count = db.Column(db.Integer, default=0)  # 复习次数
    last_reviewed = db.Column(db.DateTime)  # 最后复习时间
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'word': self.word,
            'meaning': self.meaning,
            'phonetic': self.phonetic,
            'example': self.example,
            'language': self.language,
            'difficulty': self.difficulty,
            'review_count': self.review_count,
            'last_reviewed': self.last_reviewed.isoformat() if self.last_reviewed else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
