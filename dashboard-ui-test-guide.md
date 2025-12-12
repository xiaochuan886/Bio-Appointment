# 工作台UI自动化测试指南

## 概述

`test-dashboard-ui.cjs` 是一个使用Playwright框架创建的浏览器自动化测试脚本，用于测试Bio-Appointment系统的工作台UI交互功能。

## 测试功能

该测试脚本包含以下测试用例：

1. **登录功能测试**
   - 验证登录页面元素是否正确显示
   - 测试使用测试账号登录功能
   - 验证登录后是否正确跳转到工作台

2. **工作台页面加载测试**
   - 检查页面标题是否正确显示
   - 验证统计卡片是否正常加载
   - 确认资源看板组件是否显示

3. **资源筛选功能测试**
   - 验证房间、护士、医生资源的筛选复选框
   - 测试筛选交互功能
   - 验证筛选状态切换

4. **日期切换功能测试**
   - 测试"今天"按钮功能
   - 验证上一/下一时间段导航按钮
   - 测试日期选择器的打开和关闭

5. **视图切换功能测试**
   - 验证日视图、周视图、月视图按钮
   - 测试不同视图之间的切换
   - 验证视图状态显示

6. **门店筛选功能测试**
   - 检查门店选择器是否显示
   - 验证门店选项是否加载
   - 测试门店选择器交互

7. **统计数据验证测试**
   - 检查统计卡片的数据显示
   - 验证资源统计数据
   - 确认数据格式正确性

8. **甘特图显示测试**
   - 验证甘特图标题显示
   - 检查甘特图容器是否加载
   - 测试加载状态处理

## 前置条件

在运行测试之前，请确保：

1. **API服务器运行中**
   ```bash
   npm run api
   ```

2. **前端开发服务器运行中**
   ```bash
   npm run dev
   ```

3. **Playwright已安装**
   ```bash
   npm install playwright
   ```

4. **Playwright浏览器已安装**
   ```bash
   npx playwright install
   ```

## 运行测试

### 基本运行

```bash
node test-dashboard-ui.cjs
```

### 无头模式运行

如果要修改为无头模式（不显示浏览器窗口），可以编辑脚本中的以下行：

```javascript
// 将这行
browser = await chromium.launch({ 
  headless: false, // 显示浏览器窗口以便观察
  slowMo: 500 // 减慢操作速度以便观察
});

// 修改为
browser = await chromium.launch({ 
  headless: true, // 无头模式
  slowMo: 100 // 正常速度
});
```

## 测试结果

测试完成后，脚本会生成以下输出：

1. **控制台输出**
   - 实时显示每个测试的执行状态
   - 显示测试总结和成功率
   - 列出失败的测试和错误信息

2. **测试结果文件**
   - 文件名：`dashboard-ui-test-results.json`
   - 包含详细的测试结果和错误信息
   - 记录测试时间戳和截图路径

3. **测试截图**
   - 保存在 `test-screenshots/` 目录下
   - 每个测试步骤都会生成截图
   - 截图命名格式：`测试名-步骤-时间戳.png`

## 测试配置

脚本中的主要配置项：

```javascript
// 前端服务器地址
const BASE_URL = 'http://localhost:5173';

// 测试结果文件
const TEST_RESULTS_FILE = 'dashboard-ui-test-results.json';

// 页面超时时间（毫秒）
page.setDefaultTimeout(10000);

// 测试账号信息
await emailInput.fill('admin');
await passwordInput.fill('admin123');
```

## 故障排除

### 常见问题

1. **登录失败**
   - 检查API服务器是否正常运行
   - 确认测试账号信息是否正确
   - 检查前端服务器是否在正确端口运行

2. **元素找不到**
   - 增加页面等待时间
   - 检查页面URL是否正确
   - 确认页面元素选择器是否准确

3. **截图保存失败**
   - 确保有足够的磁盘空间
   - 检查目录权限
   - 确认目录路径存在

### 调试技巧

1. **增加等待时间**
   ```javascript
   await page.waitForTimeout(2000); // 增加2秒等待
   ```

2. **查看页面内容**
   ```javascript
   console.log(await page.content());
   ```

3. **手动暂停测试**
   ```javascript
   await page.pause(); // 暂停测试，按Enter继续
   ```

## 扩展测试

要添加新的测试用例，可以：

1. 在脚本中添加新的测试函数
2. 在主测试函数中调用新测试
3. 使用现有的辅助函数记录结果和截图

示例：

```javascript
async function testNewFeature(page) {
  try {
    // 测试逻辑
    recordTest('新功能测试', true, '测试通过');
    return true;
  } catch (error) {
    recordTest('新功能测试', false, '测试失败', error);
    return false;
  }
}
```

## 注意事项

1. 测试脚本会自动创建截图目录
2. 每次运行会覆盖之前的测试结果文件
3. 测试过程中请勿操作浏览器窗口
4. 建议在测试环境运行，避免影响生产数据

## 相关文件

- `test-dashboard-functionality.cjs` - API功能测试脚本
- `src/pages/DashboardPage.tsx` - 工作台页面组件
- `src/components/dashboard/ResourceBoard.tsx` - 资源看板组件
- `src/pages/auth/LoginPage.tsx` - 登录页面组件