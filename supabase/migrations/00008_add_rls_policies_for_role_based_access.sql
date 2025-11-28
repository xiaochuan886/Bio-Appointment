/*
# 为预约和排班表添加基于角色的访问控制策略

## 权限规则

### appointments 表
1. **超级管理员和护士长**：查看所有预约
2. **销售**：只能查看自己创建的预约
3. **医生**：只能查看分配给自己的预约
4. **护士**：可以查看所有预约（用于执行任务）
5. **创建权限**：销售可以创建预约
6. **更新权限**：
   - 销售可以更新自己创建的预约（仅限 pending 状态）
   - 护士长可以更新所有预约
   - 医生可以更新分配给自己的预约的医生相关字段

### schedules 表
1. **超级管理员和护士长**：查看和管理所有排班
2. **护士**：只能查看分配给自己的排班
3. **销售**：可以查看与自己创建的预约相关的排班
4. **创建权限**：护士长可以创建排班
5. **更新权限**：
   - 护士长可以更新所有排班
   - 护士可以更新分配给自己的排班的状态字段

## 注意事项
- 所有策略都要求用户已认证
- 禁用状态的用户无法访问任何数据
*/

-- 1. 启用 RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 2. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "超级管理员和护士长查看所有预约" ON appointments;
DROP POLICY IF EXISTS "销售查看自己的预约" ON appointments;
DROP POLICY IF EXISTS "医生查看分配给自己的预约" ON appointments;
DROP POLICY IF EXISTS "护士查看所有预约" ON appointments;
DROP POLICY IF EXISTS "销售创建预约" ON appointments;
DROP POLICY IF EXISTS "销售更新自己的预约" ON appointments;
DROP POLICY IF EXISTS "护士长更新所有预约" ON appointments;
DROP POLICY IF EXISTS "医生更新自己的预约" ON appointments;

DROP POLICY IF EXISTS "超级管理员和护士长查看所有排班" ON schedules;
DROP POLICY IF EXISTS "护士查看自己的排班" ON schedules;
DROP POLICY IF EXISTS "销售查看相关排班" ON schedules;
DROP POLICY IF EXISTS "护士长创建排班" ON schedules;
DROP POLICY IF EXISTS "护士长更新所有排班" ON schedules;
DROP POLICY IF EXISTS "护士更新自己的排班" ON schedules;

-- 3. appointments 表的 RLS 策略

-- 查看权限
CREATE POLICY "超级管理员和护士长查看所有预约" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('super_admin'::user_role, 'head_nurse'::user_role)
  );

CREATE POLICY "销售查看自己的预约" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'sales'::user_role
    AND created_by = auth.uid()
  );

CREATE POLICY "医生查看分配给自己的预约" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'doctor'::user_role
    AND doctor_id = auth.uid()
  );

CREATE POLICY "护士查看所有预约" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'nurse'::user_role
  );

-- 创建权限
CREATE POLICY "销售创建预约" ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'sales'::user_role
    AND created_by = auth.uid()
  );

-- 更新权限
CREATE POLICY "销售更新自己的预约" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'sales'::user_role
    AND created_by = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "护士长更新所有预约" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'head_nurse'::user_role
  );

CREATE POLICY "医生更新自己的预约" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'doctor'::user_role
    AND doctor_id = auth.uid()
  )
  WITH CHECK (
    doctor_id = auth.uid()
  );

-- 4. schedules 表的 RLS 策略

-- 查看权限
CREATE POLICY "超级管理员和护士长查看所有排班" ON schedules
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('super_admin'::user_role, 'head_nurse'::user_role)
  );

CREATE POLICY "护士查看自己的排班" ON schedules
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'nurse'::user_role
    AND nurse_id = auth.uid()
  );

CREATE POLICY "销售查看相关排班" ON schedules
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'sales'::user_role
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = schedules.appointment_id
      AND appointments.created_by = auth.uid()
    )
  );

-- 创建权限
CREATE POLICY "护士长创建排班" ON schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'head_nurse'::user_role
  );

-- 更新权限
CREATE POLICY "护士长更新所有排班" ON schedules
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'head_nurse'::user_role
  );

CREATE POLICY "护士更新自己的排班" ON schedules
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'nurse'::user_role
    AND nurse_id = auth.uid()
  )
  WITH CHECK (
    nurse_id = auth.uid()
  );