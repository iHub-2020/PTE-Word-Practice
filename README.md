# PTE Word Practice 📚

一站式英语/中文单词学习与练习应用，支持发音朗读、拼读模式、含义 TTS、背景音乐、移动端适配等功能。

## ✨ 功能特性

- **智能播放** — 发音 → 拼读 → 含义朗读，支持单词重复 × N 次
- **连续播放** — 自动循环播放整个列表，支持列表循环
- **拼读模式** — 逐字母拼读单词（含可配置字母间隔）
- **含义朗读** — TTS 自动朗读中文释义，包含词性（及物动词、名词等）
- **高级设置** — 单词重复次数、列表循环、播放间隔、拼读间隔、含义延迟
- **暗黑模式** — 完整的深色主题支持
- **背景音乐** — 内置 Jazz/Morning 音乐 + 自定义上传
- **手动添加** — 在线添加单词（支持 EN/ZH + 音标）
- **CSV 导入/导出** — 批量导入导出词库
- **移动端适配** — 响应式布局 + Wake Lock 防息屏
- **Docker 部署** — 一键 Docker 构建与 Portainer Stack 部署

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 状态 | Zustand |
| 后端 | Flask + Flask-SQLAlchemy + Gunicorn |
| 数据库 | SQLite |
| TTS | gTTS (Google Text-to-Speech) |
| 部署 | Docker 多阶段构建 |

## 📥 CSV 导入（来源：欧易词典）

本应用的 CSV 词库文件来源于 **欧易词典**（Eudic / 欧路词典）导出的生词本。

### 导出步骤（欧易词典）

1. 打开 **欧路词典** 或 **每日英语听力** App
2. 进入 **生词本** → 选择要导出的生词本
3. 点击右上角 **更多** → **导出** → 选择 **CSV 格式**
4. 将导出的 CSV 文件保存到电脑

### CSV 格式要求

CSV 文件需包含以下列（忽略大小写）：

| 列名 | 必填 | 说明 |
|------|------|------|
| `word` | ✅ | 单词 |
| `meaning` | ✅ | 释义（支持 HTML 格式） |
| `phonetic` | ❌ | 音标（如 `/hɛˈloʊ/`） |
| `language` | ❌ | 语言 `en` 或 `zh`（默认 `en`） |
| `example` | ❌ | 例句 |

### 导入步骤

1. 打开应用 → 点击左上角 **⚙ 齿轮按钮**
2. 在下拉菜单中选择 **↓ 导入CSV**
3. 选择准备好的 CSV 文件
4. 导入完成后，词库面板自动刷新

### 导出步骤

1. 点击右上角 **↑ 导出CSV** 按钮
2. 选择 **导出为CSV** 或 **导出为PDF**
3. 文件将自动下载到本地

## 🐳 Docker 部署

### 构建镜像

```bash
git clone https://github.com/iHub-2020/PTE-Word-Practice.git
cd PTE-Word-Practice
docker build -t pte-word-practice:latest .
```

### 创建持久化目录

部署前需要在宿主机上创建数据持久化目录，并设置正确的权限（容器内以 UID 1000 运行）：

```bash
# 创建所有持久化目录
sudo mkdir -p /opt/pte-word-practice/{data,static/audio,uploads/music,exports,logs}

# 设置目录所有者为 UID 1000（与容器内用户一致）
sudo chown -R 1000:1000 /opt/pte-word-practice

# 设置目录权限为 775（所有者和组可读写执行，其他人可读可执行）
sudo chmod -R 775 /opt/pte-word-practice
```

### 快速启动

```bash
docker run -d \
  --name pte-word-practice \
  -p 8300:5000 \
  -v /opt/pte-word-practice/data:/app/data \
  -v /opt/pte-word-practice/static/audio:/app/static/audio \
  -v /opt/pte-word-practice/uploads:/app/uploads \
  -v /opt/pte-word-practice/uploads/music:/app/uploads/music \
  -v /opt/pte-word-practice/exports:/app/exports \
  -v /opt/pte-word-practice/logs:/app/logs \
  -e TZ=Asia/Shanghai \
  pte-word-practice:latest
```

### Portainer Stack 部署

使用项目中的 `portainer-stack.yml` 文件：

1. 登录 Portainer → **Stacks** → **Add stack**
2. 选择 **Upload** 或粘贴 `portainer-stack.yml` 内容
3. 修改必要的环境变量（如 `SECRET_KEY`）
4. 点击 **Deploy the stack**

### HTTPS 配置（可选）

本应用支持通过 **Nginx 反向代理** 或 **Nginx Proxy Manager** 配置 HTTPS：

1. 将 SSL 证书放置到 `/opt/ssl/certs/` 和 `/opt/ssl/private/`
2. 取消 `portainer-stack.yml` 中 SSL 挂载的注释
3. 配置 Nginx 反向代理将 443 → 8300

## ⚙ 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SECRET_KEY` | `dev-secret-key...` | Flask 密钥（**生产环境必须更改**） |
| `FLASK_ENV` | `production` | 运行环境 |
| `DATABASE_URL` | `sqlite:///data/words.db` | 数据库连接 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `TZ` | `Asia/Shanghai` | 时区 |
| `HTTP_PROXY` | — | 代理地址（gTTS 需要访问 Google） |
| `HTTPS_PROXY` | — | HTTPS 代理地址 |

## 📁 目录结构

```
PTE-Word-Practice/
├── app.py                 # Flask 应用入口
├── config.py              # 应用配置
├── models.py              # 数据模型 (Word)
├── extensions.py          # Flask 扩展 (SQLAlchemy)
├── routes/
│   └── api.py             # API 路由
├── services/
│   ├── word_service.py    # 单词 CRUD 服务
│   ├── audio_service.py   # 音频生成服务 (gTTS)
│   └── export_service.py  # 导入导出服务
├── frontend/
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── store/         # Zustand 状态管理
│   │   ├── services/      # API 客户端
│   │   └── types/         # TypeScript 类型
│   └── dist/              # 构建产物
├── Dockerfile             # 多阶段构建
├── portainer-stack.yml    # Portainer Stack 配置
└── requirements.txt       # Python 依赖
```

## 🔧 本地开发

### 后端

```bash
pip install -r requirements.txt
python app.py
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认运行在 `http://localhost:5173`，API 代理到 `http://localhost:5000`。

## 📄 License

MIT
