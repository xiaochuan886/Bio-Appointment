-- 护士工作流程优化数据库迁移脚本
-- 创建时间: 2025-12-09
-- 描述: 添加护士工作流程相关的表结构、枚举类型和视图

-- 1. 创建任务执行状态枚举
CREATE TYPE task_execution_status_enum AS ENUM (
    'pending',     -- 待执行
    'in_progress',  -- 执行中
    'completed',    -- 已完成
    'cancelled',    -- 已取消
    'interrupted'   -- 已中断
);

-- 2. 创建任务执行记录表
CREATE TABLE task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status task_execution_status_enum NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建护士签到记录表
CREATE TABLE nurse_sign_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sign_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sign_out_time TIMESTAMP WITH TIME ZONE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建通知记录表
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    related_id UUID,
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 更新排班状态枚举（如果已存在则先删除）
DROP TYPE IF EXISTS schedule_status_enum CASCADE;
CREATE TYPE schedule_status_enum AS ENUM (
    'pending',           -- 待处理
    'scheduled',         -- 已排班
    'customer_arrived',  -- 客户已到达
    'service_started',    -- 服务已开始
    'in_progress',       -- 进行中
    'service_completed', -- 服务已完成
    'completed',         -- 已完成
    'cancelled',         -- 已取消
    'customer_no_show',  -- 客户未到
    'service_interrupted' -- 服务中断
);

-- 6. 创建护士今日任务视图
CREATE OR REPLACE VIEW nurse_today_tasks AS
SELECT 
    s.id, s.scheduled_date, s.scheduled_time_start, s.scheduled_time_end, s.status,
    a.customer_name, a.customer_phone,
    srv.name as service_name, srv.category as service_category,
    r.name as room_name, r.type as room_type,
    p.full_name as nurse_name,
    te.id as task_execution_id, te.started_at, te.completed_at, te.status as execution_status,
    CASE WHEN te.id IS NOT NULL THEN true ELSE false END as has_execution
FROM schedules s
LEFT JOIN appointments a ON s.appointment_id = a.id
LEFT JOIN services srv ON a.service_id = srv.id
LEFT JOIN resources r ON s.room_id = r.id
LEFT JOIN profiles p ON s.nurse_id = p.id
LEFT JOIN task_executions te ON s.id = te.schedule_id
WHERE s.scheduled_date = CURRENT_DATE
  AND s.status NOT IN ('cancelled', 'customer_no_show')
ORDER BY s.scheduled_time_start;

-- 7. 创建护士工作统计视图
CREATE OR REPLACE VIEW nurse_work_statistics AS
SELECT 
    p.id as nurse_id, p.full_name as nurse_name, p.department,
    COUNT(s.id) as total_schedules,
    COUNT(CASE WHEN s.status = 'completed' OR s.status = 'service_completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN s.status = 'in_progress' OR s.status = 'service_started' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN s.status = 'pending' OR s.status = 'scheduled' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN s.status = 'cancelled' OR s.status = 'customer_no_show' THEN 1 END) as cancelled_tasks,
    AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))/60) as avg_service_duration_minutes,
    COUNT(CASE WHEN s.scheduled_date = CURRENT_DATE THEN 1 END) as today_tasks
FROM profiles p
LEFT JOIN schedules s ON p.id = s.nurse_id
LEFT JOIN task_executions te ON s.id = te.schedule_id
WHERE p.role = 'nurse' AND p.is_active = true
GROUP BY p.id, p.full_name, p.department;

