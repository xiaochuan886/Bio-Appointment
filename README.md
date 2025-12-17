# Bio-Appointment 智能预约调度系统

基于React + TypeScript的智能预约调度系统，支持本地PostgreSQL数据库部署。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%3E%3D20-blue.svg)](https://www.docker.com/)

## 🌟 项目特性

- **智能预约管理**: 支持多角色预约流程，从销售发起到医生确认
- **资源调度优化**: 智能排班系统，自动分配房间和护士资源
- **实时数据同步**: 基于WebSocket的实时数据更新
- **钉钉集成**: 支持钉钉登录、通讯录同步和消息推送
- **权限管理**: 基于角色的访问控制系统(RBAC)
- **本地部署**: 支持本地PostgreSQL数据库，数据完全可控

## 🏗️ 系统架构

```
Bio-Appointment System
├── Frontend (React 18 + TypeScript)
├── Database (Local PostgreSQL + Redis)
├── Authentication (JWT + bcrypt)
├── Real-time (WebSocket)
└── Docker Compose Deployment
```

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Docker** 和 **Docker Compose**

### 一键部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd app-7u4xlrye46ip

# 2. 启动数据库服务
docker-compose up -d

# 3. 初始化数据库
./database/migrate.sh init

# 4. 安装依赖
npm install

# 5. 启动应用
npm run dev -- --host 127.0.0.1
```

访问 http://localhost:5173 开始使用！

### 默认用户账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 超级管理员 |
| sales1 | password123 | 销售人员 |
| head_nurse1 | password123 | 护士长 |
| nurse1 | password123 | 护士 |
| doctor1 | password123 | 医生 |

## 📋 目录结构

```
├── README.md                    # 项目说明文档
├── DEPLOYMENT_GUIDE.md          # 部署指南
├── docker-compose.yml           # Docker编排配置
├── package.json                 # 项目依赖
├── database/                    # 数据库相关
│   ├── init/                   # 数据库初始化脚本
│   └── migrate.sh              # 数据库管理脚本
├── scripts/                    # 工具脚本
│   └── migrate-from-supabase.ts # 数据迁移脚本
├── src/                        # 源码目录
│   ├── components/             # React组件
│   │   ├── ui/               # 基础UI组件
│   │   ├── auth/             # 认证相关组件
│   │   └── appointment/      # 预约相关组件
│   ├── pages/                 # 页面组件
│   │   ├── auth/             # 认证页面
│   │   ├── admin/            # 管理员页面
│   │   ├── sales/            # 销售页面
│   │   ├── head-nurse/       # 护士长页面
│   │   ├── nurse/            # 护士页面
│   │   └── doctor/           # 医生页面
│   ├── contexts/             # React Context
│   ├── services/             # 业务服务
│   │   ├── auth.ts           # 认证服务
│   │   ├── api.ts            # 数据API
│   │   ├── realtime.ts       # 实时服务
│   │   └── dataSync.ts       # 数据同步
│   ├── db/                   # 数据库配置
│   │   ├── connection.ts     # 数据库连接
│   │   ├── database.ts       # 数据库管理
│   │   └── supabase.ts       # Supabase兼容层
│   ├── hooks/                # 自定义Hooks
│   ├── types/                # TypeScript类型定义
│   └── utils/                # 工具函数
├── openspec/                 # OpenSpec规范
└── .env.example             # 环境变量模板
```

## 🛠️ 技术栈

### 前端技术
- **React 18** - UI框架
- **TypeScript 5.9** - 类型安全
- **Vite 5.1** - 构建工具
- **React Router v7** - 路由管理
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI组件库

### 后端技术
- **PostgreSQL 15** - 主数据库
- **Redis 7** - 缓存和会话存储
- **JWT** - 身份认证
- **WebSocket** - 实时通信

### 开发工具
- **Biome** - 代码检查和格式化
- **ESLint** - 代码质量检查
- **Docker Compose** - 容器编排
- **TypeScript** - 类型检查

## 📖 详细文档

### 📚 文档中心
- [📚 文档中心首页](docs/README.md) - 完整的文档导航和索引

### 🚀 快速开始
- [🚀 快速参考](docs/guides/QUICK_START.md) - 开发者快速上手
- [📋 部署指南](docs/guides/DEPLOYMENT_GUIDE.md) - 完整的部署和管理文档
- [🎨 设计指南](docs/guides/DESIGN_GUIDE.md) - UI/UX 设计规范

### 🔧 功能文档
- [🔐 认证系统](docs/features/AUTH_IMPLEMENTATION_SUMMARY.md) - 用户认证实现
- [📅 日期过滤](docs/features/DATE_FILTER_IMPLEMENTATION_SUMMARY.md) - 日期筛选功能
- [📊 资源过滤](docs/features/RESOURCE_FILTER_FEATURE.md) - 资源筛选系统
- [🔔 钉钉集成](docs/dingtalk/DINGTALK_QUICK_START.md) - 钉钉快速配置

### 🐛 问题排查
- [🐛 Bug 修复总结](docs/bugfixes/BUGFIX_SUMMARY.md) - 所有 Bug 修复汇总
- [🔍 登录问题排查](docs/guides/登录问题排查指南.md) - 登录相关问题

### 📊 系统文档
- [📈 项目状态](docs/system/PROJECT_STATUS.md) - 当前项目状态
- [📝 变更日志](docs/system/CHANGELOG.md) - 版本更新记录
- [🔧 OpenSpec规范](openspec/) - 系统规范和变更管理

## 🔧 开发指南

### 环境配置

```bash
# 复制环境配置
cp .env.example .env.local

# 配置数据库连接
DATABASE_TYPE=local
POSTGRES_HOST=localhost
POSTGRES_PORT=5437
POSTGRES_DB=bio_appointment
POSTGRES_USER=app_user
POSTGRES_PASSWORD=secure_password_123

# 配置JWT密钥
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev -- --host 127.0.0.1

# 代码检查
npm run lint

# 构建项目
npm run build
```

### 数据库管理

```bash
# 数据库状态
./database/migrate.sh status

# 创建备份
./database/migrate.sh backup

# 重置数据库
./database/migrate.sh reset
```

## 🔄 数据迁移

如果您需要从Supabase迁移数据：

```bash
# 设置Supabase环境变量
export VITE_SUPABASE_URL="your-supabase-url"
export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# 运行迁移脚本
npx ts-node scripts/migrate-from-supabase.ts
```

## 🐳 Docker部署

### 生产环境

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose logs -f
```

### 开发环境

```bash
# 启动开发环境
docker-compose up -d

# 查看服务状态
docker-compose ps
```

## 📊 系统监控

### 数据库监控

```bash
# 连接数据库
docker exec -it bio-appointment-postgres psql -U app_user -d bio_appointment

# 查看连接数
SELECT count(*) FROM pg_stat_activity;

# 查看表大小
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname='public';
```

### 应用监控

- **性能指标**: 响应时间、查询性能
- **错误监控**: 异常日志和错误率
- **用户行为**: 登录统计、功能使用情况

## 🔐 安全特性

- **数据加密**: 密码bcrypt加密，JWT token安全存储
- **权限控制**: 基于角色的细粒度权限管理
- **SQL注入防护**: 参数化查询防止SQL注入
- **会话管理**: 安全的会话管理和超时控制

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

- 📧 邮箱: support@example.com
- 💬 问题反馈: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 文档: [项目Wiki](https://github.com/your-repo/wiki)

---

**注意**: 本项目由秒哒平台生成，采用现代化的技术栈和最佳实践。

## 本地开发

### 如何在本地编辑代码？

您可以选择 [VSCode](https://code.visualstudio.com/Download) 或者您常用的任何 IDE 编辑器，唯一的要求是安装 Node.js 和 npm.

### 环境要求

```
# Node.js ≥ 20
# npm ≥ 10
例如：
# node -v   # v20.18.3
# npm -v    # 10.8.2
```

具体安装步骤如下：

### 在 Windows 上安装 Node.js

```
# Step 1: 访问Node.js官网：https://nodejs.org/，点击下载后，会根据你的系统自动选择合适的版本（32位或64位）。
# Step 2: 运行安装程序：下载完成后，双击运行安装程序。
# Step 3: 完成安装：按照安装向导完成安装过程。
# Step 4: 验证安装：在命令提示符（cmd）或IDE终端（terminal）中输入 node -v 和 npm -v 来检查 Node.js 和 npm 是否正确安装。
```

### 在 macOS 上安装 Node.js

```
# Step 1: 使用Homebrew安装（推荐方法）：打开终端。输入命令brew install node并回车。如果尚未安装Homebrew，需要先安装Homebrew，
可以通过在终端中运行如下命令来安装：
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
或者使用官网安装程序：访问Node.js官网。下载macOS的.pkg安装包。打开下载的.pkg文件，按照提示完成安装。
# Step 2: 验证安装：在命令提示符（cmd）或IDE终端（terminal）中输入 node -v 和 npm -v 来检查 Node.js 和 npm 是否正确安装。
```

### 安装完后按照如下步骤操作：

```
# Step 1: 下载代码包
# Step 2: 解压代码包
# Step 3: 用IDE打开代码包，进入代码目录
# Step 4: IDE终端输入命令行，安装依赖：npm i
# Step 5: IDE终端输入命令行，启动开发服务器：npm run dev -- --host 127.0.0.1
```

### 如何开发后端服务？

配置环境变量，安装相关依赖
如需使用数据库，请使用 supabase 官方版本或自行部署开源版本的 Supabase

### 如何配置应用中的三方 API？

具体三方 API 调用方法，请参考帮助文档：[源码导出](https://cloud.baidu.com/doc/MIAODA/s/Xmewgmsq7)，了解更多详细内容。

## 了解更多

您也可以查看帮助文档：[源码导出](https://cloud.baidu.com/doc/MIAODA/s/Xmewgmsq7)，了解更多详细内容。
