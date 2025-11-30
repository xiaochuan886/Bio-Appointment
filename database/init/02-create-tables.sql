-- Bio-Appointment Database Tables
-- Core business tables for the appointment scheduling system

-- Profiles table - User management
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'sales',
    department VARCHAR(255),
    status user_status NOT NULL DEFAULT 'active',
    password_hash VARCHAR(255) NOT NULL,
    dingtalk_userid VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Services table - Available services
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category service_category NOT NULL,
    base_duration INTEGER NOT NULL, -- in minutes
    requires_doctor BOOLEAN DEFAULT false,
    allow_companions BOOLEAN DEFAULT true,
    max_companions INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resources table - Available resources (rooms, equipment)
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type resource_type NOT NULL,
    category VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',
    capacity INTEGER DEFAULT 1,
    location VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table - Customer appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    companion_names TEXT[], -- array of companion names
    total_people INTEGER NOT NULL DEFAULT 1,
    service_id UUID NOT NULL REFERENCES services(id),
    requested_date DATE NOT NULL,
    requested_time_start TIME,
    requested_time_end TIME,
    estimated_duration INTEGER NOT NULL, -- in minutes
    actual_duration INTEGER, -- in minutes
    is_urgent BOOLEAN DEFAULT false,
    status appointment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    sales_id UUID REFERENCES profiles(id),
    doctor_id UUID REFERENCES profiles(id),
    doctor_status doctor_status DEFAULT 'pending',
    doctor_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Schedules table - Resource scheduling
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    scheduled_date DATE NOT NULL,
    scheduled_time_start TIME NOT NULL,
    scheduled_time_end TIME NOT NULL,
    room_id UUID REFERENCES resources(id),
    nurse_id UUID REFERENCES profiles(id),
    adjusted_duration INTEGER, -- in minutes
    adjustment_reason TEXT,
    status schedule_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Task Executions table - Task execution tracking
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id),
    nurse_id UUID REFERENCES profiles(id),
    check_in_time TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE,
    finish_time TIMESTAMP WITH TIME ZONE,
    actual_duration INTEGER, -- in minutes
    overtime_note TEXT,
    status task_execution_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DingTalk Users table - DingTalk user mappings
CREATE TABLE IF NOT EXISTS dingtalk_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    dingtalk_userid VARCHAR(255) UNIQUE NOT NULL,
    dingtalk_unionid VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    department_ids TEXT[], -- array of department IDs
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DingTalk Departments table - DingTalk department mappings
CREATE TABLE IF NOT EXISTS dingtalk_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dingtalk_dept_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES dingtalk_departments(id),
    order_num INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DingTalk Sync Logs table - Synchronization logs
CREATE TABLE IF NOT EXISTS dingtalk_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50) NOT NULL, -- 'departments' or 'users'
    status VARCHAR(50) NOT NULL, -- 'running', 'success', 'failed'
    total_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id)
);

-- DingTalk Notifications table - Notification records
CREATE TABLE IF NOT EXISTS dingtalk_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type VARCHAR(255) NOT NULL,
    recipient_userid VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    related_id UUID, -- Related to appointments, schedules, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session management table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_dingtalk_userid ON profiles(dingtalk_userid);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_is_active ON resources(is_active);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_name ON appointments(customer_name);
CREATE INDEX IF NOT EXISTS idx_appointments_requested_date ON appointments(requested_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_sales_id ON appointments(sales_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_is_urgent ON appointments(is_urgent);

CREATE INDEX IF NOT EXISTS idx_schedules_appointment_id ON schedules(appointment_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_date ON schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedules_room_id ON schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_schedules_nurse_id ON schedules(nurse_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);

CREATE INDEX IF NOT EXISTS idx_task_executions_schedule_id ON task_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_nurse_id ON task_executions(nurse_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);

CREATE INDEX IF NOT EXISTS idx_dingtalk_users_dingtalk_userid ON dingtalk_users(dingtalk_userid);
CREATE INDEX IF NOT EXISTS idx_dingtalk_users_profile_id ON dingtalk_users(profile_id);

CREATE INDEX IF NOT EXISTS idx_dingtalk_departments_dingtalk_dept_id ON dingtalk_departments(dingtalk_dept_id);
CREATE INDEX IF NOT EXISTS idx_dingtalk_departments_parent_id ON dingtalk_departments(parent_id);

CREATE INDEX IF NOT EXISTS idx_dingtalk_sync_logs_sync_type ON dingtalk_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_dingtalk_sync_logs_started_at ON dingtalk_sync_logs(started_at);

CREATE INDEX IF NOT EXISTS idx_dingtalk_notifications_recipient_userid ON dingtalk_notifications(recipient_userid);
CREATE INDEX IF NOT EXISTS idx_dingtalk_notifications_status ON dingtalk_notifications(status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON task_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dingtalk_users_updated_at BEFORE UPDATE ON dingtalk_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dingtalk_departments_updated_at BEFORE UPDATE ON dingtalk_departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_last_accessed_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit triggers for critical tables
CREATE TRIGGER audit_profiles_trigger AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_appointments_trigger AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_schedules_trigger AFTER INSERT OR UPDATE OR DELETE ON schedules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_task_executions_trigger AFTER INSERT OR UPDATE OR DELETE ON task_executions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_dingtalk_users_trigger AFTER INSERT OR UPDATE OR DELETE ON dingtalk_users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();