-- 8. 创建索引以提高查询性能
CREATE INDEX idx_task_executions_schedule_id ON task_executions(schedule_id);
CREATE INDEX idx_task_executions_nurse_id ON task_executions(nurse_id);
CREATE INDEX idx_task_executions_status ON task_executions(status);
CREATE INDEX idx_nurse_sign_ins_nurse_id ON nurse_sign_ins(nurse_id);
CREATE INDEX idx_nurse_sign_ins_work_date ON nurse_sign_ins(work_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- 9. 创建触发器函数：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. 为相关表添加 updated_at 触发器
CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON task_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurse_sign_ins_updated_at BEFORE UPDATE ON nurse_sign_ins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 插入默认通知类型配置
INSERT INTO system_config (key, value, description, category) VALUES
('notification_types', '["info", "warning", "error", "success"]', '通知类型配置', 'notification'),
('task_execution_timeout_minutes', '120', '任务执行超时时间（分钟）', 'workflow'),
('auto_sign_out_hours', '12', '自动签退时间（小时）', 'workflow')
ON CONFLICT (key) DO NOTHING;

-- 12. 创建护士签到状态函数
CREATE OR REPLACE FUNCTION get_nurse_sign_in_status(nurse_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    is_signed_in BOOLEAN,
    sign_in_time TIMESTAMP WITH TIME ZONE,
    sign_out_time TIMESTAMP WITH TIME ZONE,
    work_duration_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (nsi.sign_in_time IS NOT NULL AND nsi.sign_out_time IS NULL) as is_signed_in,
        nsi.sign_in_time,
        nsi.sign_out_time,
        CASE 
            WHEN nsi.sign_in_time IS NOT NULL AND nsi.sign_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (nsi.sign_out_time - nsi.sign_in_time))/3600
            ELSE NULL 
        END as work_duration_hours
    FROM nurse_sign_ins nsi
    WHERE nsi.nurse_id = nurse_uuid AND nsi.work_date = target_date
    ORDER BY nsi.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 13. 创建任务状态更新函数
CREATE OR REPLACE FUNCTION update_task_status(
    schedule_uuid UUID,
    new_status schedule_status_enum,
    nurse_uuid UUID DEFAULT NULL,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status schedule_status_enum;
    task_execution_uuid UUID;
BEGIN
    -- 获取当前状态
    SELECT s.status INTO current_status FROM schedules s WHERE s.id = schedule_uuid;
    
    IF current_status IS NULL THEN
        RAISE EXCEPTION '排班记录不存在: %', schedule_uuid;
        RETURN FALSE;
    END IF;
    
    -- 更新排班状态
    UPDATE schedules SET 
        status = new_status,
        updated_at = NOW()
    WHERE id = schedule_uuid;
    
    -- 根据状态变化处理任务执行记录
    IF new_status = 'service_started' AND current_status != 'service_started' THEN
        -- 服务开始时创建任务执行记录
        INSERT INTO task_executions (schedule_id, nurse_id, started_at, status, notes)
        VALUES (schedule_uuid, nurse_uuid, NOW(), 'in_progress', notes)
        RETURNING id INTO task_execution_uuid;
        
    ELSIF new_status = 'service_completed' AND current_status != 'service_completed' THEN
        -- 服务完成时更新任务执行记录
        UPDATE task_executions SET 
            completed_at = NOW(),
            status = 'completed',
            notes = COALESCE(notes, task_executions.notes)
        WHERE schedule_id = schedule_uuid AND status = 'in_progress'
        RETURNING id INTO task_execution_uuid;
        
    ELSIF new_status = 'service_interrupted' THEN
        -- 服务中断时更新任务执行记录
        UPDATE task_executions SET 
            completed_at = NOW(),
            status = 'interrupted',
            notes = COALESCE(notes, task_executions.notes)
        WHERE schedule_id = schedule_uuid AND status = 'in_progress'
        RETURNING id INTO task_execution_uuid;
    END IF;
    
    -- 创建通知记录
    IF nurse_uuid IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES (
            nurse_uuid,
            '任务状态更新',
            format('任务状态已从 %s 更新为 %s', current_status, new_status),
            'info',
            schedule_uuid,
            'schedule'
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 14. 添加约束确保数据完整性
ALTER TABLE task_executions ADD CONSTRAINT check_execution_time 
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at);

ALTER TABLE nurse_sign_ins ADD CONSTRAINT check_sign_out_time 
    CHECK (sign_out_time IS NULL OR sign_out_time >= sign_in_time);

-- 15. 创建护士工作日报视图
CREATE OR REPLACE VIEW nurse_daily_report AS
SELECT 
    p.id as nurse_id,
    p.full_name as nurse_name,
    nsi.work_date,
    nsi.sign_in_time,
    nsi.sign_out_time,
    EXTRACT(EPOCH FROM (COALESCE(nsi.sign_out_time, NOW()) - nsi.sign_in_time))/3600 as work_hours,
    COUNT(s.id) as total_tasks,
    COUNT(CASE WHEN s.status = 'completed' OR s.status = 'service_completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN s.status = 'in_progress' OR s.status = 'service_started' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN s.status = 'cancelled' OR s.status = 'customer_no_show' THEN 1 END) as cancelled_tasks
FROM profiles p
LEFT JOIN nurse_sign_ins nsi ON p.id = nsi.nurse_id
LEFT JOIN schedules s ON p.id = s.nurse_id AND DATE(s.scheduled_date) = nsi.work_date
WHERE p.role = 'nurse' AND p.is_active = true
GROUP BY p.id, p.full_name, nsi.work_date, nsi.sign_in_time, nsi.sign_out_time
ORDER BY nsi.work_date DESC, p.full_name;

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '护士工作流程数据库迁移完成！';
    RAISE NOTICE '已创建表: task_executions, nurse_sign_ins, notifications';
    RAISE NOTICE '已创建视图: nurse_today_tasks, nurse_work_statistics, nurse_daily_report';
    RAISE NOTICE '已创建函数: get_nurse_sign_in_status, update_task_status';
    RAISE NOTICE '已创建索引和触发器';
END $$;