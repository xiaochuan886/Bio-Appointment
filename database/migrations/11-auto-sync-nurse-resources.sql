-- 自动同步护士资源
-- 当在profiles表中创建或更新护士用户时，自动在resources表中创建或更新对应的资源记录

-- 创建触发器函数：同步护士资源
CREATE OR REPLACE FUNCTION sync_nurse_resource()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果是护士或护士长
  IF NEW.role IN ('nurse', 'head_nurse') AND NEW.status = 'active' THEN
    -- 检查是否已存在资源记录
    IF EXISTS (
      SELECT 1 FROM resources 
      WHERE name = NEW.full_name AND type = 'nurse'
    ) THEN
      -- 更新现有资源记录
      UPDATE resources
      SET 
        status = 'available',
        store_id = NEW.store_id,
        updated_at = CURRENT_TIMESTAMP
      WHERE name = NEW.full_name AND type = 'nurse';
    ELSE
      -- 创建新资源记录
      INSERT INTO resources (name, type, status, store_id)
      VALUES (NEW.full_name, 'nurse', 'available', NEW.store_id);
    END IF;
  -- 如果护士被停用，更新资源状态
  ELSIF NEW.role IN ('nurse', 'head_nurse') AND NEW.status != 'active' THEN
    UPDATE resources
    SET 
      status = 'unavailable',
      updated_at = CURRENT_TIMESTAMP
    WHERE name = NEW.full_name AND type = 'nurse';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：在插入或更新profiles时自动同步
DROP TRIGGER IF EXISTS trigger_sync_nurse_resource ON profiles;
CREATE TRIGGER trigger_sync_nurse_resource
  AFTER INSERT OR UPDATE OF role, status, full_name, store_id
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_nurse_resource();

-- 为现有护士创建资源记录（如果不存在）
INSERT INTO resources (name, type, status, store_id)
SELECT 
  p.full_name,
  'nurse' as type,
  'available' as status,
  p.store_id
FROM profiles p
WHERE p.role IN ('nurse', 'head_nurse')
  AND p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM resources r
    WHERE r.name = p.full_name AND r.type = 'nurse'
  );

-- 添加注释
COMMENT ON FUNCTION sync_nurse_resource() IS '自动同步护士用户到资源表';
COMMENT ON TRIGGER trigger_sync_nurse_resource ON profiles IS '当护士用户创建或更新时，自动同步到resources表';
