# 预约工作流优化迁移指南

## 概述

本迁移指南详细说明了如何执行预约系统服务分类和流转优化的数据库迁移，包括新增的工作流状态、权限控制和审计功能。

## 迁移内容

### 1. 新增功能

- **工作流状态枚举**：8种状态支持不同服务类型的流转路径
- **预约工作流字段**：workflow_status, requires_nurse_scheduling, doctor_confirmed_at, forwarded_to_nurse_at
- **专用视图**：护士长和医生专用的预约视图
- **权限控制**：基于角色和工作流状态的精细化权限管理
- **审计日志**：完整的工作流状态变更记录
- **性能监控**：工作流处理效率统计

### 2. 状态流转路径

#### 护理服务 (nursing)
```
预约创建 → pending_nurse_assignment → nurse_scheduled → in_progress → completed
```

#### 医生服务 (consultation/report)
```
预约创建 → pending_doctor_confirmation → doctor_confirmed → nurse_scheduled → in_progress → completed
```

## 迁移前准备

### 1. 备份数据库
```bash
# 创建完整备份
pg_dump -h localhost -U postgres -d bio_appointment > backup_before_workflow_migration.sql

# 或者使用压缩备份
pg_dump -h localhost -U postgres -d bio_appointment | gzip > backup_before_workflow_migration.sql.gz
```

### 2. 检查数据库连接
```sql
-- 验证数据库连接
SELECT current_database(), version();

-- 检查现有表结构
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;
```

### 3. 验证现有数据
```sql
-- 检查现有预约数据
SELECT 
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
FROM appointments;

-- 检查服务分类
SELECT 
  s.category,
  COUNT(*) as service_count,
  STRING_AGG(s.name, ', ') as services
FROM services s
GROUP BY s.category;
```

## 执行迁移

### 1. 运行迁移脚本
```bash
# 方法1：使用psql命令行
psql -h localhost -U postgres -d bio_appointment -f database/migrations/06-add-appointment-workflow.sql

# 方法2：使用迁移脚本
cd database/migrations
psql -h localhost -U postgres -d bio_appointment < 06-add-appointment-workflow.sql
```

### 2. 验证迁移结果
```sql
-- 检查新增的枚举类型
SELECT typname, typcategory 
FROM pg_type 
WHERE typname = 'appointment_workflow_status';

-- 检查新增的字段
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('workflow_status', 'requires_nurse_scheduling', 'doctor_confirmed_at', 'forwarded_to_nurse_at')
ORDER BY ordinal_position;

-- 检查数据迁移结果
SELECT 
  workflow_status,
  requires_nurse_scheduling,
  COUNT(*) as count
FROM appointments 
GROUP BY workflow_status, requires_nurse_scheduling
ORDER BY workflow_status;
```

### 3. 验证视图创建
```sql
-- 检查护士长专用视图
SELECT COUNT(*) as nurse_pending_count
FROM nurse_pending_appointments;

-- 检查医生专用视图
SELECT COUNT(*) as doctor_pending_count
FROM doctor_pending_appointments;
```

### 4. 验证函数和触发器
```sql
-- 检查函数创建
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%workflow%' 
ORDER BY proname;

-- 检查触发器
SELECT tgname, tgrelid::regclass, tgfoid::regproc 
FROM pg_trigger 
WHERE tgname LIKE '%workflow%';
```

## 迁移后验证

### 1. 数据完整性检查
```sql
-- 运行数据完整性验证函数
SELECT validate_workflow_data_integrity();

-- 检查是否有数据问题
SELECT * FROM appointment_workflow_audit WHERE changed_at = NOW() - INTERVAL '1 minute';
```

### 2. 工作流统计验证
```sql
-- 获取工作流统计信息
SELECT get_workflow_statistics();

-- 按服务类别检查工作流状态
SELECT 
  s.category,
  a.workflow_status,
  COUNT(*) as count
FROM appointments a
JOIN services s ON a.service_id = s.id
GROUP BY s.category, a.workflow_status
ORDER BY s.category, a.workflow_status;
```

### 3. 权限控制测试
```sql
-- 测试权限检查函数
SELECT 
  a.id,
  a.workflow_status,
  check_appointment_workflow_access(a.id, 'test-user-id', 'head_nurse') as nurse_access,
  check_appointment_workflow_access(a.id, 'test-user-id', 'doctor') as doctor_access
FROM appointments a
LIMIT 10;
```

### 4. 性能监控验证
```sql
-- 检查工作流性能指标
SELECT * FROM workflow_performance_metrics;

-- 检查审计日志
SELECT COUNT(*) as audit_log_count
FROM appointment_workflow_audit;
```

## 应用程序更新

### 1. API接口更新

确保以下API接口已实现：

- `GET /api/appointments/nurse-pending` - 获取护士长待处理预约
- `GET /api/appointments/doctor-pending` - 获取医生待处理预约
- `PUT /api/appointments/:id/doctor-confirm` - 医生确认预约
- `PUT /api/appointments/:id/doctor-reject` - 医生拒绝预约
- `PUT /api/appointments/:id/workflow` - 更新工作流状态

### 2. 前端页面更新

