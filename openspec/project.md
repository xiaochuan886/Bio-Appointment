# Project Context

## Purpose
Bio-Appointment智能预约调度系统是一个医疗健康服务预约管理平台，为医疗健康服务提供智能化预约和排班管理。系统支持多端协同工作，内置完善的用户身份认证与权限管理体系，支持钉钉企业通讯录同步、钉钉账户登录、钉钉通知推送，可作为钉钉应用在钉钉中直接使用。

核心业务流程包括：
1. 销售人员发起客户预约（护理服务/医生面诊）
2. 护士长进行智能排班和资源调度
3. 护士执行服务任务并更新状态
4. 医生确认面诊和报告解读预约
5. 管理员配置系统参数和用户管理

## Tech Stack

### 前端技术栈
- **React 18** - 主要UI框架
- **TypeScript 5.9** - 类型安全的JavaScript
- **Vite 5.1** - 构建工具和开发服务器
- **React Router v7** - 客户端路由
- **Supabase JS Client** - 数据库和认证服务

### UI组件库
- **Radix UI** - 无样式UI组件基础库
- **Tailwind CSS 3.4** - 原子化CSS框架
- **shadcn/ui** - 基于Radix UI的组件库
- **Lucide React** - 图标库
- **Sonner** - 通知组件

### 表单和状态管理
- **React Hook Form** - 高性能表单库
- **Zod** - TypeScript优先的模式验证
- **React Context** - 应用状态管理

### 第三方集成
- **dingtalk-jsapi 3.2.2** - 钉钉JavaScript API
- **@supabase/supabase-js 2.76.1** - Supabase客户端
- **axios 1.13.1** - HTTP客户端
- **ky 1.13.0** - 现代HTTP客户端

### 开发工具
- **Biome 2.3.4** - 代码检查和格式化
- **TypeScript编译器** - 类型检查
- **ast-grep** - 代码模式匹配
- **自定义检查脚本** - `.rules/check.sh`

### 数据库
- **Supabase** - 基于PostgreSQL的BaaS服务
- 支持实时数据同步
- 内置认证和权限管理

## Project Conventions

### 代码风格

#### 命名约定
- **文件命名**：kebab-case（如：user-management-page.tsx）
- **组件命名**：PascalCase（如：UserProfile）
- **变量和函数**：camelCase（如：userName, handleSubmit）
- **常量**：UPPER_SNAKE_CASE（如：API_BASE_URL）
- **类型和接口**：PascalCase（如：UserProfile, ApiResponse）

#### 代码组织
- 使用绝对路径导入：`@/` 指向 `src/` 目录
- 按功能模块组织代码：页面、组件、服务、类型分别存放
- 组件使用函数式组件 + Hooks
- 优先使用TypeScript严格模式

#### 样式规范
- 使用Tailwind CSS类名进行样式设计
- 避免内联样式，使用类名组合
- 组件使用shadcn/ui设计系统
- 响应式设计优先

### Architecture Patterns

#### 整体架构
- **单页应用（SPA）**：基于React Router的客户端路由
- **分层架构**：页面层 → 组件层 → 服务层 → 数据层
- **模块化设计**：按业务功能划分模块（auth, appointment, schedule等）

#### 认证与权限
- **基于角色的访问控制（RBAC）**：super_admin, sales, head_nurse, nurse, doctor
- **路由守卫**：ProtectedRoute组件保护需要认证的路由
- **状态管理**：AuthContext管理全局认证状态

#### 数据流
- **单向数据流**：props向下，events向上
- **API调用集中化**：services目录统一管理API调用
- **自定义Hooks**：封装业务逻辑和状态管理

### Testing Strategy

#### 代码质量检查
使用 `npm run lint` 进行多层次的代码质量检查：
1. **TypeScript类型检查**：`tsc -p tsconfig.check.json`
2. **Biome代码检查**：`npx biome lint`
3. **自定义规则检查**：`.rules/check.sh`（使用ast-grep检查特定模式）
4. **Tailwind CSS语法检查**：确保CSS类名正确
5. **Vite构建检查**：验证项目可以正常构建

