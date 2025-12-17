# Bio-Appointment 钉钉集成配置指南

## 一、钉钉开放平台准备工作

### 1.1 注册钉钉开放平台账号

1. 访问钉钉开放平台：https://open.dingtalk.com/
2. 使用钉钉扫码登录
3. 完成企业认证（如果还没有）

### 1.2 创建企业内部应用

1. 登录钉钉开放平台后，进入"应用开发" → "企业内部开发"
2. 点击"创建应用"
3. 填写应用信息：
   - **应用名称**：Bio-Appointment智能预约调度系统
   - **应用描述**：医疗健康服务智能化预约和排班管理系统
   - **应用图标**：上传应用图标（建议 256x256 像素）
   - **开发方式**：选择"企业内部自主开发"

4. 创建完成后，记录以下关键信息：
   - **AppKey**（也叫 ClientId）
   - **AppSecret**（也叫 ClientSecret）
   - **AgentId**（应用的唯一标识）

### 1.3 配置应用权限

在应用详情页面，配置以下权限：

#### 必需权限：
- ✅ **通讯录管理权限**
  - `Contact.User.Read`：读取通讯录用户信息
  - `Contact.Department.Read`：读取通讯录部门信息
  
- ✅ **身份验证权限**
  - `Contact.User.mobile`：获取用户手机号
  - `Contact.User.userid`：获取用户 userid

- ✅ **消息通知权限**
  - `Message.Notify`：发送工作通知消息
  - `Message.Interactive`：发送交互式消息

#### 可选权限：
- `Calendar.Event`：日历事件管理（用于预约日程同步）
- `Attendance.Shift`：考勤排班（用于护士排班同步）

### 1.4 配置服务器出口 IP

1. 在应用详情页面找到"服务器出口IP"配置
2. 添加您的服务器 IP 地址（Supabase Edge Function 的 IP）
3. 如果使用 Supabase，可以暂时跳过此步骤

### 1.5 配置回调域名

1. 在应用详情页面找到"登录与分享"配置
2. 配置以下回调地址：
   - **应用首页地址**：`https://your-domain.com`
   - **PC端首页地址**：`https://your-domain.com`
   - **移动端首页地址**：`https://your-domain.com`
   - **重定向 URI**：`https://your-domain.com/auth/dingtalk/callback`

### 1.6 发布应用

1. 完成所有配置后，点击"版本管理与发布"
2. 创建新版本并提交审核
3. 审核通过后，发布应用到企业

## 二、系统环境变量配置

### 2.1 在 Supabase 中配置密钥

需要在 Supabase 项目中添加以下环境变量（Secrets）：

```bash
# 钉钉应用配置
DINGTALK_APP_KEY=your_app_key_here
DINGTALK_APP_SECRET=your_app_secret_here
DINGTALK_AGENT_ID=your_agent_id_here

# 钉钉回调配置
DINGTALK_CALLBACK_URL=https://your-domain.com/auth/dingtalk/callback
```

### 2.2 在前端配置环境变量

在项目的 `.env` 文件中添加：

```bash
# 钉钉配置
VITE_DINGTALK_APP_KEY=your_app_key_here
VITE_DINGTALK_AGENT_ID=your_agent_id_here
VITE_DINGTALK_CORP_ID=your_corp_id_here
```

**注意**：
- `AppSecret` 只能在后端使用，不能暴露在前端
- `AppKey` 和 `AgentId` 可以在前端使用
- `CorpId` 是企业的唯一标识，在钉钉开放平台首页可以找到

## 三、钉钉集成功能说明

### 3.1 通讯录同步

**功能说明**：
- 自动同步钉钉企业通讯录到系统
- 支持部门结构同步
- 支持用户信息同步（姓名、手机号、部门等）
- 建立钉钉用户与系统用户的映射关系

**同步策略**：
- 首次同步：全量同步所有部门和用户
- 增量同步：定期同步变更的用户信息
- 手动同步：管理员可以手动触发同步

**映射规则**：
- 钉钉 userid → 系统 dingtalk_userid
- 钉钉手机号 → 系统 phone
- 钉钉姓名 → 系统 full_name
- 钉钉部门 → 系统 department

