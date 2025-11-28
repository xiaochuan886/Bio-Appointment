# 钉钉集成配置完成指南

## ✅ 已完成的配置

### 1. 后端配置
- ✅ Supabase Secrets 已配置
  - DINGTALK_APP_KEY: `dingwcjj27btxwpqpueg`
  - DINGTALK_APP_SECRET: `BKK-6cQJ7_LBuepiszoQ75VDmVszTZ3ebRbv_P99g9X1h-lXU7G5YVzHV5xzjkt_`
  - DINGTALK_AGENT_ID: `4117459167`

### 2. Edge Functions
- ✅ dingtalk-get-access-token 已部署
- ✅ dingtalk-auth 已部署

### 3. 数据库
- ✅ 钉钉用户映射表已创建
- ✅ 钉钉部门表已创建
- ✅ 钉钉同步日志表已创建
- ✅ 钉钉通知记录表已创建
- ✅ RLS 策略已配置

### 4. 前端配置
- ✅ 钉钉 JSAPI SDK 已安装
- ✅ 钉钉工具类已创建
- ✅ 类型定义已完成

## ⚠️ 需要您完成的配置

### 步骤 1: 获取企业 CorpId

1. 登录钉钉开放平台：https://open.dingtalk.com/
2. 在首页右上角，点击企业名称
3. 在弹出的企业信息中，找到 **CorpId**（企业ID）
4. 复制 CorpId

### 步骤 2: 更新前端环境变量

打开项目的 `.env` 文件，将 `VITE_DINGTALK_CORP_ID` 的值替换为您的真实 CorpId：

```bash
# 钉钉配置
VITE_DINGTALK_APP_KEY=dingwcjj27btxwpqpueg
VITE_DINGTALK_AGENT_ID=4117459167
VITE_DINGTALK_CORP_ID=您的真实CorpId  # ← 请替换这里
```

### 步骤 3: 配置钉钉开放平台回调域名

#### 当前开发环境的回调域名配置

由于您的应用部署在秒哒平台，回调域名应该配置为：

**主要域名（推荐）：**
```
https://app-7u4xlrye46ip.appmiaoda.com
```

**备用域名（如果有自定义域名）：**
```
您的自定义域名（如果已配置）
```

#### 在钉钉开放平台配置步骤：

1. **登录钉钉开放平台**
   - 访问：https://open.dingtalk.com/
   - 进入"应用开发" → "企业内部开发"
   - 找到您的应用（Bio-Appointment）

2. **配置应用首页地址**
   - 点击"基础信息"
   - 找到"应用首页地址"配置
   - 填写：
     ```
     PC端首页：https://app-7u4xlrye46ip.appmiaoda.com
     移动端首页：https://app-7u4xlrye46ip.appmiaoda.com
     ```

3. **配置登录与分享**
   - 点击"登录与分享"
   - 配置回调域名：
     ```
     https://app-7u4xlrye46ip.appmiaoda.com
     ```
   - 配置重定向 URI：
     ```
     https://app-7u4xlrye46ip.appmiaoda.com/auth/dingtalk/callback
     ```

4. **配置服务器出口 IP（可选）**
   - 如果钉钉要求配置服务器 IP
   - 可以暂时跳过，或联系秒哒平台获取 IP 地址

5. **保存并发布应用**
   - 保存所有配置
   - 如果应用未发布，点击"版本管理与发布"
   - 创建新版本并发布到企业

### 步骤 4: 验证配置

完成上述配置后，您可以通过以下方式验证：

#### 方法 1: 在钉钉客户端中测试

1. 打开钉钉客户端（手机或电脑）
2. 在"工作台"中找到您的应用
3. 点击打开应用
4. 应该能够正常加载页面

#### 方法 2: 测试免登功能

在钉钉客户端中打开应用后，系统应该：
1. 自动获取免登授权码
2. 调用后端接口换取用户信息
3. 自动登录系统
4. 显示用户信息

## 📋 配置检查清单

请确认以下所有项目都已完成：

- [ ] 已获取企业 CorpId
- [ ] 已更新 `.env` 文件中的 VITE_DINGTALK_CORP_ID
- [ ] 已在钉钉开放平台配置应用首页地址
- [ ] 已在钉钉开放平台配置回调域名
- [ ] 已在钉钉开放平台配置重定向 URI
- [ ] 已保存并发布应用
- [ ] 已在钉钉客户端中测试应用打开

## 🔍 常见问题

### Q1: 找不到 CorpId 在哪里？
**A:** 登录钉钉开放平台后，在首页右上角点击企业名称，在弹出的企业信息中可以看到 CorpId。

### Q2: 配置回调域名时提示域名不合法？
**A:** 确保域名格式正确，不要包含 `http://` 或 `https://` 前缀，只填写域名部分。例如：`app-7u4xlrye46ip.appmiaoda.com`

### Q3: 在钉钉中打开应用显示白屏？
**A:** 检查以下几点：
1. 确认应用已发布
2. 确认回调域名配置正确
3. 检查浏览器控制台是否有错误信息
4. 确认 CorpId 配置正确

### Q4: 免登失败，提示获取授权码失败？
**A:** 检查：
1. CorpId 是否正确
2. 应用是否已发布
3. 用户是否在应用的可见范围内

### Q5: 如何查看 Edge Function 的日志？
**A:** 在 Supabase 控制台的 Edge Functions 页面可以查看函数执行日志。

## 📞 获取支持

如果遇到问题，可以：

1. **查看文档**
   - DINGTALK_SETUP_GUIDE.md - 详细配置指南
   - DINGTALK_IMPLEMENTATION_STATUS.md - 实现状态
   - 钉钉开放平台文档：https://open.dingtalk.com/document/

2. **检查日志**
   - 浏览器控制台日志
   - Supabase Edge Functions 日志
   - 钉钉开放平台错误码文档

3. **测试工具**
   - 钉钉开发者工具
   - 浏览器开发者工具
   - Postman 测试 API

## 🎯 下一步

完成配置后，您可以：

1. **测试钉钉登录**
   - 在钉钉客户端中打开应用
   - 验证自动登录功能
   - 检查用户信息是否正确

2. **继续开发其他功能**
   - 通讯录同步功能
   - 消息通知功能
   - 钉钉特有功能集成

3. **优化用户体验**
   - 添加加载动画
   - 优化错误提示
   - 适配钉钉导航栏

## 📝 重要提示

1. **安全性**
   - 不要将 AppSecret 暴露在前端代码中
   - 不要将 AppSecret 提交到代码仓库
   - 定期更换密钥

2. **权限管理**
   - 确保应用只申请必需的权限
   - 定期审查权限使用情况

3. **测试环境**
   - 建议先在测试环境中验证
   - 确认无误后再发布到生产环境

---

**配置完成后，请告知我，我将继续实现通讯录同步和消息通知功能！** 🚀
