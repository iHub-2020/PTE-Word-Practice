from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import os
import logging
from datetime import datetime
from config import (
    BASE_DIR, DATA_FOLDER, UPLOAD_FOLDER, EXPORT_FOLDER, 
    AUDIO_FOLDER, LOG_LEVEL, LOG_FILE, HEALTH_CHECK_ENDPOINT
)

# 配置日志
# 在容器环境中，日志目录可能不可写，使用stdout logging
try:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    handlers = [
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
except (PermissionError, OSError) as e:
    # 如果无法创建日志文件，仅使用stdout
    handlers = [logging.StreamHandler()]

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=handlers
)
logger = logging.getLogger(__name__)

# 初始化扩展
from extensions import db

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # 加载配置
    app.config.from_pyfile('config.py')
    
    # 初始化数据库
    db.init_app(app)
    
    # 确保必要的目录存在
    directories = [DATA_FOLDER, UPLOAD_FOLDER, EXPORT_FOLDER, AUDIO_FOLDER, 'logs',
                   os.path.join(UPLOAD_FOLDER, 'music')]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"确保目录存在: {directory}")

    # 注册蓝图
    from routes.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # 健康检查路由
    @app.route(HEALTH_CHECK_ENDPOINT)
    def health_check():
        try:
            # 检查数据库连接
            db.session.execute(text('SELECT 1'))
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '2.0.0'
            }), 200
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 500

    # 主页面路由 - 服务React构建的index.html
    @app.route('/')
    def index():
        try:
            return send_from_directory('frontend/dist', 'index.html')
        except Exception:
            # 如果React构建不存在，回退到Flask模板
            return render_template('index.html')

    # 静态文件路由
    @app.route('/static/<path:filename>')
    def static_files(filename):
        return send_from_directory('static', filename)

    # 前端构建文件路由 (生产环境)
    @app.route('/assets/<path:filename>')
    def frontend_assets(filename):
        return send_from_directory('frontend/dist/assets', filename)

    # React Router SPA路由支持 - 所有前端路由都返回index.html
    @app.route('/<path:path>')
    def serve_react_app(path):
        # 检查是否是API请求
        if path.startswith('api/') or path.startswith('static/') or path.startswith('audio/'):
            return jsonify({'error': '页面未找到'}), 404
        
        # 检查静态文件是否存在
        if os.path.exists(os.path.join('frontend/dist', path)):
            return send_from_directory('frontend/dist', path)
        
        # 否则返回index.html让React Router处理
        try:
            return send_from_directory('frontend/dist', 'index.html')
        except Exception:
            return render_template('index.html')

    @app.route('/audio/<path:filename>')
    def audio_files(filename):
        return send_from_directory(AUDIO_FOLDER, filename)

    # 错误处理
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': '页面未找到'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': '内部服务器错误'}), 500

    # 请求日志
    @app.before_request
    def log_request():
        logger.info(f"请求: {request.method} {request.url}")

    @app.after_request
    def log_response(response):
        logger.info(f"响应: {response.status_code}")
        return response

    # 创建数据库表
    with app.app_context():
        try:
            # 确保模型被导入以便SQLAlchemy可以发现它们
            from models import Word
            db.create_all()
            logger.info("数据库表创建成功")
        except Exception as e:
            logger.error(f"数据库表创建失败: {e}")

    logger.info("应用初始化完成")
    return app

if __name__ == '__main__':
    app = create_app()
    logger.info("启动开发服务器")
    app.run(host='0.0.0.0', port=5000, debug=False)