#### 检查规则
- SelectItem组件使用规范检查
- useAuth Hook与AuthProvider搭配检查
- 代码导入依赖检查
- 命名规范检查

### Git Workflow

#### 提交信息规范
使用约定式提交（Conventional Commits）：
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 重构代码
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

#### 分支策略
- `master`：主分支，始终保持可部署状态
- 功能分支：从master分支创建，完成开发后合并回master
- 修复分支：用于紧急修复，直接从master创建

#### 代码审查
- 所有代码变更都需要通过代码质量检查
- 重要功能变更需要代码审查
- 使用Pull Request进行协作开发

## Domain Context

### 医疗预约业务

#### 核心概念
- **预约（Appointment）**：客户预约服务的请求，包含客户信息、服务项目、时间等
- **排班（Schedule）**：护士长为预约分配具体资源和时间
- **任务执行（TaskExecution）**：护士执行服务的过程记录
- **资源（Resource）**：房间、护士等可调度的资源

#### 业务流程
1. **预约发起**：销售人员创建预约，选择服务项目和时间
2. **智能排班**：护士长查看预约，分配房间和护士，调整时长
3. **任务执行**：护士查看任务，执行签到、开始、完成等操作
4. **医生确认**：医生处理面诊类预约，确认或建议改期

#### 状态管理
- **预约状态**：pending, scheduled, confirmed, in_progress, completed, cancelled
- **排班状态**：draft, published, locked
- **任务状态**：pending, checked_in, in_progress, completed

### 用户角色与权限

#### 角色定义
- **super_admin**：超级管理员，拥有所有权限
- **sales**：销售，负责发起预约
- **head_nurse**：护士长，负责排班调度
- **nurse**：护士，负责执行服务
- **doctor**：医生，负责面诊确认

#### 权限控制
- 基于角色的模块访问控制
- 数据级权限：用户只能访问相关的数据
- 操作级权限：不同角色有不同的操作权限

### 钉钉集成

#### 集成功能
- **用户登录**：钉钉扫码登录和免登
- **通讯录同步**：自动同步钉钉组织架构和用户信息
- **通知推送**：向钉钉用户发送工作通知
- **应用嵌入**：作为钉钉应用在工作台使用

#### 技术实现
- 使用钉钉JavaScript API进行前端集成
- 后端调用钉钉OpenAPI进行数据同步
- 支持OAuth2.0授权流程

## Important Constraints

### 技术约束
- **浏览器兼容性**：支持现代浏览器（Chrome 88+, Firefox 85+, Safari 14+）
- **响应式设计**：支持桌面端和移动端访问
- **实时性要求**：状态变更需要实时同步到相关用户
- **性能要求**：页面加载时间 < 3秒，操作响应时间 < 1秒

### 业务约束
- **数据一致性**：预约和排班数据不能出现冲突
- **权限安全**：严格按照角色控制数据访问
- **医疗合规**：符合医疗数据安全和隐私保护要求
- **时间准确性**：预约和排班时间必须准确，支持时区处理

### 集成约束
- **钉钉依赖**：核心功能依赖钉钉服务，需要稳定的网络连接
- **Supabase限制**：数据库操作受Supabase配额和限制约束
- **API限制**：钉钉API调用频率和次数限制

## External Dependencies

### 钉钉服务
- **钉钉开放平台**：用户认证、通讯录同步、消息推送
- **依赖权限**：通讯录只读、工作通知发送、身份验证
- **配置要求**：AppKey、AppSecret、AgentId、CorpId

### Supabase服务
- **数据库**：PostgreSQL数据库托管
- **认证服务**：JWT token管理和用户认证
- **实时功能**：数据变更实时推送
- **文件存储**：用户头像等文件存储

### 第三方库
- **React生态**：React Router、React Hook Form等
- **UI组件**：Radix UI、Tailwind CSS、Lucide Icons
- **工具库**：date-fns、zod、clsx等

### 开发环境
- **Node.js 20+**：运行时环境
- **npm 10+**：包管理器
- **TypeScript 5.9**：类型检查和编译
- **Vite 5.1**：开发服务器和构建工具
