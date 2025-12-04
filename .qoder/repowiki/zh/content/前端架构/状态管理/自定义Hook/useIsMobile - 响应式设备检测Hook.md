# useIsMobile - 响应式设备检测Hook

<cite>
**本文档引用的文件**   
- [use-mobile.ts](file://src/hooks/use-mobile.ts)
- [sidebar.tsx](file://src/components/ui/sidebar.tsx)
- [App.tsx](file://src/App.tsx)
- [tailwind.config.js](file://tailwind.config.js)
</cite>

## 目录
1. [简介](#简介)
2. [核心组件分析](#核心组件分析)
3. [断点设计依据](#断点设计依据)
4. [生命周期管理](#生命周期管理)
5. [实际应用示例](#实际应用示例)
6. [服务端渲染注意事项](#服务端渲染注意事项)
7. [调试与测试](#调试与测试)

## 简介
`useIsMobile` Hook 是一个用于检测移动设备的响应式工具，它利用 `window.matchMedia` API 监听CSS断点变化，实现对移动设备的精准识别。该Hook在项目中被广泛应用于响应式布局的控制，特别是在Sidebar组件和App主布局中。本文档将深入解析其工作原理、设计依据、生命周期管理机制以及在不同场景下的应用。

## 核心组件分析

`useIsMobile` Hook 的核心实现位于 `src/hooks/use-mobile.ts` 文件中，它通过 `window.matchMedia` API 监听媒体查询变化，判断当前设备是否为移动设备。

```mermaid
flowchart TD
Start([Hook入口]) --> DefineBreakpoint["定义MOBILE_BREAKPOINT常量 = 768"]
DefineBreakpoint --> CreateState["创建isMobile状态"]
CreateState --> CreateEffect["useEffect创建监听器"]
CreateEffect --> CreateMQL["创建MediaQueryList对象"]
CreateMQL --> CreateHandler["创建onChange事件处理器"]
CreateHandler --> AddListener["添加change事件监听器"]
AddListener --> SetInitial["设置初始isMobile值"]
SetInitial --> ReturnCleanup["返回清理函数"]
ReturnCleanup --> ReturnResult["返回!!isMobile布尔值"]
style Start fill:#f9f,stroke:#333,stroke-width:2px
style ReturnResult fill:#bbf,stroke:#333,stroke-width:2px
```

**Diagram sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L3-L19)

**Section sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L3-L19)

## 断点设计依据

`MOBILE_BREAKPOINT` 常量被设置为 768px，这一设计符合 Tailwind CSS 的 `sm` 断点标准。在 `tailwind.config.js` 配置文件中，虽然没有明确列出断点值，但768px是Tailwind CSS框架中标准的移动设备断点，用于区分移动设备和桌面设备。

```mermaid
erDiagram
BREAKPOINT ||--o{ CONFIG : "定义"
BREAKPOINT {
string name PK
number value UK
string framework
string description
}
CONFIG {
string filename PK
string path
string content
}
BREAKPOINT ||--o{ HOOK : "使用"
HOOK {
string name PK
string filename
string description
}
HOOK ||--o{ COMPONENT : "应用"
COMPONENT {
string name PK
string filename
string description
}
```

**Diagram sources**
- [tailwind.config.js](file://tailwind.config.js#L1-L184)
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L3)

**Section sources**
- [tailwind.config.js](file://tailwind.config.js#L1-L184)
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L3)

## 生命周期管理

`useIsMobile` Hook 使用 `useEffect` 来管理媒体查询监听器的生命周期。在组件挂载时，它创建一个 `MediaQueryList` 对象并添加 `change` 事件监听器；在组件卸载时，通过返回的清理函数移除监听器，防止内存泄漏。

```mermaid
sequenceDiagram
participant Component as "组件"
participant Hook as "useIsMobile Hook"
participant Window as "window"
Component->>Hook : 组件挂载
Hook->>Hook : 初始化isMobile状态
Hook->>Window : 创建mql = matchMedia("(max-width : 767px)")
Hook->>Hook : 创建onChange处理器
Hook->>Window : mql.addEventListener("change", onChange)
Hook->>Hook : 设置初始isMobile值
Hook->>Component : 返回isMobile值
Window->>Hook : 屏幕尺寸变化
Hook->>Hook : onChange被调用
Hook->>Hook : 更新isMobile状态
Component->>Hook : 组件卸载
Hook->>Window : mql.removeEventListener("change", onChange)
```

**Diagram sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L8-L16)

**Section sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L8-L16)

## 实际应用示例

### Sidebar组件中的应用

在 `src/components/ui/sidebar.tsx` 文件中，`useIsMobile` Hook 被用于控制Sidebar的显示模式。在移动设备上，Sidebar会以抽屉模式（Sheet）显示，而在桌面设备上则以侧边栏模式显示。

```mermaid
flowchart TD
A[使用useIsMobile] --> B{isMobile?}
B --> |是| C[显示抽屉模式]
B --> |否| D[显示侧边栏模式]
C --> E[使用Sheet组件]
D --> F[使用div容器]
style C fill:#f96,stroke:#333
style D fill:#69f,stroke:#333
```

**Diagram sources**
- [sidebar.tsx](file://src/components/ui/sidebar.tsx#L67-L204)

**Section sources**
- [sidebar.tsx](file://src/components/ui/sidebar.tsx#L67-L204)

### App组件中的布局调整

在 `src/App.tsx` 文件中，虽然没有直接使用 `useIsMobile`，但该Hook的返回值可以用于控制App的整体布局结构，例如在移动设备上隐藏Header或调整主内容区域的布局。

```mermaid
flowchart TD
Start([App入口]) --> CheckRoute["检查当前路由"]
CheckRoute --> HideHeader["判断是否隐藏Header"]
HideHeader --> UseIsMobile["使用useIsMobile"]
UseIsMobile --> MobileLayout["移动设备布局"]
UseIsMobile --> DesktopLayout["桌面设备布局"]
MobileLayout --> AdjustMain["调整主内容区域"]
DesktopLayout --> StandardMain["标准主内容区域"]
```

**Diagram sources**
- [App.tsx](file://src/App.tsx#L1-L62)

**Section sources**
- [App.tsx](file://src/App.tsx#L1-L62)

## 服务端渲染注意事项

在服务端渲染（SSR）环境下，`useIsMobile` Hook 可能会返回 `undefined`，因为服务端没有 `window` 对象和媒体查询功能。为应对这种情况，建议结合加载状态处理首屏渲染，确保用户体验的一致性。

```mermaid
flowchart TD
SSR[服务端渲染] --> CheckWindow["检查window对象"]
CheckWindow --> |存在| Client["客户端渲染"]
CheckWindow --> |不存在| Server["服务端渲染"]
Server --> ReturnUndefined["返回undefined"]
Client --> NormalFlow["正常流程"]
ReturnUndefined --> HandleUndefined["处理undefined情况"]
HandleUndefined --> ShowLoading["显示加载状态"]
ShowLoading --> WaitForClient["等待客户端接管"]
WaitForClient --> UpdateState["更新isMobile状态"]
```

**Diagram sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L6)
- [App.tsx](file://src/App.tsx#L8-L14)

**Section sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L6)
- [App.tsx](file://src/App.tsx#L8-L14)

## 调试与测试

### 调试不同屏幕尺寸

开发者可以通过浏览器的开发者工具模拟不同屏幕尺寸，测试 `useIsMobile` Hook 的响应行为。在Chrome开发者工具中，可以使用设备模拟器功能，选择不同的设备或自定义屏幕尺寸。

### 单元测试示例

以下是一个模拟媒体查询的单元测试示例，用于测试 `useIsMobile` Hook 在不同屏幕尺寸下的行为：

```mermaid
flowchart TD
TestSuite[测试套件] --> Test1["测试移动设备"]
TestSuite --> Test2["测试桌面设备"]
TestSuite --> Test3["测试边界情况"]
Test1 --> MockMobile["模拟max-width: 767px"]
MockMobile --> AssertTrue["断言返回true"]
Test2 --> MockDesktop["模拟min-width: 768px"]
MockDesktop --> AssertFalse["断言返回false"]
Test3 --> MockBoundary["模拟768px边界"]
MockBoundary --> AssertFalse2["断言返回false"]
```

**Diagram sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L9-L11)

**Section sources**
- [use-mobile.ts](file://src/hooks/use-mobile.ts#L9-L11)