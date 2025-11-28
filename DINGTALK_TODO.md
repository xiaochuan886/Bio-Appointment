# Bio-Appointment 钉钉集成实现计划

## 功能概述

为 Bio-Appointment 系统集成钉钉功能，实现：
1. 钉钉通讯录同步
2. 钉钉账户登录（免登）
3. 钉钉消息通知
4. 作为钉钉应用在钉钉中使用

## 实现步骤

### 阶段一：数据库设计 ✅
- [x] 1. 创建钉钉用户映射表（dingtalk_users）
- [x] 2. 创建钉钉部门映射表（dingtalk_departments）
- [x] 3. 创建钉钉同步日志表（dingtalk_sync_logs）
- [x] 4. 创建钉钉通知记录表（dingtalk_notifications）
- [x] 5. 更新 profiles 表添加钉钉关联字段

### 阶段二：类型定义与 API 封装 ✅
- [x] 6. 更新 types.ts 添加钉钉相关类型
- [x] 7. 创建钉钉 API 类型定义
- [ ] 8. 更新 api.ts 添加钉钉相关函数

### 阶段三：后端 Edge Functions ✅
- [x] 9. 创建 dingtalk-get-access-token（获取访问令牌）
- [x] 10. 创建 dingtalk-auth（处理免登认证）
- [ ] 11. 创建 dingtalk-sync-departments（同步部门）
- [ ] 12. 创建 dingtalk-sync-users（同步用户）
- [ ] 13. 创建 dingtalk-send-notification（发送通知）
- [ ] 14. 创建 dingtalk-get-user-info（获取用户详情）

### 阶段四：前端钉钉 SDK 集成 ✅
- [x] 15. 安装钉钉 JSAPI SDK
- [x] 16. 创建钉钉 SDK 工具类（dingtalk.ts）
- [x] 17. 实现钉钉环境检测
- [x] 18. 实现钉钉 JSAPI 初始化
- [x] 19. 实现免登授权码获取

### 阶段五：钉钉登录功能
- [ ] 20. 创建钉钉登录页面
- [ ] 21. 实现免登流程（钉钉内）
- [ ] 22. 实现扫码登录流程（浏览器）
- [ ] 23. 更新 AuthContext 支持钉钉登录
- [ ] 24. 更新登录页面添加钉钉登录入口

### 阶段六：通讯录同步功能
- [ ] 25. 创建通讯录同步管理页面
- [ ] 26. 实现全量同步功能
- [ ] 27. 实现增量同步功能
- [ ] 28. 实现同步状态展示
- [ ] 29. 实现用户映射管理
- [ ] 30. 添加同步日志查看

### 阶段七：消息通知集成
- [ ] 31. 创建通知服务类
- [ ] 32. 实现预约创建通知
- [ ] 33. 实现排班确认通知
- [ ] 34. 实现任务分配通知
- [ ] 35. 实现预约提醒通知
- [ ] 36. 创建通知模板管理

### 阶段八：钉钉应用适配
- [ ] 37. 适配钉钉导航栏
- [ ] 38. 实现钉钉分享功能
- [ ] 39. 优化移动端体验
- [ ] 40. 添加钉钉特有功能（扫码、定位等）

### 阶段九：测试与优化
- [ ] 41. 测试钉钉登录流程
- [ ] 42. 测试通讯录同步
- [ ] 43. 测试消息通知
- [ ] 44. 测试在钉钉客户端中使用
- [ ] 45. 优化错误处理和用户提示
- [x] 46. 运行 lint 检查

## 技术架构

### 数据库表设计

#### dingtalk_users（钉钉用户映射表）
```sql
- id: uuid (主键)
- profile_id: uuid (关联 profiles 表)
- dingtalk_userid: text (钉钉 userid，唯一)
- dingtalk_unionid: text (钉钉 unionid)
- name: text (钉钉姓名)
- mobile: text (手机号)
- department_ids: text[] (部门 ID 列表)
- avatar: text (头像 URL)
- is_active: boolean (是否激活)
- last_sync_at: timestamptz (最后同步时间)
- created_at: timestamptz
- updated_at: timestamptz
```

