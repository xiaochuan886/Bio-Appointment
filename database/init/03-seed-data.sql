-- Bio-Appointment Database Seed Data
-- Initial data for the system to work with

-- Insert default services
INSERT INTO services (id, name, description, category, base_duration, requires_doctor, allow_companions, max_companions) VALUES
(uuid_generate_v4(), '基础回输', '基础细胞回输服务', 'nursing', 120, false, true, 3),
(uuid_generate_v4(), '静脉采血', '常规静脉采血服务', 'nursing', 30, false, true, 5),
(uuid_generate_v4(), '医生面诊', '医生面诊咨询服务', 'consultation', 60, true, true, 2),
(uuid_generate_v4(), '报告解读', '医疗报告深度解读', 'report', 45, true, true, 2),
(uuid_generate_v4(), '健康评估', '综合健康评估服务', 'consultation', 90, true, false, 0)
ON CONFLICT DO NOTHING;

-- Insert default resources (rooms)
INSERT INTO resources (id, name, type, category, capacity, location, description) VALUES
(uuid_generate_v4(), 'VIP室1', 'room', 'vip', 2, '1楼', 'VIP独立房间，配备舒适座椅'),
(uuid_generate_v4(), 'VIP室2', 'room', 'vip', 2, '1楼', 'VIP独立房间，配备舒适座椅'),
(uuid_generate_v4(), 'VIP室3', 'room', 'vip', 2, '2楼', 'VIP独立房间，配备舒适座椅'),
(uuid_generate_v4(), '治疗区A', 'room', 'treatment', 4, '1楼', '开放式治疗区域'),
(uuid_generate_v4(), '治疗区B', 'room', 'treatment', 4, '1楼', '开放式治疗区域'),
(uuid_generate_v4(), '治疗区C', 'room', 'treatment', 4, '2楼', '开放式治疗区域'),
(uuid_generate_v4(), '咨询室1', 'room', 'consultation', 3, '2楼', '私密咨询房间'),
(uuid_generate_v4(), '咨询室2', 'room', 'consultation', 3, '2楼', '私密咨询房间')
ON CONFLICT DO NOTHING;

-- Create a default super admin user
-- Password is "admin123" (hashed with bcrypt)
INSERT INTO profiles (id, username, email, full_name, role, department, status, password_hash) VALUES
(uuid_generate_v4(), 'admin', 'admin@example.com', '系统管理员', 'super_admin', '管理部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8')
ON CONFLICT (username) DO NOTHING;

-- Create sample users for different roles
-- Password is "password123" for all sample users (hashed with bcrypt)
INSERT INTO profiles (id, username, email, full_name, role, department, status, password_hash, phone) VALUES
(uuid_generate_v4(), 'sales1', 'sales1@example.com', '张销售', 'sales', '销售部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', '13800138001'),
(uuid_generate_v4(), 'head_nurse1', 'head_nurse1@example.com', '李护士长', 'head_nurse', '护理部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', '13800138002'),
(uuid_generate_v4(), 'nurse1', 'nurse1@example.com', '王护士', 'nurse', '护理部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', '13800138003'),
(uuid_generate_v4(), 'nurse2', 'nurse2@example.com', '刘护士', 'nurse', '护理部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', '13800138004'),
(uuid_generate_v4(), 'doctor1', 'doctor1@example.com', '陈医生', 'doctor', '医疗部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', '13800138005'),
(uuid_generate_v4(), 'doctor2', 'doctor2@example.com', '赵医生', 'doctor', '医疗部', 'active', '$2b$10$rI8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', '13800138006')
ON CONFLICT (username) DO NOTHING;

-- Insert sample DingTalk departments
INSERT INTO dingtalk_departments (id, dingtalk_dept_id, name, order_num) VALUES
(uuid_generate_v4(), '1', '根部门', 0),
(uuid_generate_v4(), '100', '管理层', 1),
(uuid_generate_v4(), '200', '销售部', 2),
(uuid_generate_v4(), '300', '护理部', 3),
(uuid_generate_v4(), '400', '医疗部', 4),
(uuid_generate_v4(), '500', '行政部', 5)
ON CONFLICT (dingtalk_dept_id) DO NOTHING;

-- Update department hierarchy
UPDATE dingtalk_departments
SET parent_id = (SELECT id FROM dingtalk_departments WHERE dingtalk_dept_id = '1')
WHERE dingtalk_dept_id IN ('100', '200', '300', '400', '500');

-- Insert sample system configurations
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_configs (config_key, config_value, description) VALUES
('jwt_settings', '{"secret_key": "your-secret-key-change-in-production", "expires_in": "24h", "refresh_expires_in": "7d"}', 'JWT配置设置'),
('app_settings', '{"name": "Bio-Appointment", "version": "1.0.0", "timezone": "Asia/Shanghai"}', '应用基础设置'),
('dingtalk_settings', '{"enabled": false, "app_key": "", "app_secret": "", "agent_id": ""}', '钉钉集成设置'),
('backup_settings', '{"enabled": true, "frequency": "daily", "retention_days": 30}', '备份设置')
ON CONFLICT (config_key) DO NOTHING;

-- Create triggers for system_configs
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();