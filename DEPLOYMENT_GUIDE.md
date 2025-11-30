# Bio-Appointment 本地数据库部署指南

本指南将帮助您将Bio-Appointment系统从Supabase迁移到本地PostgreSQL数据库。

## 🚀 快速开始

### 1. 环境要求

- Docker 和 Docker Compose
- Node.js 20+ 和 npm 10+
- PostgreSQL 客户端工具（可选）

### 2. 部署步骤

#### 2.1 启动数据库服务

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d

# 检查服务状态
docker-compose ps
```

#### 2.2 初始化数据库

```bash
# 运行数据库初始化脚本
./database/migrate.sh init
```

#### 2.3 配置环境变量

```bash
# 复制环境配置文件
cp .env.example .env.local

# 编辑配置文件，设置数据库连接参数
# DATABASE_TYPE=local
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5437
# POSTGRES_DB=bio_appointment
# POSTGRES_USER=app_user
# POSTGRES_PASSWORD=secure_password_123
```

#### 2.4 安装依赖并启动应用

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev -- --host 127.0.0.1
```

### 3. 默认用户账户

系统初始化后会创建以下默认用户：

| 用户名 | 密码 | 角色 | 描述 |
|--------|------|------|------|
| admin | admin123 | super_admin | 系统管理员 |
| sales1 | password123 | sales | 销售人员 |
| head_nurse1 | password123 | head_nurse | 护士长 |
| nurse1 | password123 | nurse | 护士 |
| doctor1 | password123 | doctor | 医生 |

## 📋 数据迁移（从Supabase）

如果您需要从现有的Supabase实例迁移数据：

### 1. 设置Supabase环境变量

```bash
export VITE_SUPABASE_URL="your-supabase-url"
export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### 2. 运行数据迁移脚本

```bash
# 运行迁移脚本
npx ts-node scripts/migrate-from-supabase.ts

# 迁移完成后会生成报告
cat migration-report.json
```

### 3. 验证迁移结果

```bash
# 检查数据库状态
./database/migrate.sh status
```

## 🔧 数据库管理

### 备份数据库

```bash
# 创建备份
./database/migrate.sh backup

# 备份文件保存在 backups/ 目录
ls -la backups/
```

### 恢复数据库

```bash
# 从备份恢复
./database/migrate.sh restore backups/bio_appointment_20231201_120000.sql
```

### 重置数据库

```bash
# 重置数据库（删除所有数据）
./database/migrate.sh reset
```

### 监控数据库

```bash
# 查看数据库状态
./database/migrate.sh status
```

## 🌐 网络配置

### 端口映射

- **PostgreSQL**: 5437 → 5432
- **Redis**: 6379 → 6379
- **PgAdmin**: 5050 → 80 (可选)

### 数据库连接信息

```
Host: localhost
Port: 5437
Database: bio_appointment
User: app_user
Password: secure_password_123
```

## 🔐 安全配置

### 1. 修改默认密码

```bash
# 编辑 docker-compose.yml
# 更新 POSTGRES_PASSWORD 和 REDIS_PASSWORD
```

### 2. 配置JWT密钥

```bash
# 编辑 .env.local
# 设置强密码作为 JWT_SECRET
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 3. 网络安全

- 默认配置仅允许本地访问
- 生产环境建议配置防火墙规则
- 启用SSL/TLS连接

## 📊 性能优化

### 1. 数据库连接池

```typescript
// 默认配置
max: 20,                    // 最大连接数
idleTimeoutMillis: 30000,   // 空闲超时
connectionTimeoutMillis: 2000, // 连接超时
```

### 2. Redis缓存

- 会话存储
- 实时数据缓存
- 查询结果缓存

### 3. 监控指标

```bash
# 查看资源使用情况
docker stats

# 查看数据库连接
docker exec bio-appointment-postgres psql -U app_user -d bio_appointment -c "SELECT * FROM pg_stat_activity;"
```

## 🛠️ 开发工具

### 1. PgAdmin（可选）

```bash
# 启动PgAdmin
docker-compose --profile admin up -d pgadmin

# 访问 http://localhost:5050
# 用户名: admin@example.com
# 密码: admin123
```

### 2. 命令行工具

```bash
# 连接到数据库
docker exec -it bio-appointment-postgres psql -U app_user -d bio_appointment

# 查看所有表
\dt

# 查看表结构
\d appointments
```

### 3. 日志查看

```bash
# 查看PostgreSQL日志
docker logs bio-appointment-postgres

# 查看Redis日志
docker logs bio-appointment-redis
```

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查容器状态
docker-compose ps

# 检查网络连接
docker network ls
docker network inspect app-7u4xlrye46ip_app-network
```

#### 2. 端口冲突

```bash
# 检查端口占用
lsof -i :5437
lsof -i :6379

# 修改docker-compose.yml中的端口映射
```

#### 3. 权限问题

```bash
# 检查文件权限
ls -la database/migrate.sh
chmod +x database/migrate.sh
```

#### 4. 内存不足

```bash
# 检查Docker资源限制
docker system df

# 清理未使用的资源
docker system prune -a
```

### 错误日志位置

- **应用日志**: 控制台输出
- **数据库日志**: `docker logs bio-appointment-postgres`
- **Redis日志**: `docker logs bio-appointment-redis`

## 📈 生产环境部署

### 1. 环境配置

```bash
# 生产环境变量
NODE_ENV=production
DATABASE_TYPE=local

# 使用强密码
POSTGRES_PASSWORD=your-production-password
JWT_SECRET=your-production-jwt-secret
REDIS_PASSWORD=your-production-redis-password
```

### 2. 性能调优

```bash
# 调整PostgreSQL配置
# 编辑 docker-compose.yml
# 添加 PostgreSQL 配置参数
command: postgres -c shared_preload_libraries=pg_stat_statements -c max_connections=100
```

### 3. 备份策略

```bash
# 设置定时备份
crontab -e

# 每天凌晨2点备份
0 2 * * * /path/to/bio-appointment/database/migrate.sh backup
```

### 4. 监控告警

- 使用Prometheus + Grafana监控
- 配置数据库性能告警
- 设置磁盘空间监控

## 🤝 获取帮助

### 文档资源

- [PostgreSQL官方文档](https://www.postgresql.org/docs/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- [Redis文档](https://redis.io/documentation)

### 社区支持

- GitHub Issues
- 技术论坛
- 在线聊天群组

---

**注意**: 本指南涵盖了基本的部署和管理操作。生产环境部署前请务必进行充分测试并咨询专业DBA。