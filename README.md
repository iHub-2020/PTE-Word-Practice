# PTE Word Practice

**PTE 单词练习工具** — 支持英语/中文单词的自动播放、拼读、含义朗读和背景音乐。

## 🎯 功能特性

| 功能 | 说明 |
|------|------|
| 📖 单词管理 | 添加、编辑、删除、批量导入（CSV）、导出 |
| 🔊 自动播放 | 单词发音 → 字母拼读 → 中文含义，支持循环与随机模式 |
| ⚙️ 播放配置 | 单词重复次数、列表循环、播放间隔、拼读延迟、含义延迟 |
| 🎵 背景音乐 | 上传自定义音乐文件，支持循环播放和自动播放下一首 |
| 🗂️ 音频缓存 | TTS 音频自动缓存至 `cache/`，可查看缓存大小并一键清空 |
| 🌓 深色模式 | 一键切换明暗主题 |
| 📊 学习统计 | 单词总数、已复习数、复习率 |

## 🛠️ 技术栈

- **后端**：Flask + SQLAlchemy + gTTS + Gunicorn
- **前端**：React + TypeScript + Tailwind CSS + Zustand
- **部署**：Docker 多阶段构建，支持 Docker Compose / Portainer

---

## 🚀 快速部署

### 1. 创建持久化目录

```bash
sudo mkdir -p /opt/pte-word-practice/{data,cache,uploads/music,exports,logs}
sudo chown -R 1000:1000 /opt/pte-word-practice
sudo chmod -R 775 /opt/pte-word-practice
```

> UID 1000 对应容器内的非 root 用户。

### 2. 构建镜像

```bash
docker build -t pte-word-practice:latest .
```

### 3. 启动容器

**Docker Compose（推荐）：**

```bash
docker-compose up -d
```

**或手动运行：**

```bash
docker run -d \
  --name pte-word-practice \
  -p 8300:5000 \
  -v /opt/pte-word-practice/data:/app/data \
  -v /opt/pte-word-practice/cache:/app/cache \
  -v /opt/pte-word-practice/uploads:/app/uploads \
  -v /opt/pte-word-practice/uploads/music:/app/uploads/music \
  -v /opt/pte-word-practice/exports:/app/exports \
  -v /opt/pte-word-practice/logs:/app/logs \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  pte-word-practice:latest
```

**Portainer Stack：** 使用 `portainer-stack.yml` 部署。

### 4. 访问

浏览器打开 **http://your-host:8300**

---

## 📁 持久化目录说明

| 容器路径 | 宿主机路径 | 用途 |
|---------|-----------|------|
| `/app/data` | `/opt/pte-word-practice/data` | SQLite 数据库 |
| `/app/cache` | `/opt/pte-word-practice/cache` | TTS 音频缓存（自动生成） |
| `/app/uploads` | `/opt/pte-word-practice/uploads` | CSV 导入文件 |
| `/app/uploads/music` | `/opt/pte-word-practice/uploads/music` | 自定义背景音乐 |
| `/app/exports` | `/opt/pte-word-practice/exports` | 导出文件 |
| `/app/logs` | `/opt/pte-word-practice/logs` | 应用日志 |

---

## 🔧 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SECRET_KEY` | `dev-secret-key...` | Flask 密钥（生产环境必须修改） |
| `DATABASE_URL` | `sqlite:////app/data/words.db` | 数据库连接字符串 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `TZ` | — | 时区（建议 `Asia/Shanghai`） |
| `HTTP_PROXY` / `HTTPS_PROXY` | — | 代理配置（gTTS 需要访问 Google API） |

---

## 📡 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/words` | 获取单词列表 |
| POST | `/api/words` | 添加单词 |
| PUT | `/api/words/:id` | 更新单词 |
| DELETE | `/api/words/:id` | 删除单词 |
| POST | `/api/words/:id/review` | 标记已复习 |
| GET | `/api/words/:id/audio` | 获取单词发音 |
| GET | `/api/words/:id/meaning-audio` | 获取含义音频 |
| POST | `/api/tts` | 通用 TTS |
| POST | `/api/import` | 导入 CSV |
| POST | `/api/export` | 导出 CSV |
| POST | `/api/music/upload` | 上传背景音乐 |
| GET | `/api/music/list` | 获取音乐列表 |
| GET | `/api/cache/info` | 缓存信息 |
| DELETE | `/api/cache/clear` | 清空缓存 |
| GET | `/health` | 健康检查 |

---

## 📄 License

MIT
