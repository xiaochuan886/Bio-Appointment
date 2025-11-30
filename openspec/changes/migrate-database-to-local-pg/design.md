# Database Migration Architecture Design

## System Architecture Overview

### Current Architecture
```
Frontend (React) → Supabase JS Client → Supabase Cloud (PostgreSQL + Auth + Realtime)
```

### Target Architecture
```
Frontend (React) → API Layer → Local PostgreSQL (Docker)
                      ↓
               Local Auth Service
```

## Technical Design Decisions

### 1. Database Connection Strategy
**Decision**: 使用连接池管理数据库连接
- **库选择**: `pg` + `pg-pool`
- **连接池大小**: 10-20个连接
- **理由**: 高并发访问时的性能优化

### 2. Authentication Architecture
**Decision**: 实现基于JWT的本地认证服务
- **JWT库**: `jsonwebtoken`
- **密码加密**: `bcrypt`
- **Session管理**: Redis存储（可选）
- **理由**: 替换Supabase Auth，保持现有认证流程

### 3. Real-time Data Sync
**Decision**: 使用PostgreSQL LISTEN/NOTIFY + WebSocket
- **实现**: 自定义WebSocket服务器
- **替代方案**: Server-Sent Events
- **理由**: 替换Supabase实时功能，保持数据同步

### 4. Database Migration Strategy
**Decision**: 渐进式迁移
- **阶段1**: 搭建本地PostgreSQL环境
- **阶段2**: 实现数据访问层
- **阶段3**: 实现认证服务
- **阶段4**: 数据迁移和切换
- **理由**: 降低风险，确保平滑过渡

## Infrastructure Design

### Docker Compose Configuration
```yaml
services:
  postgres:
    image: postgres:15
    ports:
      - "5437:5432"
    environment:
      POSTGRES_DB: bio_appointment
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    restart: unless-stopped

  redis: # 可选，用于session管理
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

### Database Schema Management
- **工具**: `dbmate` 或 `Prisma Migrate`
- **版本控制**: Git管理迁移脚本
- **环境**: 开发/测试/生产环境独立管理

## Security Considerations

### Database Security
- 网络隔离：仅允许应用服务器访问
- 连接加密：SSL/TLS连接
- 权限最小化：应用专用数据库用户
- 敏感数据：字段级加密

### Authentication Security
- JWT密钥轮换
- 密码策略强制
- 登录失败限制
- Session超时管理

## Performance Optimization

### Database Optimization
- 索引策略：基于查询模式优化
- 查询优化：避免N+1查询
- 连接池配置：合理设置池大小
- 读写分离：如需要可考虑主从复制

### Application Optimization
- 缓存策略：Redis缓存热点数据
- 批量操作：减少数据库往返
- 异步处理：耗时操作异步化
- 监控指标：查询性能监控

## Monitoring & Observability

### Database Monitoring
- 连接数监控
- 查询性能监控
- 磁盘使用监控
- 复制延迟监控（如使用主从）

### Application Monitoring
- API响应时间
- 错误率监控
- 认证成功率
- 实时连接数

## Backup & Disaster Recovery

### Backup Strategy
- 全量备份：每日凌晨
- 增量备份：每小时
- WAL归档：实时
- 备份验证：定期恢复测试

### Disaster Recovery
- RPO: < 1小时
- RTO: < 4小时
- 故障转移：手动/自动切换
- 数据一致性检查

## Migration Risk Mitigation

### Technical Risks
1. **数据丢失风险**: 完整备份 + 增量同步验证
2. **性能下降风险**: 压力测试 + 性能基准对比
3. **功能兼容性风险**: 全面回归测试
4. **安全风险**: 安全审计 + 渗透测试

### Operational Risks
1. **部署失败风险**: 回滚方案准备
2. **维护成本风险**: 运维文档 + 培训计划
3. **监控盲区风险**: 监控覆盖度检查

## Rollback Plan

### Rollback Triggers
- 性能下降超过20%
- 错误率超过5%
- 关键功能异常
- 安全事件发生

### Rollback Steps
1. 切换回Supabase连接
2. 恢复Supabase数据同步
3. 停止本地PostgreSQL服务
4. 通知相关人员
5. 问题分析和修复

## Implementation Timeline

### Phase 1: Infrastructure Setup (Week 1)
- Docker Compose环境搭建
- PostgreSQL配置和初始化
- 基础监控和备份配置

### Phase 2: Data Access Layer (Week 2-3)
- 替换Supabase客户端
- 实现数据库连接池
- 数据访问接口重构

### Phase 3: Authentication Service (Week 4)
- JWT认证服务实现
- 密码管理和加密
- 权限控制适配

### Phase 4: Real-time Features (Week 5)
- WebSocket实时同步
- 替换Supabase实时功能
- 性能优化和测试

### Phase 5: Migration & Testing (Week 6)
- 数据迁移脚本
- 全面功能测试
- 性能和压力测试

### Phase 6: Deployment & Cutover (Week 7)
- 生产环境部署
- 数据迁移执行
- 监控和运维交接