#### 护士长页面 (SchedulePage.tsx)
- 使用新的API端点获取预约
- 根据工作流状态过滤预约
- 显示护理服务和医生已确认的预约

#### 医生页面 (AppointmentPage.tsx)
- 只显示待医生确认的预约
- 提供确认/拒绝操作按钮
- 显示服务分类信息

### 3. 权限控制更新

更新权限验证函数：
- `canProcessAppointment()` - 检查用户是否可以处理特定工作流状态的预约
- `getWorkflowStatusDisplayName()` - 获取工作流状态的显示名称
- `getNextWorkflowStatuses()` - 获取下一个可能的工作流状态

## 监控和维护

### 1. 定期维护任务

```sql
-- 清理90天前的审计日志（建议每周执行一次）
SELECT cleanup_workflow_audit_logs(90);

-- 检查数据完整性（建议每天执行一次）
SELECT validate_workflow_data_integrity();
```

### 2. 性能监控

```sql
-- 监控工作流处理效率
SELECT 
  DATE_TRUNC('day', changed_at) as date,
  new_status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (changed_at - created_at))/60) as avg_processing_time
FROM appointment_workflow_audit awa
JOIN appointments a ON awa.appointment_id = a.id
WHERE awa.changed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', changed_at), new_status
ORDER BY date DESC;
```

### 3. 异常监控

```sql
-- 检查长时间未处理的预约
SELECT 
  a.id,
  a.customer_name,
  a.workflow_status,
  a.created_at,
  EXTRACT(EPOCH FROM (NOW() - a.created_at))/3600 as hours_pending
FROM appointments a
WHERE a.workflow_status IN ('pending_nurse_assignment', 'pending_doctor_confirmation')
  AND a.created_at < NOW() - INTERVAL '24 hours'
ORDER BY a.created_at;
```

## 回滚方案

如果迁移出现问题，可以使用以下回滚方案：

### 1. 从备份恢复
```bash
# 恢复备份
psql -h localhost -U postgres -d bio_appointment < backup_before_workflow_migration.sql

# 或者从压缩备份恢复
gunzip -c backup_before_workflow_migration.sql.gz | psql -h localhost -U postgres -d bio_appointment
```

### 2. 部分回滚（如果只想回滚工作流相关更改）
```sql
-- 删除新增的字段（注意：这会丢失所有工作流数据）
ALTER TABLE appointments 
DROP COLUMN IF EXISTS workflow_status,
DROP COLUMN IF EXISTS requires_nurse_scheduling,
DROP COLUMN IF EXISTS doctor_confirmed_at,
DROP COLUMN IF EXISTS forwarded_to_nurse_at;

-- 删除枚举类型
DROP TYPE IF EXISTS appointment_workflow_status;

-- 删除视图
DROP VIEW IF EXISTS nurse_pending_appointments;
DROP VIEW IF EXISTS doctor_pending_appointments;

-- 删除审计表
DROP TABLE IF EXISTS appointment_workflow_audit;

-- 删除相关函数和触发器
DROP FUNCTION IF EXISTS set_appointment_workflow_status();
DROP FUNCTION IF EXISTS can_update_workflow_status(appointment_workflow_status, appointment_workflow_status, TEXT);
DROP FUNCTION IF EXISTS check_appointment_workflow_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS update_appointment_workflow(UUID, appointment_workflow_status, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_workflow_statistics(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS cleanup_workflow_audit_logs(INTEGER);
DROP FUNCTION IF EXISTS validate_workflow_data_integrity();
DROP FUNCTION IF EXISTS log_workflow_status_change();
```

## 常见问题解决

### 1. 迁移失败：权限不足
```sql
-- 确保用户有足够的权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
```

### 2. 数据迁移问题：服务分类不匹配
```sql
-- 检查服务分类
SELECT id, name, category FROM services WHERE category NOT IN ('nursing', 'consultation', 'report');

-- 更新服务分类
UPDATE services SET category = 'nursing' WHERE category NOT IN ('nursing', 'consultation', 'report');
```

### 3. 性能问题：索引未生效
```sql
-- 重新创建索引
REINDEX INDEX idx_appointments_workflow_status;
REINDEX INDEX idx_appointments_requires_nurse_scheduling;
REINDEX INDEX idx_appointments_doctor_confirmed_at;

-- 分析表统计信息
ANALYZE appointments;
ANALYZE appointment_workflow_audit;
```

### 4. 视图查询慢
```sql
-- 检查视图执行计划
EXPLAIN ANALYZE SELECT * FROM nurse_pending_appointments LIMIT 10;

-- 如果查询慢，可能需要添加额外的索引
CREATE INDEX CONCURRENTLY idx_appointments_service_id ON appointments(service_id);
CREATE INDEX CONCURRENTLY idx_appointments_store_id ON appointments(store_id);
```

## 联系支持

如果在迁移过程中遇到问题，请：

1. 检查PostgreSQL日志：`/var/log/postgresql/postgresql-*.log`
2. 查看应用程序日志
3. 收集错误信息和SQL执行计划
4. 联系数据库管理员或开发团队

---

**注意：** 在生产环境执行迁移前，请务必在测试环境完整测试迁移流程，并确保有完整的备份策略。