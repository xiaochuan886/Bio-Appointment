<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发环境与命令

### 环境要求
- Node.js ≥ 20
- npm ≥ 10

### 常用命令
```bash
# 安装依赖
npm i

# 代码检查（包含多个检查步骤）
npm run lint

# 启动开发服务器
npm run dev -- --host 127.0.0.1
```

### 代码质量检查
`npm run lint` 命令包含以下检查步骤：
- TypeScript 类型检查：`tsgo -p tsconfig.check.json`
- Biome 代码检查：`npx biome lint`
- 自定义规则检查：`.rules/check.sh`
- Tailwind CSS 语法检查
- Vite 构建检查

## 项目架构

### 技术栈
- **前端框架**：React 18 + TypeScript + Vite
- **UI 组件**：Radix UI + Tailwind CSS + shadcn/ui
- **路由**：React Router v7
- **状态管理**：React Context (AuthContext)
- **数据库**：Supabase
- **表单处理**：React Hook Form + Zod
- **第三方集成**：钉钉 API (dingtalk-jsapi)

### 核心目录结构
```
src/
├── pages/           # 页面组件，按角色分组
│   ├── auth/        # 认证页面
│   ├── admin/       # 管理员页面
│   ├── sales/       # 销售页面
│   ├── head-nurse/  # 护士长页面
│   ├── nurse/       # 护士页面
│   └── doctor/      # 医生页面
├── components/      # 通用组件
│   ├── ui/          # shadcn/ui 基础组件
│   ├── auth/        # 认证相关组件
│   ├── appointment/ # 预约相关组件
│   └── dingtalk/    # 钉钉集成组件
├── contexts/        # React Context
├── hooks/           # 自定义 Hooks
├── services/        # API 服务
├── db/             # 数据库配置
└── types/          # TypeScript 类型定义
```

### 用户角色与权限系统
项目实现了基于角色的权限控制（RBAC）：
- `super_admin`：超级管理员
- `sales`：销售人员
- `head_nurse`：护士长
- `nurse`：护士
- `doctor`：医生

每个角色都有对应的页面权限，通过 `ProtectedRoute` 组件进行权限控制。

### 业务流程
1. **预约发起**：销售人员创建客户预约
2. **智能排班**：护士长进行排班调度
3. **任务执行**：护士查看并执行任务
4. **医生确认**：医生确认预约信息

### 钉钉集成
- 用户同步：支持从钉钉同步用户信息
- 部门映射：钉钉部门与本地部门对应
- 通知推送：向钉钉用户发送工作通知
- 登录认证：支持钉钉扫码登录

### 数据库表结构
核心表：
- `profiles`：用户信息
- `services`：服务项目
- `appointments`：预约记录
- `schedules`：排班信息
- `task_executions`：任务执行记录
- 钉钉相关表：`dingtalk_users`、`dingtalk_departments`、`dingtalk_sync_logs` 等

### 路由配置
路由配置在 `src/routes.tsx` 中统一管理，支持：
- 角色权限控制
- 认证状态检查
- 嵌套路由
- 重定向处理

### API 调用模式
- 使用 Supabase 客户端进行数据库操作
- API 调用集中在 `src/services/` 目录
- 使用自定义 hooks 封装业务逻辑

### 开发规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Biome 代码规范
- 组件使用函数式组件 + Hooks
- 样式使用 Tailwind CSS 类名
- 表单验证使用 Zod schema