### 3.2 钉钉登录

**登录流程**：
1. 用户在钉钉中打开应用
2. 前端通过钉钉 JSAPI 获取免登授权码（authCode）
3. 后端使用 authCode 换取用户信息
4. 系统自动创建或关联用户账号
5. 返回登录凭证，完成登录

**免登流程**：
- 在钉钉客户端内：使用免登授权码
- 在浏览器中：使用扫码登录

### 3.3 消息通知

**通知类型**：
- **工作通知**：系统消息推送到钉钉工作通知
- **待办任务**：预约待办、排班任务等
- **审批提醒**：预约确认、改期申请等

**通知场景**：
- 销售创建预约 → 通知护士长
- 护士长确认排班 → 通知销售和护士
- 医生接受/拒绝预约 → 通知销售
- 任务分配 → 通知护士
- 预约时间临近 → 提醒相关人员

### 3.4 钉钉应用内使用

**H5 微应用模式**：
- 应用在钉钉客户端内以 WebView 形式运行
- 自动适配钉钉导航栏
- 支持钉钉 JSAPI 调用
- 支持钉钉分享、扫码等功能

**PC 端应用**：
- 支持在钉钉 PC 客户端中打开
- 自动适配钉钉窗口大小
- 支持钉钉消息推送

## 四、开发步骤

### 4.1 数据库准备

创建钉钉用户映射表，存储钉钉用户与系统用户的关联关系。

### 4.2 后端 Edge Functions

创建以下 Edge Functions：

1. **dingtalk-auth**：处理钉钉登录认证
2. **dingtalk-sync-contacts**：同步通讯录
3. **dingtalk-send-notification**：发送钉钉通知
4. **dingtalk-get-user-info**：获取用户信息

### 4.3 前端集成

1. 引入钉钉 JSAPI SDK
2. 实现钉钉登录组件
3. 创建通讯录同步管理页面
4. 集成钉钉消息通知

### 4.4 测试

1. 在钉钉开发者工具中测试
2. 在钉钉客户端中测试
3. 测试通讯录同步功能
4. 测试消息通知功能

## 五、常见问题

### Q1: 如何获取 CorpId？
A: 登录钉钉开放平台，在首页右上角可以看到企业信息，其中包含 CorpId。

### Q2: AppSecret 泄露了怎么办？
A: 立即在钉钉开放平台重置 AppSecret，并更新系统配置。

### Q3: 通讯录同步失败？
A: 检查应用权限是否正确配置，确认已授予通讯录读取权限。

### Q4: 消息发送失败？
A: 检查应用是否已发布，用户是否在应用的可见范围内。

### Q5: 免登失败？
A: 确认应用已发布，回调域名配置正确，用户在钉钉客户端内打开应用。

## 六、安全建议

1. **密钥安全**：
   - AppSecret 只能在后端使用
   - 使用环境变量存储敏感信息
   - 定期更换密钥

2. **权限最小化**：
   - 只申请必需的权限
   - 定期审查权限使用情况

3. **数据安全**：
   - 加密存储敏感信息
   - 定期清理过期数据
   - 遵守数据保护法规

4. **访问控制**：
   - 限制通讯录同步权限
   - 记录所有同步操作
   - 实施审计日志

## 七、参考资料

- 钉钉开放平台文档：https://open.dingtalk.com/document/
- 服务端 API：https://open.dingtalk.com/document/orgapp/api-overview
- 客户端 API：https://open.dingtalk.com/document/orgapp/h5-overview
- 免登流程：https://open.dingtalk.com/document/orgapp/obtain-identity-credentials

## 八、下一步操作

完成以上配置后，请按照以下顺序操作：

1. ✅ 在钉钉开放平台创建应用并获取密钥
2. ✅ 配置应用权限和回调地址
3. ✅ 在 Supabase 中配置环境变量
4. ✅ 在前端 .env 文件中配置环境变量
5. ⏳ 等待系统实现钉钉集成功能
6. ⏳ 测试钉钉登录和通讯录同步
7. ⏳ 发布应用到企业

**准备好后，请告知我您已完成步骤 1-4，我将继续实现系统集成功能。**
