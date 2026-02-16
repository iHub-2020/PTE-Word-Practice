import os
import csv
import json
from datetime import datetime
from config import EXPORT_FOLDER

class ExportService:
    def export(self, words, format_type='csv'):
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if format_type == 'csv':
                filename = f'words_export_{timestamp}.csv'
                filepath = os.path.join(EXPORT_FOLDER, filename)
                
                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    if words:
                        fieldnames = ['word', 'meaning', 'phonetic', 'example', 'language', 'difficulty', 'review_count', 'created_at']
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        
                        for word in words:
                            writer.writerow({
                                'word': word.word,
                                'meaning': word.meaning,
                                'phonetic': word.phonetic,
                                'example': word.example,
                                'language': word.language,
                                'difficulty': word.difficulty,
                                'review_count': word.review_count,
                                'created_at': word.created_at.isoformat()
                            })
                
            elif format_type == 'json':
                filename = f'words_export_{timestamp}.json'
                filepath = os.path.join(EXPORT_FOLDER, filename)
                
                data = []
                for word in words:
                    data.append({
                        'word': word.word,
                        'meaning': word.meaning,
                        'phonetic': word.phonetic,
                        'example': word.example,
                        'language': word.language,
                        'difficulty': word.difficulty,
                        'review_count': word.review_count,
                        'created_at': word.created_at.isoformat()
                    })
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

            elif format_type == 'pdf':
                filename = f'words_export_{timestamp}.pdf'
                filepath = os.path.join(EXPORT_FOLDER, filename)
                self._export_to_pdf(words, filepath)
                    
            else:
                return None
                
            return filepath
        except Exception as e:
            print(f"Export error: {e}")
            return None

    def _export_to_pdf(self, words, filepath):
        """生成PDF导出文件"""
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            
            # 注册中文字体 (Windows SimHei)
            font_name = 'Helvetica' # Default
            possible_fonts = [
                'C:\\Windows\\Fonts\\simhei.ttf', # SimHei (Preferred for PDF)
                'C:\\Windows\\Fonts\\msyh.ttc', # Microsoft YaHei
                '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', # Linux CJK
                '/System/Library/Fonts/PingFang.ttc' # macOS
            ]
            
            registered_font = False
            for font_path in possible_fonts:
                if os.path.exists(font_path):
                    try:
                        # For TTC, need to specify subfont index
                        if font_path.lower().endswith('.ttc'):
                            pdfmetrics.registerFont(TTFont('CustomChineseFont', font_path, subfontIndex=0))
                        else:
                            pdfmetrics.registerFont(TTFont('CustomChineseFont', font_path))
                            
                        font_name = 'CustomChineseFont'
                        registered_font = True
                        print(f"Successfully registered font: {font_path}")
                        break
                    except Exception as e:
                        print(f"Failed to load font {font_path}: {e}")
                        continue
            
            if not registered_font:
                print("Warning: No suitable Chinese font found. PDF may not display Chinese characters correctly.")
            
            doc = SimpleDocTemplate(filepath, pagesize=A4)
            elements = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = ParagraphStyle(
                'TitleStyle',
                parent=styles['Heading1'],
                fontName=font_name,
                fontSize=24,
                alignment=1, # Center
                spaceAfter=20
            )
            elements.append(Paragraph("Word Practice Export", title_style))
            elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
            elements.append(Spacer(1, 20))
            
            # Table Data
            data = [['Word', 'Phonetic', 'Meaning', 'Example']]
            
            # cell style
            cell_style = ParagraphStyle(
                'CellStyle',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=10,
                leading=12
            )
            
            for word in words:
                # Wrap text in Paragraph to handle wrapping and unicode
                row = [
                    Paragraph(str(word.word), cell_style),
                    Paragraph(str(word.phonetic or ''), cell_style),
                    Paragraph(str(word.meaning), cell_style),
                    Paragraph(str(word.example or ''), cell_style)
                ]
                data.append(row)
            
            # Table Style
            table = Table(data, colWidths=[100, 80, 150, 180])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), font_name), # Apply font to whole table
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            elements.append(table)
            doc.build(elements)
            return True
            
        except ImportError:
            print("ReportLab not installed. Cannot export PDF.")
            raise Exception("ReportLab library missing")
        except Exception as e:
            print(f"PDF Generation Error: {e}")
            raise