# Change: 增强预约详情显示功能

## Why
当前预约详情对话框缺少关键信息：
1. 没有显示预约人（销售）的姓名，用户无法知道是谁创建的预约
2. 对于多客户预约，只显示主客户名称，没有正确展示总客户数量和所有客户姓名

这些信息对于预约管理和客户服务非常重要，需要在预约详情中完整展示。

## What Changes
- 在预约详情对话框中添加预约人（销售）信息显示
- 优化多客户预约的显示方式，正确展示客户数量和所有客户姓名
- 更新API查询以包含销售人员信息
- 改进UI布局以更好地组织信息

## Impact
- affected specs: appointment-management
- affected code: 
  - src/components/appointment/ScheduleDetailDialog.tsx
  - server/api-server.cjs (排班查询API)
  - src/types/types.ts (类型定义已存在)