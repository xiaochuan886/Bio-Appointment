# 休假管理功能测试指南

## 🔧 已修复的问题

### 1. 交接排班无法选择护士 ✅
**问题**: `getStoreStaff` API返回 `{staff: []}` 但前端期望数组格式

**修复**: 
- 修改 `/src/services/api-client.ts` 中的 `getStoreStaff` 方法
- 正确处理返回格式: `return response.staff || response`

### 2. 安排休假的护士选择列表 ✅
**问题**: 护士选择下拉框没有数据

**修复**:
- 简化 `LeaveManagementDialog` 中的护士加载逻辑
- 使用 `getStoreStaff(storeId, 'nurse')` 获取本门店护士
- 添加fallback: 使用profiles API过滤护士角色

### 3. TypeScript类型修复 ✅
- 在 `Profile` 接口中添加 `status` 字段

## 📝 手动测试步骤

### 测试1: 安排休假 - 护士列表
1. 以护士长身份登录
2. 进入"护士休假管理"页面
3. 点击"安排休假"按钮
4. **验证**: 护士下拉列表应该显示本门店的所有护士

### 测试2: 检查排班冲突
1. 选择一个有排班的护士
2. 选择有排班的日期
3. 点击"检查排班冲突"按钮
4. **验证**: 应该显示冲突的排班列表

### 测试3: 交接排班 - 护士列表
1. 在休假列表中找到有冲突的记录
2. 点击"交接排班"
3. **验证**: 接班护士下拉列表应该显示本门店的其他护士（不包括休假护士）

### 测试4: 删除休假记录

#### 方法1: 通过浏览器
1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 在休假列表中点击删除某条记录
4. 在 Network 中查看 DELETE 请求的响应

#### 方法2: 使用浏览器控制台
打开浏览器控制台（F12 -> Console），粘贴以下代码：

```javascript
// 获取当前token（从localStorage）
const token = localStorage.getItem('bio_appointment_access_token');

// 先获取休假列表
fetch('http://localhost:3001/api/nurse-leaves', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(r => r.json())
.then(leaves => {
  console.log('休假记录:', leaves);
  if (leaves.length > 0) {
    const leaveId = leaves[0].id;
    console.log('测试删除ID:', leaveId);
    
    // 尝试删除
    return fetch('http://localhost:3001/api/nurse-leaves/' + leaveId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  }
})
.then(r => {
  console.log('删除响应状态:', r.status);
  return r.json();
})
.then(result => {
  console.log('删除结果:', result);
})
.catch(err => {
  console.error('错误:', err);
});
```

## 🔍 如何调试删除问题

如果删除仍然报错，请检查以下内容：

### 1. 检查Network请求
在删除操作时，检查浏览器Network标签中的DELETE请求：
- 请求URL: `DELETE http://localhost:3001/api/nurse-leaves/{id}`
- 请求Headers: 是否包含 `Authorization: Bearer xxx`
- 响应状态码: 200/400/403/500?
- 响应内容: 查看具体错误信息

### 2. 常见错误及解决方案

#### 401 Unauthorized
- 原因: Token过期或无效
- 解决: 重新登录

#### 403 Forbidden  
- 原因: 门店权限不匹配
- 检查: 该休假记录的护士是否属于你的门店

#### 404 Not Found
- 原因: 休假记录不存在
- 检查: ID是否正确

#### 500 Internal Server Error
- 原因: 服务器错误
- 检查: 后端日志（terminal中运行API服务器的窗口）

### 3. 检查后端日志
在运行API服务器的终端窗口中查看日志：
```
pkill -f "node server/api-server.cjs" && sleep 1 && npm run api
```

查找包含 "Failed to delete nurse leave" 的错误信息

## ✅ 验证清单

- [ ] 安排休假时可以看到本门店的护士列表
- [ ] 检查排班冲突功能正常工作
- [ ] 交接排班时可以选择接班护士
- [ ] 交接排班后排班成功转移
- [ ] 删除休假记录成功（无报错）
- [ ] 删除后记录从列表中消失

## 🐛 问题记录

如果测试过程中发现问题，请记录：

1. **问题描述**:
2. **重现步骤**:
3. **实际结果**:
4. **期望结果**:
5. **错误信息** (Network响应):
6. **后端日志**:

---

**创建时间**: 2025-12-17  
**版本**: v1.1
