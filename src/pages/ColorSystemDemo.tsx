/**
 * 颜色系统演示页面
 * 展示医疗资源可视化的颜色编码系统
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NURSE_COLORS, ROOM_COLORS, STATUS_COLORS, getCombinedGradient } from '@/utils/colorSystem';
import { Palette, Users, Home, AlertCircle, CheckCircle, Star } from 'lucide-react';

export default function ColorSystemDemo() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          医疗资源颜色编码系统
        </h1>
        <p className="text-muted-foreground">
          直观展示护士与房间的对应关系，支持色盲友好设计
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">系统概览</TabsTrigger>
          <TabsTrigger value="nurses">护士颜色</TabsTrigger>
          <TabsTrigger value="rooms">房间颜色</TabsTrigger>
          <TabsTrigger value="combinations">组合展示</TabsTrigger>
        </TabsList>

        {/* 系统概览 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  护士颜色方案
                </CardTitle>
                <CardDescription>暖色调，明亮活泼</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {NURSE_COLORS.map((color) => (
                    <div
                      key={color.id}
                      className="w-12 h-12 rounded-lg border-2 border-white shadow-md transition-transform hover:scale-110"
                      style={{ backgroundColor: color.bg }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  共 {NURSE_COLORS.length} 种颜色，每位护士分配唯一标识
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  房间颜色方案
                </CardTitle>
                <CardDescription>冷色调，沉稳专业</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ROOM_COLORS.map((color) => (
                    <div
                      key={color.id}
                      className="w-12 h-12 rounded-lg shadow-md border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.border,
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  共 {ROOM_COLORS.length} 种颜色，每个房间分配唯一标识
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  状态指示颜色
                </CardTitle>
                <CardDescription>快速识别排班状态</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(STATUS_COLORS).map(([key, status]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded border-2"
                      style={{
                        backgroundColor: status.bg,
                        borderColor: status.bg,
                      }}
                    />
                    <div>
                      <p className="font-medium text-sm">{status.label}</p>
                      <p className="text-xs text-muted-foreground">{status.bg}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>设计原则</CardTitle>
              <CardDescription>确保系统的可用性和美观性</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">直观性</h4>
                      <p className="text-sm text-muted-foreground">
                        护士使用暖色调，房间使用冷色调，一目了然
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">一致性</h4>
                      <p className="text-sm text-muted-foreground">
                        同一资源始终使用相同颜色，建立视觉记忆
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">可区分性</h4>
                      <p className="text-sm text-muted-foreground">
                        每种颜色都经过精心挑选，确保高辨识度
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">可访问性</h4>
                      <p className="text-sm text-muted-foreground">
                        支持色盲用户，提供图案纹理辅助识别
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">5</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">美观性</h4>
                      <p className="text-sm text-muted-foreground">
                        专业、整洁、现代的视觉风格
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">6</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">响应性</h4>
                      <p className="text-sm text-muted-foreground">
                        适配不同设备尺寸，保持良好体验
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 护士颜色详情 */}
        <TabsContent value="nurses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                护士颜色方案（暖色调）
              </CardTitle>
              <CardDescription>
                明亮活泼的暖色系，每位护士分配唯一且易于区分的颜色标识
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-2">
                {NURSE_COLORS.map((color, index) => (
                  <div
                    key={color.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-white shadow-md flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: color.bg }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{color.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {color.bg}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {color.pattern}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        护士 {index + 1} 的专属颜色标识
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 房间颜色详情 */}
        <TabsContent value="rooms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                房间颜色方案（冷色调）
              </CardTitle>
              <CardDescription>
                沉稳专业的冷色系，每个房间分配唯一且易于区分的颜色标识
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-2">
                {ROOM_COLORS.map((color, index) => (
                  <div
                    key={color.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-16 h-16 rounded-lg shadow-md border-2 flex items-center justify-center text-white font-bold"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.border,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{color.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          主色: {color.bg}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          边框: {color.border}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        房间 {index + 1} 的专属颜色标识
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 组合展示 */}
        <TabsContent value="combinations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                护士-房间组合展示
              </CardTitle>
              <CardDescription>
                排班卡片使用渐变色展示护士和房间的配对关系
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    渐变色原理
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    排班卡片使用135度对角线渐变，左侧为护士颜色（暖色调），右侧为房间颜色（冷色调），
                    通过颜色组合快速识别护士-房间配对关系。
                  </p>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-12 rounded" style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF6B6B 50%, #1E3A8A 50%, #1E3A8A 100%)' }} />
                      <span className="text-sm">护士1（珊瑚橙）+ VIP室1（深海蓝）</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-12 rounded" style={{ background: 'linear-gradient(135deg, #9B59B6 0%, #9B59B6 50%, #065F46 50%, #065F46 100%)' }} />
                      <span className="text-sm">护士2（薰衣草紫）+ VIP室2（森林绿）</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-12 rounded" style={{ background: 'linear-gradient(135deg, #3498DB 0%, #3498DB 50%, #475569 50%, #475569 100%)' }} />
                      <span className="text-sm">护士3（天空蓝）+ VIP室3（石板灰）</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">所有可能的组合（示例）</h4>
                  <div className="grid gap-2 xl:grid-cols-5">
                    {NURSE_COLORS.slice(0, 5).map((nurseColor) =>
                      ROOM_COLORS.slice(0, 5).map((roomColor) => {
                        const gradient = getCombinedGradient(nurseColor.bg, roomColor.bg);
                        return (
                          <div
                            key={`${nurseColor.id}-${roomColor.id}`}
                            className="h-16 rounded-lg shadow-sm border border-white/20 transition-transform hover:scale-105"
                            style={{ background: gradient }}
                            title={`${nurseColor.name} + ${roomColor.name}`}
                          />
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    共 {NURSE_COLORS.length} × {ROOM_COLORS.length} = {NURSE_COLORS.length * ROOM_COLORS.length} 种可能的组合
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-3">状态叠加效果</h4>
                  <div className="grid gap-3 xl:grid-cols-3">
                    <div>
                      <p className="text-sm font-medium mb-2">急单（红色边框）</p>
                      <div
                        className="h-16 rounded-lg shadow-md"
                        style={{
                          background: getCombinedGradient(NURSE_COLORS[0].bg, ROOM_COLORS[0].bg),
                          border: '2px solid #EF4444',
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">已锁定（绿色边框）</p>
                      <div
                        className="h-16 rounded-lg shadow-md"
                        style={{
                          background: getCombinedGradient(NURSE_COLORS[1].bg, ROOM_COLORS[1].bg),
                          border: '2px solid #10B981',
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">筛选高亮（黄色光环）</p>
                      <div
                        className="h-16 rounded-lg shadow-md ring-2 ring-yellow-400 ring-offset-2"
                        style={{
                          background: getCombinedGradient(NURSE_COLORS[2].bg, ROOM_COLORS[2].bg),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
