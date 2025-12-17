# 📚 Bio-Appointment 项目文档

欢迎来到 Bio-Appointment 项目文档中心!本目录包含了项目的所有技术文档、指南和历史记录。

## 📁 目录结构

```
docs/
├── guides/       - 使用指南和教程 (30 个文件)
├── features/     - 功能实现文档 (14 个文件)
├── bugfixes/     - Bug 修复记录 (9 个文件)
├── dingtalk/     - 钉钉集成相关 (10 个文件)
├── system/       - 系统设计和配置 (7 个文件)
└── archive/      - 历史修复报告 (60 个文件)
```

## 🚀 快速开始

### 新用户必读
1. **[快速开始指南](guides/QUICK_START.md)** - 项目快速上手
2. **[快速开始指南 (详细版)](guides/QUICK_START_GUIDE.md)** - 详细的启动说明
3. **[系统指南](guides/SYSTEM_GUIDE.md)** - 系统功能概览
4. **[启动脚本使用指南](guides/启动脚本使用指南.md)** - 如何启动项目

### 开发者指南
- **[设计指南](guides/DESIGN_GUIDE.md)** - UI/UX 设计规范
- **[部署指南](guides/DEPLOYMENT_GUIDE.md)** - 生产环境部署
- **[API 服务器重启指南](guides/API服务器重启指南.md)** - 服务器维护

## 📖 主要功能文档

### 核心功能
- **[认证实现总结](features/AUTH_IMPLEMENTATION_SUMMARY.md)** - 用户认证系统
- **[日期过滤实现](features/DATE_FILTER_IMPLEMENTATION_SUMMARY.md)** - 日期筛选功能
- **[智能排班实现](features/WEEK_MONTH_VIEW_IMPLEMENTATION.md)** - 周/月视图排班
- **[资源过滤功能](features/RESOURCE_FILTER_FEATURE.md)** - 资源筛选系统

### 钉钉集成
- **[钉钉快速开始](dingtalk/DINGTALK_QUICK_START.md)** - 钉钉集成快速配置
- **[钉钉设置指南](guides/DINGTALK_SETUP_GUIDE.md)** - 详细配置步骤
- **[钉钉同步功能说明](dingtalk/钉钉同步功能说明.md)** - 功能详解
- **[钉钉配置测试指南](guides/钉钉同步配置测试指南.md)** - 测试验证

## 🐛 问题排查

### Bug 修复记录
- **[Bug 修复总结](bugfixes/BUGFIX_SUMMARY.md)** - 所有 Bug 修复汇总
- **[日期选择器修复](bugfixes/BUGFIX_DATE_PICKER.md)**
- **[时长输入修复](bugfixes/BUGFIX_DURATION_INPUT.md)**
- **[护士选择修复](bugfixes/BUGFIX_NURSE_SELECTION.md)**
- **[排班页面加载修复](bugfixes/BUGFIX_SCHEDULE_PAGE_LOADING.md)**

### 常见问题
- **[登录问题排查指南](guides/登录问题排查指南.md)** - 登录相关问题
- **[Supabase 配置错误修复](guides/Supabase配置错误修复指南.md)** - 数据库配置

## 🎨 系统设计

### 设计系统
- **[项目状态](system/PROJECT_STATUS.md)** - 当前项目状态
- **[变更日志](system/CHANGELOG.md)** - 版本更新记录
- **[颜色系统总结](system/COLOR_SYSTEM_SUMMARY.md)** - 设计系统颜色规范
- **[布局优化](system/LAYOUT_OPTIMIZATION.md)** - 布局设计优化

### 优化记录
- **[优化总结](system/OPTIMIZATION_SUMMARY.md)** - 性能优化记录
- **[更新总结](system/UPDATE_SUMMARY.md)** - 功能更新汇总

## 📋 测试文档

- **[测试检查清单](guides/TESTING_CHECKLIST.md)** - 完整测试清单
- **[认证测试指南](guides/AUTH_TESTING_GUIDE.md)** - 认证功能测试
- **[护士任务历史测试](guides/护士任务历史页面测试指南.md)** - 护士功能测试
- **[清理测试数据指南](guides/CLEAN_TEST_DATA_GUIDE.md)** - 测试数据管理

## 📦 功能特性

### 资源管理
- **[资源过滤用户指南](guides/RESOURCE_FILTER_USER_GUIDE.md)**
- **[资源过滤可视化指南](guides/RESOURCE_FILTER_VISUAL_GUIDE.md)**
- **[资源过滤演示](guides/RESOURCE_FILTER_DEMO.md)**

### 日期过滤
- **[日期过滤用户指南](guides/DATE_FILTER_USER_GUIDE.md)**
- **[严格过滤用户指南](guides/STRICT_FILTER_USER_GUIDE.md)**
- **[严格过滤快速参考](guides/STRICT_FILTER_QUICK_REF.md)**

### 用户权限
- **[用户认证指南](guides/USER_AUTH_GUIDE.md)**
- **[任务历史权限控制](guides/任务历史页面权限控制使用指南.md)**

## 🏪 门店管理
- **[门店管理功能使用指南](guides/门店管理功能使用指南.md)** - 多门店管理

## 📱 预约管理
- **[预约详情增强测试](guides/预约详情增强功能手动测试指南.md)** - 预约功能测试

## 🎯 快速参考

- **[快速参考](guides/QUICK_REFERENCE.md)** - 常用命令和配置
- **[颜色快速参考](guides/COLOR_QUICK_REFERENCE.md)** - 设计颜色速查
- **[可视化指南](guides/VISUAL_GUIDE.md)** - UI 组件参考

## 📚 历史文档

所有历史修复报告和过时文档已归档到 **[archive/](archive/)** 目录,包括:
- 60+ 个历史修复报告
- 功能改进记录
- 技术架构设计文档
- 测试报告

## 🔗 相关链接

- **项目主页**: [README.md](../README.md)
- **待办事项**: [TODO.md](../TODO.md)
- **清理报告**: [CLEANUP_REPORT.md](../CLEANUP_REPORT.md)

## 📝 文档维护

- **最后整理时间**: 2025-12-17
- **文档总数**: 130+ 个
- **维护者**: 项目团队

---

💡 **提示**: 如果你是第一次接触本项目,建议按以下顺序阅读:
1. [快速开始指南](guides/QUICK_START.md)
2. [系统指南](guides/SYSTEM_GUIDE.md)
3. [设计指南](guides/DESIGN_GUIDE.md)
4. 根据需要查阅具体功能文档
