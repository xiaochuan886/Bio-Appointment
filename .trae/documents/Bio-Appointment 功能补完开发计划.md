# Bio-Appointment 功能补完开发计划

根据PRD文档对比当前项目代码，发现以下功能尚未完全实现或存在偏差。本计划旨在补全这些功能。

## 1. 钉钉扫码登录 (DingTalk QR Login)

**现状**: `LoginPage.tsx` 仅包含邮箱/密码登录表单，未集成钉钉扫码功能。
**PRD要求**: [DD-01] 用户可通过钉钉扫一扫功能扫描系统生成的登录二维码，完成免密登录。

**开发任务**:
1.  **前端改造**: 修改 `src/pages/auth/LoginPage.tsx`。
    *   引入 `Tabs` 组件切换 "账号登录" 和 "钉钉扫码"。
    *   在钉钉扫码 Tab 中使用 `qrcodedataurl.tsx` (或新组件) 显示登录二维码。
    *   二维码链接应指向钉钉授权 URL (或后端生成的带参数 URL)。
    *   实现轮询 (Polling) 机制，检查用户是否已扫码并授权。
2.  **后端支持** (如有必要): 确认 `dingtalk-auth` Edge Function 或后端 API 能支持扫码状态查询。

## 2. 急单逻辑修正 (Urgent Order Logic Fix)

**现状**: `SalesAppointmentPage.tsx` 中急单逻辑允许所有 `category === 'nursing'` 的服务。
**PRD要求**: [HM-03] 急单预约...仅限抽血服务。

**开发任务**:
1.  **前端修正**: 修改 `src/pages/sales/AppointmentPage.tsx`。
    *   在 `onSubmit` 校验逻辑中，增强急单判断：当 `isUrgent` 为真时，仅允许 `service.name` 包含 "采血" 或匹配特定 ID 的服务。
    *   更新错误提示文案。

## 3. 钉钉消息通知 (DingTalk Notifications)

**现状**: 代码中缺乏服务端主动发送钉钉通知的逻辑 (仅有客户端 `dd.device.notification` 调用，适用于应用内)。
**PRD要求**:
    *   [DD-06] 预约确认通知 (护士长 -> 销售/护士/医生)
    *   [DD-07] 急单提醒通知 (销售 -> 护士长)
    *   [DD-08] 任务状态变更通知 (护士 -> 护士长)
    *   [DD-10] 医生预约申请通知 (销售 -> 医生)

**开发任务**:
1.  **后端服务**: 在 `server/src/services/` 下创建 `dingtalk-notify.ts` (或集成到现有 API)。
    *   实现 `sendWorkNotification(userIds, message)` 方法。
2.  **业务集成**:
    *   **急单提交**: 在 `createAppointment` 接口/逻辑后调用通知服务，通知护士长。
    *   **医生握手**: 在 `DoctorAppointmentPage.tsx` (或对应后端接口) 处理接受/拒绝/改期后，调用通知服务通知销售。
    *   **排班发布**: 在护士长确认排班后调用通知。

## 4. 医生端通知集成

**现状**: 医生处理预约后仅有 Toast 提示，无通知发送。
**PRD要求**: [DOC-01] 处理结果通过钉钉通知销售。

**开发任务**:
1.  **后端集成**: 在 `updateAppointment` 相关的后端逻辑中，检测到 `doctor_status` 变更时，触发通知发送给对应的销售人员。

## 执行顺序

1.  **修正急单逻辑** (快速修复)
2.  **实现钉钉扫码登录前端** (高可见度功能)
3.  **搭建通知服务框架** (核心集成功能)
