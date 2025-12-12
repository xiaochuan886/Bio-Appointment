# 工作台UI自动化测试

本项目包含一个完整的Playwright浏览器自动化测试脚本，用于测试Bio-Appointment系统的工作台UI交互功能。

## 文件说明

### 核心文件
- **`test-dashboard-ui.cjs`** - 主要的Playwright测试脚本
- **`dashboard-ui-test-guide.md`** - 详细的测试指南和文档
- **`run-dashboard-ui-test.sh`** - Linux/macOS一键运行脚本
- **`run-dashboard-ui-test.bat`** - Windows一键运行脚本

### 输出文件
- **`dashboard-ui-test-results.json`** - 测试结果报告（测试后自动生成）
- **`test-screenshots/`** - 测试截图目录（测试后自动创建）

## 快速开始

### 前置条件

1. **确保服务器运行**
   ```bash
   # 终端1：启动API服务器
   npm run api
   
   # 终端2：启动前端服务器
   npm run dev
   ```

2. **安装依赖**
   ```bash
   npm install playwright
   npx playwright install
   ```

### 运行测试

#### 方式1：使用一键脚本（推荐）

**Linux/macOS:**
```bash
./run-dashboard-ui-test.sh
```

**Windows:**
```cmd
run-dashboard-ui-test.bat
```

#### 方式2：直接运行测试脚本
```bash
node test-dashboard-ui.cjs
```

## 测试内容

测试脚本包含以下8个主要测试用例：

1. **登录功能测试**
   - 验证登录页面元素
   - 测试登录流程
   - 检查跳转逻辑

2. **工作台页面加载测试**
   - 验证页面标题
   - 检查统计卡片
   - 确认资源看板显示

3. **资源筛选功能测试**
   - 测试房间、护士、医生筛选
   - 验证筛选交互

4. **日期切换功能测试**
   - 测试"今天"按钮
   - 验证日期导航
   - 测试日期选择器

5. **视图切换功能测试**
   - 测试日/周/月视图切换
   - 验证视图状态

6. **门店筛选功能测试**
   - 检查门店选择器
   - 验证门店选项

7. **统计数据验证测试**
   - 检查统计数据显示
   - 验证数据格式

8. **甘特图显示测试**
   - 验证甘特图加载
   - 检查图表元素

## 测试结果

测试完成后，您将获得：

### 控制台输出
- 实时测试状态
- 测试总结和成功率
- 失败测试的错误信息

### 详细报告
- `dashboard-ui-test-results.json` - 包含所有测试结果的JSON文件

### 测试截图
- `test-screenshots/` 目录下保存每个测试步骤的截图
- 截图命名格式：`测试名-步骤-时间戳.png`

## 配置说明

### 测试环境配置
```javascript
// 前端服务器地址
const BASE_URL = 'http://localhost:5173';

// 测试账号
username: 'admin'
password: 'admin123'
```

### 浏览器配置
```javascript
// 显示浏览器窗口（便于观察）
headless: false

// 操作速度（毫秒）
slowMo: 500

// 页面超时时间（毫秒）
page.setDefaultTimeout(10000)
```

## 故障排除

### 常见问题

1. **登录失败**
   - 检查API和前端服务器是否运行
   - 确认测试账号信息

2. **元素找不到**
   - 增加页面等待时间
   - 检查页面URL是否正确

3. **截图保存失败**
   - 确保有足够的磁盘空间
   - 检查目录权限

### 调试技巧

1. **修改为无头模式**
   ```javascript
   browser = await chromium.launch({ 
     headless: true, // 无头模式
     slowMo: 100 // 正常速度
   });
   ```

2. **增加等待时间**
   ```javascript
   await page.waitForTimeout(2000); // 增加2秒等待
   ```

3. **手动暂停测试**
   ```javascript
   await page.pause(); // 暂停测试，按Enter继续
   ```

## 扩展测试

要添加新的测试用例：

1. 在`test-dashboard-ui.cjs`中添加新的测试函数
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

1. 测试脚本会自动创建必要的目录
2. 每次运行会覆盖之前的测试结果文件
3. 测试过程中请勿操作浏览器窗口
4. 建议在测试环境运行，避免影响生产数据

## 相关文档

- [Playwright官方文档](https://playwright.dev/)
- [项目API文档](./API.md)
- [前端组件文档](./src/components/)

## 技术支持

如果遇到问题，请：

1. 查看控制台错误信息
2. 检查`dashboard-ui-test-results.json`文件
3. 查看测试截图了解失败原因
4. 参考`dashboard-ui-test-guide.md`详细文档

---

**版本**: 1.0.0  
**更新时间**: 2025-12-12  
**兼容性**: Node.js 16+, Playwright 1.57+