# Migrate Database from Supabase to Local PostgreSQL

## Overview
将Bio-Appointment智能预约调度系统的数据库从Supabase云服务迁移到本地PostgreSQL数据库，使用Docker Compose进行部署，端口映射到5437。

## Why
### Business Drivers
1. **数据主权需求**：医疗健康数据需要完全控制，满足合规要求
2. **成本优化**：消除第三方云服务费用，降低运营成本
3. **部署灵活性**：支持私有云和离线环境部署
4. **定制化需求**：根据业务需求自定义数据库配置和优化

### Technical Drivers
1. **性能优化**：本地网络访问减少延迟
2. **依赖简化**：减少对外部服务的依赖
3. **运维自主性**：完全掌握数据库运维和监控
4. **扩展性**：便于后续架构扩展和优化

## Current State
系统目前使用Supabase作为后端数据库和认证服务：
- 数据库托管在Supabase云端
- 使用Supabase JS Client进行数据库操作
- 依赖Supabase认证服务进行用户身份验证
- 实时数据同步通过Supabase实现

## Proposed Change
### Database Infrastructure
- 替换Supabase数据库为本地PostgreSQL实例
- 使用Docker Compose部署PostgreSQL容器
- 数据库端口映射到主机的5437端口
- 添加数据库初始化脚本和迁移工具

### Application Layer Changes
- 替换Supabase客户端为直接PostgreSQL连接
- 实现本地认证服务（替换Supabase Auth）
- 修改数据访问层以使用新的数据库连接
- 添加连接池管理和事务处理

### Deployment & Operations
- 创建Docker Compose配置文件
- 添加数据库备份和恢复脚本
- 实现数据库迁移脚本
- 更新环境配置和部署文档

## Benefits
1. **数据主权**：完全控制数据存储和访问
2. **成本控制**：消除第三方服务费用
3. **性能优化**：本地网络访问，减少延迟
4. **部署灵活性**：支持离线部署和私有云环境
5. **定制化**：可根据需求调整数据库配置

## Considerations
1. **维护责任**：需要自行处理数据库维护、备份、安全
2. **高可用性**：需要实现数据库集群和故障转移
3. **监控告警**：需要建立数据库监控体系
4. **安全加固**：需要实施数据库安全措施

## Impact Assessment
- **High Impact**: 数据访问层、认证系统、部署配置
- **Medium Impact**: 环境变量配置、开发工具、CI/CD流程
- **Low Impact**: UI组件、业务逻辑代码

## Success Criteria
1. 所有现有功能在本地数据库环境下正常工作
2. 数据迁移过程完整且无损
3. 性能达到或超过现有Supabase方案
4. 部署和维护文档完整
5. 开发和测试流程适配新的数据库配置