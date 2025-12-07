# Store Management Specification

## ADDED Requirements

### Requirement: Store Entity Management

系统应当提供门店实体的完整生命周期管理功能，包括创建、查询、更新和删除门店信息。

#### Scenario: Create new store successfully
- **GIVEN** 管理员已登录系统
- **WHEN** 管理员提供门店名称、地址、联系电话等必填信息
- **THEN** 系统应当创建新门店并返回门店ID
- **AND** 门店状态应当默认为"active"

#### Scenario: Query store list with filters
- **GIVEN** 系统中存在多个门店
- **WHEN** 用户请求门店列表
- **THEN** 系统应当返回所有门店的基本信息
- **AND** 支持按状态（active/inactive）过滤
- **AND** 支持按名称模糊搜索

#### Scenario: Update store information
- **GIVEN** 门店已存在于系统中
- **WHEN** 管理员更新门店的名称、地址或联系方式
- **THEN** 系统应当保存更新后的信息
- **AND** 更新 `updated_at` 时间戳

#### Scenario: Deactivate store
- **GIVEN** 门店当前状态为"active"
- **WHEN** 管理员将门店状态设置为"inactive"
- **THEN** 系统应当更新门店状态
- **AND** 该门店不应出现在预约创建的门店选择列表中
- **AND** 已关联该门店的资源和预约不受影响

#### Scenario: Delete store with validation
- **GIVEN** 门店存在于系统中
- **WHEN** 管理员尝试删除该门店
- **AND** 该门店下存在关联的用户、资源或预约
- **THEN** 系统应当拒绝删除操作
- **AND** 返回错误信息提示存在关联数据

#### Scenario: Delete empty store
- **GIVEN** 门店存在于系统中
- **AND** 该门店下没有任何关联的用户、资源或预约
- **WHEN** 管理员删除该门店
- **THEN** 系统应当成功删除门店记录

### Requirement: Store-Resource Association

系统应当支持将资源（护士、医生、房间）关联到特定门店，实现资源的门店级管理。

#### Scenario: Associate nurse with store
- **GIVEN** 护士用户已存在于系统中
- **WHEN** 管理员将护士分配到特定门店
- **THEN** 系统应当更新护士的 `store_id` 字段
- **AND** 该护士只能被分配到该门店的排班中

#### Scenario: Associate doctor with store
- **GIVEN** 医生用户已存在于系统中
- **WHEN** 管理员将医生分配到特定门店
- **THEN** 系统应当更新医生的 `store_id` 字段
- **AND** 该医生只能被选择为该门店预约的医生

#### Scenario: Associate room with store
- **GIVEN** 房间资源已存在于系统中
- **WHEN** 管理员将房间分配到特定门店
- **THEN** 系统应当更新房间的 `store_id` 字段
- **AND** 该房间只能被用于该门店的排班

#### Scenario: Query resources by store
- **GIVEN** 系统中存在多个门店和资源
- **WHEN** 用户查询特定门店的资源列表
- **THEN** 系统应当只返回该门店关联的资源
- **AND** 包括护士、医生和房间

#### Scenario: Transfer resource between stores
- **GIVEN** 资源已关联到门店A
- **WHEN** 管理员将资源转移到门店B
- **THEN** 系统应当更新资源的 `store_id` 为门店B
- **AND** 该资源的历史排班记录保持不变

### Requirement: Store-Based Appointment Flow

系统应当要求预约创建时必须先选择门店，并根据门店过滤可用的服务和资源。

#### Scenario: Select store before creating appointment
- **GIVEN** 销售人员正在创建新预约
- **WHEN** 销售人员进入预约创建页面
- **THEN** 系统应当首先显示门店选择界面
- **AND** 只显示状态为"active"的门店

#### Scenario: Filter services by store
- **GIVEN** 销售人员已选择门店A
- **WHEN** 销售人员选择服务项目
- **THEN** 系统应当只显示门店A可用的服务项目
- **AND** 其他门店的服务不应出现在列表中

#### Scenario: Filter doctors by store
- **GIVEN** 销售人员已选择门店A
- **AND** 服务项目需要医生参与
- **WHEN** 销售人员选择医生
- **THEN** 系统应当只显示门店A的医生列表
- **AND** 其他门店的医生不应出现在列表中

#### Scenario: Create appointment with store
- **GIVEN** 销售人员已选择门店并填写完整预约信息
- **WHEN** 销售人员提交预约
- **THEN** 系统应当创建预约并关联到选定的门店
- **AND** 预约的 `store_id` 字段应当正确设置

#### Scenario: Prevent cross-store resource assignment
- **GIVEN** 预约关联到门店A
- **WHEN** 护士长尝试为该预约分配门店B的护士或房间
- **THEN** 系统应当拒绝该操作
- **AND** 返回错误信息提示资源不属于该门店

### Requirement: Store-Based Schedule Management

系统应当根据用户所属门店自动过滤排班数据，护士长只能管理自己门店的排班。

#### Scenario: Head nurse views own store schedules
- **GIVEN** 护士长属于门店A
- **WHEN** 护士长访问排班管理页面
- **THEN** 系统应当只显示门店A的预约和排班
- **AND** 其他门店的数据不应显示

