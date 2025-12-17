# 颜色编码系统使用指南

## 🎯 快速开始

### 查看颜色系统演示

访问 `/color-system` 路由查看完整的颜色系统演示页面，包括：
- 系统概览
- 护士颜色详情
- 房间颜色详情
- 组合展示效果

### 在排班看板中使用

1. **查看图例**：在智能排班页面右侧，可以看到完整的资源颜色图例
2. **识别排班**：排班卡片使用渐变色，左侧为护士颜色，右侧为房间颜色
3. **悬停查看**：鼠标悬停在排班卡片上，可以看到详细的护士和房间信息

## 🎨 颜色识别技巧

### 护士颜色（暖色调）
- 珊瑚橙、薰衣草紫、天空蓝、翡翠绿、阳光黄
- 玫瑰粉、青柠绿、深紫罗兰、橙红色、青色

### 房间颜色（冷色调）
- 深海蓝、森林绿、石板灰、深紫色、深青色
- 橄榄绿、深棕色、靛蓝色、深粉色、深灰色

### 状态指示
- 🔴 **红色边框** = 急单，需优先处理
- 🟢 **绿色边框** = 已锁定，不可随意更改
- 🟡 **黄色光环** = 当前筛选的目标

## 💡 使用场景

### 场景1：快速识别护士工作量
通过颜色快速扫描看板，识别某位护士（特定颜色）的所有排班。

### 场景2：检查房间使用情况
通过颜色快速识别某个房间（特定颜色）的占用情况。

### 场景3：资源冲突检测
当两个排班卡片重叠时，通过颜色组合可以快速判断是否为同一护士或同一房间的冲突。

### 场景4：筛选查看
使用资源筛选器选择特定护士或房间，系统会高亮显示相关排班（黄色光环）。

## ♿ 无障碍支持

### 色盲用户
- 每个资源都有独特的图案纹理（圆点、条纹、网格等）
- 高对比度文字确保可读性
- 边框和光环提供额外的视觉区分

### 屏幕阅读器
- 所有交互元素都有适当的ARIA标签
- 工具提示内容可被屏幕阅读器访问

## 🔧 开发者指南

### 导入颜色系统

```typescript
import { 
  getNurseColor, 
  getRoomColor, 
  getCombinedGradient 
} from '@/utils/colorSystem';
```

### 获取资源颜色

```typescript
// 获取护士颜色
const nurseColor = getNurseColor(nurseId, nurses);
// nurseColor = { id, name, bg, text, pattern }

// 获取房间颜色
const roomColor = getRoomColor(roomId, rooms);
// roomColor = { id, name, bg, text, border }
```

### 生成组合渐变

```typescript
const gradient = getCombinedGradient(nurseColor.bg, roomColor.bg);
// gradient = "linear-gradient(135deg, #FF6B6B 0%, #FF6B6B 50%, #1E3A8A 50%, #1E3A8A 100%)"
```

### 应用到组件

```typescript
<div
  style={{
    background: gradient,
    color: 'white',
  }}
>
  排班内容
</div>
```

## 📚 相关文档

- [完整设计指南](./DESIGN_GUIDE.md) - 详细的设计原则和技术实现
- [颜色系统演示](/color-system) - 在线查看所有颜色和组合效果

## 🤝 反馈与建议

如果您在使用过程中有任何问题或建议，欢迎反馈！
