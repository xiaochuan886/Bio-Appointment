/*
# 添加超级管理员角色到枚举

## 更新内容
- 添加 `super_admin` 到 `user_role` 枚举
- 创建 `user_status` 枚举类型
*/

-- 添加 super_admin 到 user_role 枚举
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 创建 user_status 枚举
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;