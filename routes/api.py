from flask import Blueprint, request, jsonify, send_file
from services.word_service import WordService
from services.audio_service import AudioService
from services.export_service import ExportService
import os
import logging

api_bp = Blueprint('api', __name__)
word_service = WordService()
audio_service = AudioService()
export_service = ExportService()
logger = logging.getLogger(__name__)

# ==================== 单词管理 API ====================

@api_bp.route('/words', methods=['GET'])
def get_words():
    """获取单词列表"""
    try:
        language = request.args.get('language')  # 可选的语言过滤
        words = word_service.get_all_words(language)
        return jsonify({
            'success': True,
            'data': [word.to_dict() for word in words],
            'count': len(words)
        })
    except Exception as e:
        logger.error(f"获取单词列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words', methods=['POST'])
def add_word():
    """添加新单词"""
    try:
        data = request.json
        word = data.get('word', '').strip()
        meaning = data.get('meaning', '').strip()
        phonetic = data.get('phonetic', '').strip()
        example = data.get('example', '').strip()
        language = data.get('language', 'en')
        difficulty = data.get('difficulty', 1)

        if not word or not meaning:
            return jsonify({'success': False, 'error': '单词和含义不能为空'}), 400

        # 验证语言
        if language not in ['en', 'zh']:
            return jsonify({'success': False, 'error': '只支持中英文'}), 400

        new_word = word_service.add_word(word, meaning, phonetic, example, language, difficulty)
        if new_word:
            return jsonify({
                'success': True,
                'data': new_word.to_dict(),
                'message': '单词添加成功'
            }), 201
        else:
            return jsonify({'success': False, 'error': '单词已存在或添加失败'}), 400
    except Exception as e:
        logger.error(f"添加单词失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words/<int:word_id>', methods=['PUT'])
def update_word(word_id):
    """更新单词"""
    try:
        data = request.json
        updated_word = word_service.update_word(
            word_id,
            word=data.get('word'),
            meaning=data.get('meaning'),
            phonetic=data.get('phonetic'),
            example=data.get('example'),
            language=data.get('language'),
            difficulty=data.get('difficulty')
        )
        
        if updated_word:
            return jsonify({
                'success': True,
                'data': updated_word.to_dict(),
                'message': '单词更新成功'
            })
        else:
            return jsonify({'success': False, 'error': '单词未找到'}), 404
    except Exception as e:
        logger.error(f"更新单词失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words/<int:word_id>', methods=['DELETE'])
def delete_word(word_id):
    """删除单词"""
    try:
        success = word_service.delete_word(word_id)
        if success:
            return jsonify({'success': True, 'message': '单词删除成功'})
        else:
            return jsonify({'success': False, 'error': '单词未找到'}), 404
    except Exception as e:
        logger.error(f"删除单词失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words/<int:word_id>/review', methods=['POST'])
def mark_word_reviewed(word_id):
    """标记单词为已复习"""
    try:
        success = word_service.mark_reviewed(word_id)
        if success:
            return jsonify({'success': True, 'message': '复习标记成功'})
        else:
            return jsonify({'success': False, 'error': '单词未找到'}), 404
    except Exception as e:
        logger.error(f"标记复习失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words/review', methods=['GET'])
def get_words_for_review():
    """获取需要复习的单词"""
    try:
        limit = request.args.get('limit', 10, type=int)
        words = word_service.get_words_for_review(limit)
        return jsonify({
            'success': True,
            'data': [word.to_dict() for word in words],
            'count': len(words)
        })
    except Exception as e:
        logger.error(f"获取复习单词失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 音频 API ====================

@api_bp.route('/words/<int:word_id>/audio', methods=['GET'])
def get_word_audio(word_id):
    """获取单词音频"""
    try:
        word = word_service.get_word(word_id)
        if not word:
            return jsonify({'success': False, 'error': '单词未找到'}), 404
        
        spell_mode = request.args.get('spell', 'false').lower() == 'true'
        spell_delay = float(request.args.get('spell_delay', 0.5))  # Default 0.5s
        
        logger.info(f"请求音频: word_id={word_id}, spell_mode={spell_mode}, spell_delay={spell_delay}, word={word.word}")
        
        audio_path = audio_service.generate_audio(word.word, word.language, spell_mode, spell_delay)
        
        if audio_path and os.path.exists(audio_path):
            file_size = os.path.getsize(audio_path)
            if file_size > 100:  # 确保文件不是空的
                logger.info(f"返回音频文件: {audio_path}, 大小: {file_size}")
                
                # 添加缓存控制头
                response = send_file(audio_path, mimetype='audio/mp3')
                response.headers['Cache-Control'] = 'public, max-age=86400'  # 缓存24小时
                return response
            else:
                logger.error(f"音频文件为空: {audio_path}, 大小: {file_size}")
                return jsonify({'success': False, 'error': '音频文件为空，生成可能失败'}), 500
        else:
            logger.error(f"音频生成失败: word_id={word_id}, audio_path={audio_path}")
            return jsonify({'success': False, 'error': '音频生成失败，可能是网络连接问题或API错误'}), 500
    except Exception as e:
        logger.error(f"获取音频失败: {e}")
        import traceback
        logger.error(f"详细信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'生成音频时出错: {str(e)}'}), 500

@api_bp.route('/words/<int:word_id>/meaning-audio', methods=['GET'])
def get_meaning_audio(word_id):
    """获取单词含义音频（中文）"""
    try:
        word = word_service.get_word(word_id)
        if not word:
            return jsonify({'success': False, 'error': '单词未找到'}), 404
        
        audio_path = audio_service.generate_meaning_audio(word.meaning)
        
        if audio_path:
            return send_file(audio_path, mimetype='audio/mp3')
        else:
            return jsonify({'success': False, 'error': '音频生成失败'}), 500
    except Exception as e:
        logger.error(f"获取含义音频失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/tts', methods=['POST'])
def generate_tts():
    """通用TTS接口 - 接收文本生成音频"""
    try:
        data = request.json
        text = data.get('text')
        lang = data.get('lang', 'zh')
        
        if not text:
            return jsonify({'success': False, 'error': '文本不能为空'}), 400
        
        logger.info(f"收到TTS请求: text={text[:50]}, lang={lang}")
            
        # 使用 audio_service 生成音频
        # 注意：这里直接调用 generate_audio，它会处理缓存和重试
        audio_path = audio_service.generate_audio(text, lang)
        
        if audio_path and os.path.exists(audio_path):
            file_size = os.path.getsize(audio_path)
            if file_size > 100:
                logger.info(f"TTS生成成功: {text[:20]}, 大小: {file_size}")
                return send_file(audio_path, mimetype='audio/mp3')
            else:
                logger.error(f"TTS生成的文件过小: {file_size} bytes")
                return '', 204  # 返回204，前端静默跳过
        else:
            # 返回 204 No Content 表示文本被完全过滤（如时态、比较级等），前端应静默跳过
            return '', 204
    except Exception as e:
        logger.error(f"TTS生成失败: {e}")
        import traceback
        logger.error(f"详细信息: {traceback.format_exc()}")
        # 返回204而不是500，让前端静默跳过
        return '', 204

@api_bp.route('/audio/cleanup', methods=['POST'])
def cleanup_audio():
    """清理过期音频文件"""
    try:
        max_age_hours = request.json.get('max_age_hours', 24) if request.json else 24
        cleaned_count = audio_service.cleanup_old_audio(max_age_hours)
        return jsonify({
            'success': True,
            'message': f'清理了 {cleaned_count} 个音频文件'
        })
    except Exception as e:
        logger.error(f"清理音频失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 导入导出 API ====================

@api_bp.route('/export', methods=['POST'])
def export_words():
    """导出单词"""
    try:
        data = request.json if request.json else {}
        format_type = data.get('format', 'csv')
        language = data.get('language')  # 可选的语言过滤
        
        words = word_service.get_all_words(language)
        export_path = export_service.export(words, format_type)
        
        if export_path:
            filename = os.path.basename(export_path)
            return send_file(export_path, as_attachment=True, download_name=filename)
        else:
            return jsonify({'success': False, 'error': '导出失败'}), 500
    except Exception as e:
        logger.error(f"导出失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/export/pdf', methods=['GET'])
def export_words_pdf():
    """导出单词为PDF"""
    try:
        # Check if reportlab is available
        try:
            import reportlab
        except ImportError:
            return jsonify({'success': False, 'error': 'PDF导出功能需要安装 reportlab 库。请运行: pip install reportlab'}), 500
        
        language = request.args.get('language')
        
        words = word_service.get_all_words(language)
        
        if not words or len(words) == 0:
            return jsonify({'success': False, 'error': '没有可导出的单词'}), 400
        
        # Use export service with 'pdf' format
        export_path = export_service.export(words, 'pdf')
        
        if export_path and os.path.exists(export_path):
            filename = os.path.basename(export_path)
            return send_file(export_path, as_attachment=True, download_name=filename, mimetype='application/pdf')
        else:
            return jsonify({'success': False, 'error': 'PDF导出失败'}), 500
    except Exception as e:
        logger.error(f"PDF导出失败: {e}")
        logger.exception(">>> Full PDF Export Exception <<<")  # Log full traceback
        return jsonify({'success': False, 'error': f'PDF导出失败: {str(e)}'}), 500

@api_bp.route('/import', methods=['POST'])
def import_words():
    """导入单词"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '请选择文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '未选择文件'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': '只支持CSV和JSON格式'}), 400
        
        import_path = os.path.join('uploads', file.filename)
        file.save(import_path)
        
        result = word_service.import_from_file(import_path)
        if result:
            return jsonify({
                'success': True,
                'message': f'成功导入 {result} 个单词'
            })
        else:
            return jsonify({'success': False, 'error': '导入失败'}), 500
    except Exception as e:
        logger.error(f"导入失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 统计 API ====================

@api_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """获取统计信息"""
    try:
        stats = word_service.get_statistics()
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/languages', methods=['GET'])
def get_supported_languages():
    """获取支持的语言列表 - 仅中英文"""
    try:
        languages = audio_service.get_supported_languages()
        return jsonify({
            'success': True,
            'data': languages
        })
    except Exception as e:
        logger.error(f"获取语言列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words/clear-all', methods=['DELETE'])
def clear_all_words():
    """清空词库 - 删除所有单词"""
    try:
        from models import Word
        from extensions import db
        
        # 获取单词总数
        total_count = Word.query.count()
        
        # 删除所有单词
        Word.query.delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'成功删除 {total_count} 个单词',
            'deleted_count': total_count
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"清空词库失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== 音乐管理 API ====================

@api_bp.route('/music/upload', methods=['POST'])
def upload_music():
    """上传背景音乐文件"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '未选择文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '未选择文件'}), 400

        # 校验文件扩展名
        from config import ALLOWED_AUDIO_EXTENSIONS, MUSIC_FOLDER
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            return jsonify({
                'success': False,
                'error': f'不支持的格式。支持: {", ".join(ALLOWED_AUDIO_EXTENSIONS)}'
            }), 400

        # 确保目录存在
        os.makedirs(MUSIC_FOLDER, exist_ok=True)

        # 安全文件名
        from werkzeug.utils import secure_filename
        import uuid
        safe_name = secure_filename(file.filename) or f'music_{uuid.uuid4().hex[:8]}.{ext}'
        # 避免同名覆盖
        base, extension = os.path.splitext(safe_name)
        final_name = safe_name
        counter = 1
        while os.path.exists(os.path.join(MUSIC_FOLDER, final_name)):
            final_name = f'{base}_{counter}{extension}'
            counter += 1

        filepath = os.path.join(MUSIC_FOLDER, final_name)
        file.save(filepath)

        file_size = os.path.getsize(filepath)
        logger.info(f"音乐上传成功: {final_name}, 大小: {file_size}")

        return jsonify({
            'success': True,
            'trackId': uuid.uuid4().hex[:12],
            'url': f'/api/music/file/{final_name}',
            'filename': final_name,
            'size': file_size
        }), 201

    except Exception as e:
        logger.error(f"音乐上传失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/music/file/<path:filename>', methods=['GET'])
def serve_music(filename):
    """提供音乐文件访问"""
    from config import MUSIC_FOLDER
    filepath = os.path.join(MUSIC_FOLDER, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/mpeg')
    return jsonify({'success': False, 'error': '文件未找到'}), 404


@api_bp.route('/music/list', methods=['GET'])
def list_music():
    """获取已上传的音乐列表"""
    try:
        from config import MUSIC_FOLDER, ALLOWED_AUDIO_EXTENSIONS
        os.makedirs(MUSIC_FOLDER, exist_ok=True)
        tracks = []
        for fname in os.listdir(MUSIC_FOLDER):
            ext = fname.rsplit('.', 1)[1].lower() if '.' in fname else ''
            if ext in ALLOWED_AUDIO_EXTENSIONS:
                fpath = os.path.join(MUSIC_FOLDER, fname)
                tracks.append({
                    'filename': fname,
                    'title': fname.rsplit('.', 1)[0],
                    'url': f'/api/music/file/{fname}',
                    'size': os.path.getsize(fpath)
                })
        return jsonify({'success': True, 'data': tracks})
    except Exception as e:
        logger.error(f"获取音乐列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== 音频缓存管理 ====================

@api_bp.route('/cache/info', methods=['GET'])
def cache_info():
    """获取音频缓存信息"""
    try:
        from config import AUDIO_FOLDER
        os.makedirs(AUDIO_FOLDER, exist_ok=True)
        total_size = 0
        file_count = 0
        for fname in os.listdir(AUDIO_FOLDER):
            fpath = os.path.join(AUDIO_FOLDER, fname)
            if os.path.isfile(fpath):
                total_size += os.path.getsize(fpath)
                file_count += 1
        return jsonify({
            'success': True,
            'fileCount': file_count,
            'totalSize': total_size,
            'totalSizeMB': round(total_size / (1024 * 1024), 2)
        })
    except Exception as e:
        logger.error(f"获取缓存信息失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/cache/clear', methods=['DELETE'])
def cache_clear():
    """清空音频缓存"""
    try:
        from config import AUDIO_FOLDER
        os.makedirs(AUDIO_FOLDER, exist_ok=True)
        count = 0
        for fname in os.listdir(AUDIO_FOLDER):
            fpath = os.path.join(AUDIO_FOLDER, fname)
            if os.path.isfile(fpath):
                os.remove(fpath)
                count += 1
        logger.info(f"已清空音频缓存: {count} 个文件")
        return jsonify({'success': True, 'deleted': count})
    except Exception as e:
        logger.error(f"清空缓存失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== 工具函数 ====================

def allowed_file(filename):
    """检查文件类型是否允许"""
    from config import ALLOWED_EXTENSIONS
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
