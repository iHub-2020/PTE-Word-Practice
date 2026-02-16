import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database Configuration
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'data', 'words.db')}")
SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# File Paths
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
EXPORT_FOLDER = os.path.join(BASE_DIR, 'exports')
AUDIO_FOLDER = os.path.join(BASE_DIR, 'static', 'audio')
DATA_FOLDER = os.path.join(BASE_DIR, 'data')

# File Upload Settings
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB (支持音乐文件上传)
ALLOWED_EXTENSIONS = {'csv', 'json'}  # 单词导入格式
ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'}  # 音乐上传格式
MUSIC_FOLDER = os.path.join(BASE_DIR, 'uploads', 'music')

# Audio Settings
AUDIO_CACHE_TIMEOUT = 24 * 60 * 60  # 24小时
DEFAULT_AUDIO_SPEED = 1.0
DEFAULT_AUDIO_LANG = 'en'  # 默认英文

# Audio Network Settings
AUDIO_MAX_RETRIES = int(os.environ.get('AUDIO_MAX_RETRIES', '3'))
AUDIO_RETRY_DELAY = int(os.environ.get('AUDIO_RETRY_DELAY', '2'))
AUDIO_REQUEST_TIMEOUT = int(os.environ.get('AUDIO_REQUEST_TIMEOUT', '10'))

# Playback Settings
DEFAULT_PLAY_INTERVAL = 2.0  # 默认播放间隔2秒
MIN_PLAY_INTERVAL = 0.5
MAX_PLAY_INTERVAL = 10.0

# Session Settings
PERMANENT_SESSION_LIFETIME = timedelta(days=7)

# Logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOG_FILE = os.path.join(BASE_DIR, 'logs', 'app.log')

# Health Check
HEALTH_CHECK_ENDPOINT = '/health'

# User Settings
DEFAULT_USER_ID = 1000  # 普通用户权限