#### Scenario: Head nurse assigns resources within store
- **GIVEN** 护士长属于门店A
- **AND** 正在为门店A的预约创建排班
- **WHEN** 护士长选择护士和房间
- **THEN** 系统应当只显示门店A的护士和房间列表
- **AND** 其他门店的资源不应出现

#### Scenario: Admin views all stores schedules
- **GIVEN** 超级管理员已登录系统
- **WHEN** 管理员访问排班管理页面
- **THEN** 系统应当显示所有门店的排班数据
- **AND** 提供门店过滤器供管理员选择查看特定门店

#### Scenario: Nurse views own store tasks
- **GIVEN** 护士属于门店A
- **WHEN** 护士访问任务列表页面
- **THEN** 系统应当只显示门店A的任务
- **AND** 其他门店的任务不应显示

### Requirement: Store-Based Permission Control

系统应当基于门店实现细粒度的权限控制，确保用户只能访问和操作自己门店的数据。

#### Scenario: Head nurse cannot access other store data
- **GIVEN** 护士长属于门店A
- **WHEN** 护士长尝试通过API直接访问门店B的预约或排班数据
- **THEN** 系统应当拒绝该请求
- **AND** 返回403 Forbidden错误

#### Scenario: Sales can create appointments for any store
- **GIVEN** 销售人员已登录系统
- **WHEN** 销售人员创建预约
- **THEN** 系统应当允许销售人员选择任意活跃门店
- **AND** 不限制销售人员的门店访问权限

#### Scenario: Admin can manage all stores
- **GIVEN** 超级管理员已登录系统
- **WHEN** 管理员访问任何门店的数据或执行管理操作
- **THEN** 系统应当允许所有操作
- **AND** 不应有门店级别的访问限制

#### Scenario: Nurse cannot view other store appointments
- **GIVEN** 护士属于门店A
- **WHEN** 护士尝试查看预约列表
- **THEN** 系统应当只返回门店A的预约
- **AND** 即使护士知道其他门店预约的ID也无法访问

### Requirement: DingTalk Department Store Mapping

系统应当支持将钉钉部门映射到门店，实现钉钉用户同步时自动关联门店。

#### Scenario: Map DingTalk department to store
- **GIVEN** 系统中存在门店A
- **AND** 钉钉中存在部门"北京分店"
- **WHEN** 管理员将钉钉部门"北京分店"映射到门店A
- **THEN** 系统应当保存该映射关系
- **AND** 该部门下的用户同步时自动关联到门店A

#### Scenario: Sync user with store from DingTalk
- **GIVEN** 钉钉部门"北京分店"已映射到门店A
- **WHEN** 系统同步钉钉用户
- **AND** 用户属于"北京分店"部门
- **THEN** 系统应当创建或更新用户
- **AND** 用户的 `store_id` 应当设置为门店A的ID

#### Scenario: Handle user in multiple departments
- **GIVEN** 钉钉用户同时属于多个部门
- **AND** 这些部门映射到不同的门店
- **WHEN** 系统同步该用户
- **THEN** 系统应当使用用户的主部门确定门店
- **OR** 如果无法确定，提示管理员手动分配门店

#### Scenario: Sync user without store mapping
- **GIVEN** 钉钉用户属于的部门没有映射到任何门店
- **WHEN** 系统同步该用户
- **THEN** 系统应当创建用户但不设置 `store_id`
- **AND** 记录日志提示需要手动分配门店

### Requirement: Data Migration for Existing Records

系统应当提供数据迁移功能，将现有的用户、资源和预约关联到默认门店。

#### Scenario: Create default store during migration
- **GIVEN** 系统正在执行门店管理功能的数据迁移
- **WHEN** 迁移脚本开始执行
- **THEN** 系统应当创建一个名为"默认门店"的门店
- **AND** 该门店状态为"active"

#### Scenario: Migrate existing users to default store
- **GIVEN** 系统中存在未关联门店的用户
- **AND** 默认门店已创建
- **WHEN** 迁移脚本执行用户迁移
- **THEN** 系统应当将所有未关联门店的用户关联到默认门店
- **AND** 更新用户的 `store_id` 字段

#### Scenario: Migrate existing resources to default store
- **GIVEN** 系统中存在未关联门店的资源（护士、医生、房间）
- **AND** 默认门店已创建
- **WHEN** 迁移脚本执行资源迁移
- **THEN** 系统应当将所有未关联门店的资源关联到默认门店
- **AND** 更新资源的 `store_id` 字段

#### Scenario: Migrate existing appointments to default store
- **GIVEN** 系统中存在未关联门店的预约
- **AND** 默认门店已创建
- **WHEN** 迁移脚本执行预约迁移
- **THEN** 系统应当将所有未关联门店的预约关联到默认门店
- **AND** 更新预约的 `store_id` 字段

#### Scenario: Verify migration completeness
- **GIVEN** 数据迁移已完成
- **WHEN** 管理员查询系统数据
- **THEN** 所有用户、资源和预约都应当关联到门店
- **AND** 不应存在 `store_id` 为NULL的记录（除非是新创建且未分配的）
