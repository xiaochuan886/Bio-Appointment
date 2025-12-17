# 密码哈希管理脚本

## 概述

`hash-passwords.js` 脚本用于将数据库中所有用户的明文密码统一转换为 bcrypt 哈希格式，提高系统安全性。

## 功能特性

- ✅ 自动检测并跳过已经是 bcrypt 哈希的密码
- ✅ 将所有明文密码统一重置为默认密码 `123456`
- ✅ 使用 bcrypt 算法，salt rounds = 12
- ✅ 提供详细的处理日志和统计信息
- ✅ 安全的错误处理，单个账号失败不影响其他账号

## 使用方法

### 运行脚本

```bash
node scripts/hash-passwords.js
```

### 输出示例

```
🔐 开始密码哈希处理...

📊 找到 10 个用户账号

🔑 生成默认密码 "123456" 的 bcrypt 哈希...
✅ 哈希生成成功: $2b$12$DFNY1r0p.AimY...

⏭️  admin                - 已是 bcrypt 哈希，跳过
✅ nurse1               - 已更新 (原: 123456)
✅ sales1               - 已更新 (原: 123456)

============================================================
📊 处理完成统计:
   ✅ 已更新: 6 个账号
   ⏭️  已跳过: 4 个账号 (已是 bcrypt 哈希)
   ❌ 失败:   0 个账号
============================================================

🔑 所有更新的账号密码已重置为: 123456
🔐 使用 bcrypt 哈希算法，salt rounds: 12

✅ 数据库连接已关闭

🎉 密码哈希处理完成！
```

## 配置说明

脚本中的配置项：

```javascript
const SALT_ROUNDS = 12;        // bcrypt 加密强度（推荐 10-12）
const DEFAULT_PASSWORD = '123456';  // 默认重置密码
```

### 数据库连接配置

```javascript
const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});
```

## 安全性说明

### bcrypt 哈希格式

- **算法**: bcrypt
- **Salt Rounds**: 12（2^12 = 4096 次迭代）
- **哈希长度**: 60 字符
- **格式**: `$2b$12$[22字符salt][31字符hash]`

### 为什么使用 bcrypt？

1. **慢速哈希**: 故意设计为计算密集型，防止暴力破解
2. **自动加盐**: 每个密码都有唯一的 salt，防止彩虹表攻击
3. **可配置强度**: 通过 salt rounds 调整计算复杂度
4. **行业标准**: 广泛应用于生产环境

## 系统集成

### 登录验证

系统已配置为只支持 bcrypt 哈希密码：

```javascript
// server/api-server.cjs
const bcrypt = require('bcrypt');
const isPasswordValid = await bcrypt.compare(password, user.password_hash);
```

### 密码重置

密码重置 API 已更新为使用 bcrypt 哈希：

```javascript
// server/api-server.cjs - /api/users/:id/reset-password
const bcrypt = require('bcrypt');
const saltRounds = 12;
const passwordHash = await bcrypt.hash(new_password, saltRounds);
```

## 注意事项

⚠️ **重要提醒**：

1. 运行此脚本会将所有明文密码重置为 `123456`
2. 已经是 bcrypt 哈希的密码不会被修改
3. 建议在生产环境运行前先备份数据库
4. 脚本执行后，通知用户使用新密码登录

## 故障排除

### 常见问题

**Q: 脚本运行失败，提示数据库连接错误**
```
A: 检查数据库是否运行：docker ps | grep postgres
   检查连接配置是否正确
```

**Q: 某些账号更新失败**
```
A: 查看错误日志，可能是数据库权限或约束问题
   脚本会继续处理其他账号
```

**Q: 如何验证密码已正确哈希？**
```bash
# 查看密码哈希格式
docker exec bio-appointment-postgres psql -U app_user -d bio_appointment \
  -c "SELECT username, LEFT(password_hash, 30), LENGTH(password_hash) FROM profiles;"
```

## 相关文件

- `scripts/hash-passwords.js` - 密码哈希脚本
- `server/api-server.cjs` - API 服务器（包含登录和密码重置逻辑）
- `.gitignore` - 确保脚本不被忽略

## 维护建议

1. **定期审计**: 定期检查是否有明文密码
2. **密码策略**: 考虑实施更强的密码策略（长度、复杂度）
3. **Salt Rounds**: 根据服务器性能和安全需求调整
4. **监控日志**: 关注密码验证失败的日志

## 版本历史

- **v1.0.0** (2025-12-17)
  - 初始版本
  - 支持 bcrypt 哈希转换
  - 自动跳过已哈希密码
  - 详细的处理日志
