# 门店管理系统数据库迁移指南

## 概述

本指南说明如何应用门店管理系统的数据库变更，包括创建stores表和相关关联，以及数据迁移。

## 变更内容

### 1. 新增表

- **stores**: 门店信息表，存储门店基本信息
  - 字段：id, name, address, phone, contact_person, status, description, business_hours, created_at, updated_at, created_by, updated_by

### 2. 修改表

- **profiles**: 添加 store_id 字段，用于关联护士、医生与门店
- **resources**: 添加 store_id 字段，用于关联房间与门店
- **appointments**: 添加 store_id 字段，用于关联预约与门店
- **dingtalk_departments**: 添加 store_id 字段，用于关联钉钉部门与门店

### 3. 数据迁移

- 创建"默认门店"作为现有数据的默认关联
- 将现有的护士、医生、资源、预约数据关联到默认门店

### 4. 新增功能

- 门店访问权限验证函数
- 门店资源查询函数
- 门店员工查询函数

## 应用变更

### 方法一：使用迁移脚本（推荐）

1. 确保PostgreSQL容器正在运行：
   ```bash
   docker-compose up -d postgres
   ```

2. 执行数据库初始化脚本：
   ```bash
   ./database/migrate.sh init
   ```

   这将按顺序执行database/init/目录下的所有SQL文件，包括新创建的05-add-store-management.sql。

### 方法二：手动执行SQL

1. 连接到数据库：
   ```bash
   docker exec -it bio-appointment-postgres psql -U app_user -d bio_appointment
   ```

2. 执行SQL文件：
   ```sql
   \i database/init/05-add-store-management.sql
   ```

## 验证变更

### 1. 检查stores表是否创建

```sql
SELECT * FROM stores;
```

应该能看到一个名为"默认门店"的记录。

### 2. 检查数据迁移是否完成

```sql
-- 检查profiles表
SELECT COUNT(*) as profiles_without_store FROM profiles WHERE store_id IS NULL AND role IN ('nurse', 'doctor', 'head_nurse');

-- 检查resources表
SELECT COUNT(*) as resources_without_store FROM resources WHERE store_id IS NULL;

-- 检查appointments表
SELECT COUNT(*) as appointments_without_store FROM appointments WHERE store_id IS NULL;
```

所有查询结果应该为0，表示数据迁移完成。

### 3. 测试新增函数

```sql
-- 测试门店资源查询
SELECT * FROM get_store_resources((SELECT id FROM stores LIMIT 1));

-- 测试门店员工查询
SELECT * FROM get_store_staff((SELECT id FROM stores LIMIT 1));
```

## 注意事项

1. **备份数据**：在应用变更前，建议先备份数据库：
   ```bash
   ./database/migrate.sh backup
   ```

2. **停机时间**：数据迁移可能需要一些时间，建议在低峰期执行。

3. **回滚计划**：如果需要回滚，可以使用备份文件恢复：
   ```bash
   ./database/migrate.sh restore backups/backup_file.sql
   ```

4. **权限更新**：应用变更后，需要确保应用程序有访问新表和函数的权限。

## 后续步骤

1. 更新应用程序代码以支持门店管理功能
2. 更新API以包含门店过滤和权限控制
3. 更新前端界面以支持门店选择和管理
4. 测试多门店场景下的功能完整性

## 故障排除

### 问题1：迁移脚本执行失败

**解决方案**：
1. 检查数据库连接是否正常
2. 确认数据库用户有足够的权限
3. 查看错误日志，根据具体错误信息进行修复

### 问题2：数据迁移不完整

**解决方案**：
1. 检查是否有NULL store_id的记录
2. 手动执行数据迁移SQL：
   ```sql
   UPDATE profiles SET store_id = (SELECT id FROM stores WHERE name = '默认门店') 
   WHERE store_id IS NULL AND role IN ('nurse', 'doctor', 'head_nurse');
   ```

### 问题3：权限问题

**解决方案**：
1. 确认app_user有执行新函数的权限
2. 如果需要，可以手动授予权限：
   ```sql
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;