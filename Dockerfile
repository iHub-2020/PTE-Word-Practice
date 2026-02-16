# 阶段1: 构建React前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制依赖文件并安装
COPY frontend/package*.json ./
RUN npm install && npm cache clean --force

# 复制并构建
COPY frontend/ ./
RUN npm run build

# 阶段2: 构建Python依赖 (Builder Stage)
FROM python:3.11-slim AS backend-builder

WORKDIR /app

# 安装构建依赖 (GCC, libffi-dev 用于编译 gevent 等)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# 阶段3: 最终运行时镜像 (Final Stage)
FROM python:3.11-slim

WORKDIR /app

# 安装运行时系统依赖 (curl 用于健康检查)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 从 backend-builder 复制已安装的 Python 包
COPY --from=backend-builder /install /usr/local

# 复制代码
COPY --chown=1000:1000 . .
# 从 frontend-builder 复制前端产物
COPY --from=frontend-builder --chown=1000:1000 /app/frontend/dist ./frontend/dist

# 创建非 root 用户并设置权限
RUN useradd -m -u 1000 reyan && \
    mkdir -p /app/data /app/static/audio /app/uploads/music /app/exports /app/logs && \
    chown -R reyan:reyan /app

USER reyan

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--worker-class", "gevent", "--worker-connections", "1000", "--timeout", "120", "--keep-alive", "5", "app:create_app()"]