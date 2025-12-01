# 🚨 立即修复：API 服务器重启指南

## 错误提示

```
GET http://localhost:3001/api/users 404 (Not Found)
```

这表示 API 服务器还没有加载新的 `/api/users` 端点。

---

## ✅ 解决方案：重启 API 服务器

请按照以下步骤操作：

### 方法1：使用脚本（推荐）

打开终端，执行：

```bash
cd /Users/massifserver/app-7u4xlrye46ip
chmod +x restart-api.sh
./restart-api.sh
```

### 方法2：手动重启

如果脚本不工作，手动执行以下命令：

#### 第一步：停止旧服务器

```bash
# 查找进程
ps aux | grep "api-server.cjs" | grep -v grep

# 停止进程（将 PID 替换为实际的进程ID）
kill <PID>

# 或者直接用 pkill
pkill -f "node server/api-server.cjs"
```

#### 第二步：启动新服务器

```bash
cd /Users/massifserver/app-7u4xlrye46ip

# 后台运行
nohup node server/api-server.cjs > /tmp/api-server.log 2>&1 &
```

#### 第三步：验证启动

等待 2-3 秒后，测试：

```bash
# 测试健康检查
curl http://localhost:3001/api/health

# 测试新的用户端点（应该返回 JSON 数组）
curl http://localhost:3001/api/users
```

如果看到 JSON 数据，说明成功！

---

## 🔍 查看日志（如果启动失败）

```bash
tail -50 /tmp/api-server.log
```

常见错误：
- **端口被占用**: `EADDRINUSE: address already in use :::3001`
  - 解决：`lsof -ti:3001 | xargs kill -9`
  
- **数据库连接失败**: `connection refused`
  - 解决：检查 PostgreSQL 是否运行在 5437 端口

---

## 📱 重启后的操作

API 服务器重启成功后：

1. **刷新浏览器页面**
   - 按 `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`)
   - 强制刷新清除缓存

2. **进入用户管理页面**
   - 应该能看到用户列表（不再是错误）

3. **测试钉钉同步**
   - 切换到"钉钉同步"标签
   - 点击"立即同步"
   - 同步完成后自动刷新用户列表

---

## ⚠️ 如果还是 404 错误

检查 `server/api-server.cjs` 文件是否包含以下代码：

```javascript
// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, department, status, 
              created_at, updated_at, dingtalk_userid
       FROM profiles
       ORDER BY created_at DESC`
    );
    
    console.log(`获取所有用户: ${result.rows.length} 条记录`);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});
```

如果缺少这段代码，说明文件没有保存成功。

---

## 💡 快速验证命令

一键检查所有状态：

```bash
echo "=== API 服务器状态 ===" && \
ps aux | grep "api-server.cjs" | grep -v grep && \
echo "" && \
echo "=== 健康检查 ===" && \
curl -s http://localhost:3001/api/health | jq . && \
echo "" && \
echo "=== 用户端点测试 ===" && \
curl -s http://localhost:3001/api/users | jq 'length'
```

预期输出：
```
=== API 服务器状态 ===
massifserver  12345  ... node server/api-server.cjs

=== 健康检查 ===
{
  "status": "healthy",
  "timestamp": "..."
}

=== 用户端点测试 ===
12
```

---

## 🎯 成功标志

当您看到以下情况时，说明修复成功：

1. ✅ API 服务器进程正在运行
2. ✅ `curl http://localhost:3001/api/users` 返回 JSON 数组
3. ✅ 浏览器控制台没有 404 错误
4. ✅ 用户管理页面显示用户列表
5. ✅ 钉钉同步完成后自动刷新列表

---

**需要帮助？** 检查日志文件：`/tmp/api-server.log`
