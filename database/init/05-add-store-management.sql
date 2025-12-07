-- Bio-Appointment Store Management Database Schema
-- This script adds store management functionality to the existing database

-- Create store_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'store_status') THEN
        CREATE TYPE store_status AS ENUM ('active', 'inactive');
    END IF;
END $$;

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    contact_person VARCHAR(255),
    status store_status NOT NULL DEFAULT 'active',
    description TEXT,
    business_hours JSONB, -- Store business hours in JSON format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Add store_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Add store_id to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Add store_id to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Add store_id to dingtalk_departments table
ALTER TABLE dingtalk_departments 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Create indexes for store-related fields
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores(created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_resources_store_id ON resources(store_id);
CREATE INDEX IF NOT EXISTS idx_appointments_store_id ON appointments(store_id);
CREATE INDEX IF NOT EXISTS idx_dingtalk_departments_store_id ON dingtalk_departments(store_id);

-- Create composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_store_id ON profiles(role, store_id);
CREATE INDEX IF NOT EXISTS idx_resources_type_store_id ON resources(type, store_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status_store_id ON appointments(status, store_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_store_id ON appointments(requested_date, store_id);

-- Create trigger for stores table updated_at timestamp
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for stores table
CREATE TRIGGER audit_stores_trigger AFTER INSERT OR UPDATE OR DELETE ON stores
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create a default store for migration purposes
DO $$
DECLARE
    default_store_id UUID;
BEGIN
    -- Check if default store already exists
    SELECT id INTO default_store_id FROM stores WHERE name = '默认门店';
    
    -- If not exists, create it
    IF default_store_id IS NULL THEN
        INSERT INTO stores (name, address, phone, contact_person, status, description)
        VALUES ('默认门店', '系统默认门店', '400-000-0000', '系统管理员', 'active', '系统自动创建的默认门店，用于迁移现有数据')
        RETURNING id INTO default_store_id;
        
        RAISE NOTICE 'Created default store with ID: %', default_store_id;
    ELSE
        RAISE NOTICE 'Default store already exists with ID: %', default_store_id;
    END IF;
    
    -- Migrate existing data to default store
    -- Update profiles (nurses, doctors, head_nurses)
    UPDATE profiles 
    SET store_id = default_store_id 
    WHERE store_id IS NULL 
    AND role IN ('nurse', 'doctor', 'head_nurse');
    
    -- Update resources (rooms, equipment)
    UPDATE resources 
    SET store_id = default_store_id 
    WHERE store_id IS NULL;
    
    -- Update appointments
    UPDATE appointments 
    SET store_id = default_store_id 
    WHERE store_id IS NULL;
    
    RAISE NOTICE 'Migrated existing data to default store';
END $$;

-- Add comments for documentation
COMMENT ON TABLE stores IS '门店信息表，存储门店基本信息';
COMMENT ON COLUMN stores.name IS '门店名称';
COMMENT ON COLUMN stores.address IS '门店地址';
COMMENT ON COLUMN stores.phone IS '门店联系电话';
COMMENT ON COLUMN stores.contact_person IS '门店联系人';
COMMENT ON COLUMN stores.status IS '门店状态：active-启用，inactive-禁用';
COMMENT ON COLUMN stores.description IS '门店描述';
COMMENT ON COLUMN stores.business_hours IS '营业时间，JSON格式存储';

COMMENT ON COLUMN profiles.store_id IS '关联门店ID，用于标识用户所属门店';
COMMENT ON COLUMN resources.store_id IS '关联门店ID，用于标识资源所属门店';
COMMENT ON COLUMN appointments.store_id IS '关联门店ID，用于标识预约所属门店';
COMMENT ON COLUMN dingtalk_departments.store_id IS '关联门店ID，用于映射钉钉部门到门店';

-- Create a function to validate store access
CREATE OR REPLACE FUNCTION validate_store_access(
    p_user_id UUID,
    p_target_store_id UUID,
    p_user_role user_role
) RETURNS BOOLEAN AS $$
DECLARE
    user_store_id UUID;
BEGIN
    -- Super admin can access all stores
    IF p_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Sales can access all stores for creating appointments
    IF p_user_role = 'sales' THEN
        RETURN TRUE;
    END IF;
    
    -- Get user's store
    SELECT store_id INTO user_store_id FROM profiles WHERE id = p_user_id;
    
    -- For other roles, check if they belong to the target store
    RETURN user_store_id = p_target_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get store resources
CREATE OR REPLACE FUNCTION get_store_resources(
    p_store_id UUID,
    p_resource_type resource_type DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    type resource_type,
    category VARCHAR(255),
    status VARCHAR(50),
    capacity INTEGER,
    location VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.type,
        r.category,
        r.status,
        r.capacity,
        r.location
    FROM resources r
    WHERE r.store_id = p_store_id
    AND r.is_active = TRUE
    AND (p_resource_type IS NULL OR r.type = p_resource_type)
    ORDER BY r.type, r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get store staff
CREATE OR REPLACE FUNCTION get_store_staff(
    p_store_id UUID,
    p_role user_role DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    username VARCHAR(255),
    full_name VARCHAR(255),
    role user_role,
    status user_status,
    phone VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.role,
        p.status,
        p.phone
    FROM profiles p
    WHERE p.store_id = p_store_id
    AND p.status = 'active'
    AND (p_role IS NULL OR p.role = p_role)
    ORDER BY p.role, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION validate_store_access TO app_user;
GRANT EXECUTE ON FUNCTION get_store_resources TO app_user;
GRANT EXECUTE ON FUNCTION get_store_staff TO app_user;