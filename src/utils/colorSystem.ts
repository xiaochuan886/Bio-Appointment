/**
 * 医疗资源颜色编码系统
 * 为护士和房间分配独特且易于区分的颜色标识
 */

// 护士颜色方案 - 使用暖色调和明亮色系
export const NURSE_COLORS = [
  { id: 'nurse-1', name: '珊瑚橙', bg: '#FF6B6B', text: '#FFFFFF', pattern: 'dots' },
  { id: 'nurse-2', name: '薰衣草紫', bg: '#9B59B6', text: '#FFFFFF', pattern: 'stripes' },
  { id: 'nurse-3', name: '天空蓝', bg: '#3498DB', text: '#FFFFFF', pattern: 'grid' },
  { id: 'nurse-4', name: '翡翠绿', bg: '#2ECC71', text: '#FFFFFF', pattern: 'waves' },
  { id: 'nurse-5', name: '阳光黄', bg: '#F39C12', text: '#FFFFFF', pattern: 'diagonal' },
  { id: 'nurse-6', name: '玫瑰粉', bg: '#E91E63', text: '#FFFFFF', pattern: 'circles' },
  { id: 'nurse-7', name: '青柠绿', bg: '#8BC34A', text: '#FFFFFF', pattern: 'hexagon' },
  { id: 'nurse-8', name: '深紫罗兰', bg: '#673AB7', text: '#FFFFFF', pattern: 'triangles' },
  { id: 'nurse-9', name: '橙红色', bg: '#FF5722', text: '#FFFFFF', pattern: 'cross' },
  { id: 'nurse-10', name: '青色', bg: '#00BCD4', text: '#FFFFFF', pattern: 'zigzag' },
];

// 房间颜色方案 - 使用冷色调和中性色系
export const ROOM_COLORS = [
  { id: 'room-1', name: '深海蓝', bg: '#1E3A8A', text: '#FFFFFF', border: '#3B82F6' },
  { id: 'room-2', name: '森林绿', bg: '#065F46', text: '#FFFFFF', border: '#10B981' },
  { id: 'room-3', name: '石板灰', bg: '#475569', text: '#FFFFFF', border: '#94A3B8' },
  { id: 'room-4', name: '深紫色', bg: '#581C87', text: '#FFFFFF', border: '#A855F7' },
  { id: 'room-5', name: '深青色', bg: '#155E75', text: '#FFFFFF', border: '#06B6D4' },
  { id: 'room-6', name: '橄榄绿', bg: '#3F6212', text: '#FFFFFF', border: '#84CC16' },
  { id: 'room-7', name: '深棕色', bg: '#78350F', text: '#FFFFFF', border: '#F59E0B' },
  { id: 'room-8', name: '靛蓝色', bg: '#312E81', text: '#FFFFFF', border: '#6366F1' },
  { id: 'room-9', name: '深粉色', bg: '#831843', text: '#FFFFFF', border: '#EC4899' },
  { id: 'room-10', name: '深灰色', bg: '#374151', text: '#FFFFFF', border: '#9CA3AF' },
];

// 资源状态颜色
export const STATUS_COLORS = {
  busy: { bg: '#EF4444', text: '#FFFFFF', label: '忙碌' },
  available: { bg: '#10B981', text: '#FFFFFF', label: '空闲' },
  cleaning: { bg: '#F59E0B', text: '#FFFFFF', label: '清洁中' },
  maintenance: { bg: '#6B7280', text: '#FFFFFF', label: '维护中' },
};

/**
 * 根据护士ID获取颜色
 */
export function getNurseColor(nurseId: string, nurses: Array<{ id: string }>) {
  const index = nurses.findIndex(n => n.id === nurseId);
  if (index === -1) return NURSE_COLORS[0];
  return NURSE_COLORS[index % NURSE_COLORS.length];
}

/**
 * 根据房间ID获取颜色
 */
export function getRoomColor(roomId: string, rooms: Array<{ id: string }>) {
  const index = rooms.findIndex(r => r.id === roomId);
  if (index === -1) return ROOM_COLORS[0];
  return ROOM_COLORS[index % ROOM_COLORS.length];
}

/**
 * 生成护士-房间组合的渐变色
 */
export function getCombinedGradient(nurseColor: string, roomColor: string) {
  return `linear-gradient(135deg, ${nurseColor} 0%, ${nurseColor} 50%, ${roomColor} 50%, ${roomColor} 100%)`;
}

/**
 * 生成护士-房间组合的双色条纹
 */
export function getCombinedStripes(nurseColor: string, roomColor: string) {
  return `repeating-linear-gradient(
    45deg,
    ${nurseColor},
    ${nurseColor} 10px,
    ${roomColor} 10px,
    ${roomColor} 20px
  )`;
}

/**
 * 获取SVG图案定义（用于辅助色盲用户识别）
 */
export function getPatternSVG(patternType: string, color: string) {
  const patterns: Record<string, string> = {
    dots: `<pattern id="dots-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.3)"/>
    </pattern>`,
    stripes: `<pattern id="stripes-${color}" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    </pattern>`,
    grid: `<pattern id="grid-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </pattern>`,
    waves: `<pattern id="waves-${color}" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
      <path d="M0,5 Q5,0 10,5 T20,5" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    </pattern>`,
    diagonal: `<pattern id="diagonal-${color}" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <line x1="0" y1="10" x2="10" y2="0" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    </pattern>`,
    circles: `<pattern id="circles-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="5" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </pattern>`,
    hexagon: `<pattern id="hexagon-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <polygon points="10,2 18,7 18,13 10,18 2,13 2,7" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </pattern>`,
    triangles: `<pattern id="triangles-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <polygon points="10,2 18,18 2,18" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </pattern>`,
    cross: `<pattern id="cross-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <line x1="10" y1="0" x2="10" y2="20" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    </pattern>`,
    zigzag: `<pattern id="zigzag-${color}" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
      <polyline points="0,5 5,0 10,5 15,0 20,5" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    </pattern>`,
  };
  
  return patterns[patternType] || patterns.dots;
}

/**
 * 检查颜色对比度是否足够（WCAG AA标准）
 */
export function hasGoodContrast(color1: string, color2: string): boolean {
  // 简化的对比度检查，实际应用中可以使用更精确的算法
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  
  return ratio >= 4.5; // WCAG AA标准
}
