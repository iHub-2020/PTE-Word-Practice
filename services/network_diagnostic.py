import logging
import urllib.request
import socket

logger = logging.getLogger(__name__)

class NetworkDiagnostic:
    """网络连接诊断工具"""
    
    @staticmethod
    def check_internet_access(timeout=5):
        """检查基本互联网访问"""
        test_urls = [
            'https://www.google.com',
            'https://translate.google.com',
            'https://www.baidu.com',  # 国内备用
        ]
        
        for url in test_urls:
            try:
                urllib.request.urlopen(url, timeout=timeout)
                logger.info(f"✓ 网络连接正常: {url}")
                return True
            except Exception as e:
                logger.warning(f"✗ 连接失败: {url} - {e}")
        
        return False
    
    @staticmethod
    def check_dns_resolution(hostname='translate.google.com'):
        """检查 DNS 解析"""
        try:
            ip = socket.gethostbyname(hostname)
            logger.info(f"✓ DNS 解析成功: {hostname} -> {ip}")
            return True
        except Exception as e:
            logger.error(f"✗ DNS 解析失败: {hostname} - {e}")
            return False
    
    @staticmethod
    def diagnose():
        """完整诊断"""
        results = {
            'internet': NetworkDiagnostic.check_internet_access(),
            'dns': NetworkDiagnostic.check_dns_resolution(),
        }
        
        logger.info(f"网络诊断结果: {results}")
        return all(results.values())