#### dingtalk_departments（钉钉部门映射表）
```sql
- id: uuid (主键)
- dingtalk_dept_id: text (钉钉部门 ID，唯一)
- name: text (部门名称)
- parent_id: uuid (父部门 ID)
- order_num: integer (排序)
- is_active: boolean (是否激活)
- last_sync_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

#### dingtalk_sync_logs（同步日志表）
```sql
- id: uuid (主键)
- sync_type: text (同步类型：departments/users)
- status: text (状态：success/failed/running)
- total_count: integer (总数)
- success_count: integer (成功数)
- failed_count: integer (失败数)
- error_message: text (错误信息)
- started_at: timestamptz (开始时间)
- completed_at: timestamptz (完成时间)
- created_by: uuid (操作人)
```

#### dingtalk_notifications（通知记录表）
```sql
- id: uuid (主键)
- notification_type: text (通知类型)
- recipient_userid: text (接收人钉钉 userid)
- title: text (标题)
- content: text (内容)
- status: text (状态：pending/sent/failed)
- sent_at: timestamptz (发送时间)
- error_message: text (错误信息)
- related_id: uuid (关联业务 ID)
- created_at: timestamptz
```

### Edge Functions 设计

#### 1. dingtalk-get-access-token
- 功能：获取钉钉 access_token
- 缓存策略：缓存 2 小时（钉钉 token 有效期）
- 返回：access_token

#### 2. dingtalk-auth
- 功能：处理钉钉免登认证
- 输入：authCode
- 流程：
  1. 使用 authCode 换取 userid
  2. 获取用户详细信息
  3. 查找或创建系统用户
  4. 返回登录凭证

#### 3. dingtalk-sync-departments
- 功能：同步钉钉部门
- 流程：
  1. 获取钉钉部门列表
  2. 递归获取子部门
  3. 更新数据库
  4. 记录同步日志

#### 4. dingtalk-sync-users
- 功能：同步钉钉用户
- 流程：
  1. 获取所有部门
  2. 遍历部门获取用户列表
  3. 更新用户映射表
  4. 关联系统用户
  5. 记录同步日志

#### 5. dingtalk-send-notification
- 功能：发送钉钉工作通知
- 输入：userid、消息内容
- 流程：
  1. 构造消息体
  2. 调用钉钉发送接口
  3. 记录发送结果

### 前端集成

#### 钉钉 SDK 工具类
```typescript
class DingTalkSDK {
  // 检测是否在钉钉环境
  isDingTalk(): boolean
  
  // 初始化钉钉 JSAPI
  init(config: DingTalkConfig): Promise<void>
  
  // 获取免登授权码
  getAuthCode(): Promise<string>
  
  // 获取用户信息
  getUserInfo(): Promise<DingTalkUser>
  
  // 调用钉钉分享
  share(params: ShareParams): Promise<void>
  
  // 调用钉钉扫码
  scan(): Promise<string>
}
```

## 环境变量配置

### Supabase Secrets
```bash
DINGTALK_APP_KEY=your_app_key
DINGTALK_APP_SECRET=your_app_secret
DINGTALK_AGENT_ID=your_agent_id
```

### 前端 .env
```bash
VITE_DINGTALK_APP_KEY=your_app_key
VITE_DINGTALK_AGENT_ID=your_agent_id
VITE_DINGTALK_CORP_ID=your_corp_id
```

## 安全考虑

1. **密钥保护**：AppSecret 只在后端使用
2. **权限控制**：通讯录同步仅管理员可操作
3. **数据加密**：敏感信息加密存储
4. **审计日志**：记录所有同步和通知操作
5. **错误处理**：友好的错误提示，不暴露敏感信息

## 测试计划

### 单元测试
- [ ] Edge Functions 单元测试
- [ ] 钉钉 SDK 工具类测试
- [ ] API 函数测试

### 集成测试
- [ ] 钉钉登录流程测试
- [ ] 通讯录同步测试
- [ ] 消息通知测试

### 端到端测试
- [ ] 在钉钉客户端中测试完整流程
- [ ] 测试各种异常场景
- [ ] 性能测试

## 注意事项

1. **钉钉 API 限流**：注意 API 调用频率限制
2. **Token 管理**：access_token 需要缓存和自动刷新
3. **用户映射**：处理好钉钉用户与系统用户的映射关系
4. **部门同步**：注意部门层级关系的处理
5. **消息模板**：设计清晰的消息模板
6. **错误重试**：实现合理的重试机制

## 预期效果

完成后，系统将具备：
1. ✅ 用户可以使用钉钉账号登录
2. ✅ 自动同步企业通讯录
3. ✅ 系统消息推送到钉钉
4. ✅ 在钉钉中无缝使用应用
5. ✅ 统一的身份认证体系
6. ✅ 便捷的消息通知渠道
