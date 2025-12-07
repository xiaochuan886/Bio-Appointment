const fs = require('fs');
const path = require('path');

// 问题修复脚本
const fixes = {
  apiServer: {
    file: 'server/api-server.cjs',
    issues: [],
    fixes: []
  },
  frontend: {
    file: 'src/pages/nurse/SchedulePage.tsx',
    issues: [],
    fixes: []
  }
};

// 分析API服务器问题
function analyzeApiServerIssues() {
  log('分析API服务器问题...', 'info');
  
  // 问题1: 缺少权限验证中间件
  fixes.apiServer.issues.push({
    type: 'security',
    description: '排班API端点缺少权限验证中间件',
    severity: 'high',
    line: 511 // schedules GET endpoint
  });
  
  fixes.apiServer.fixes.push({
    type: 'security',
    description: '添加权限验证中间件到排班API端点',
    code: `
// 在schedules GET端点添加权限验证
app.get('/api/schedules', async (req, res) => {
  try {
    // 添加权限验证
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const { date, start_date, end_date, nurse_id, store_id } = req.query;
    // ... 现有代码
  } catch (error) {
    // ... 错误处理
  }
});`
  });
  
  // 问题2: UUID验证错误处理不完善
  fixes.apiServer.issues.push({
    type: 'validation',
    description: 'nurse_id参数UUID验证错误处理不完善',
    severity: 'medium',
    line: 558
  });
  
  fixes.apiServer.fixes.push({
    type: 'validation',
    description: '改进UUID验证和错误处理',
    code: `
// 改进nurse_id参数验证
if (nurse_id) {
  // 验证UUID格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(nurse_id)) {
    return res.status(400).json({
      error: 'Invalid nurse_id format. Must be a valid UUID.'
    });
  }
  conditions.push(\`s.nurse_id = $${params.length + 1}\`);
  params.push(nurse_id);
}`
  });
  
  // 问题3: 日期格式验证不完善
  fixes.apiServer.issues.push({
    type: 'validation',
    description: '日期格式验证不完善，导致SQL错误',
    severity: 'medium',
    line: 543
  });
  
  fixes.apiServer.fixes.push({
    type: 'validation',
    description: '改进日期格式验证',
    code: `
// 改进日期格式验证
if (date) {
  // 验证日期格式
  const dateRegex = /^\\d{4}-\\d{2}-\\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      error: 'Invalid date format. Expected YYYY-MM-DD.'
    });
  }
  
  // 验证日期是否有效
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({
      error: 'Invalid date. Please provide a valid date.'
    });
  }
  
  conditions.push(\`DATE(s.scheduled_date) = $${params.length + 1}\`);
  params.push(date);
}`
  });
}

// 分析前端问题
function analyzeFrontendIssues() {
  log('分析前端问题...', 'info');
  
  // 问题1: 缺少测试ID属性
  fixes.frontend.issues.push({
    type: 'testing',
    description: '缺少用于测试的data-testid属性',
    severity: 'low'
  });
  
  fixes.frontend.fixes.push({
    type: 'testing',
    description: '添加测试所需的data-testid属性',
    code: `
// 在关键元素添加data-testid属性

// 视图模式选择器
<Select 
  value={viewMode} 
  onValueChange={(value: ViewMode) => setViewMode(value)}
  data-testid="view-mode-selector"
>

// 日期选择器
<Button
  variant="outline"
  size="sm"
  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
  data-testid="date-picker"
>

// 日期范围选择器
<Popover open={isDateRangePickerOpen} onOpenChange={setIsDateRangePickerOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm" data-testid="date-range-picker">

// 日历组件
<div className="absolute top-16 left-4 z-50 bg-background border rounded-lg shadow-lg p-2" data-testid="calendar">
  <CalendarComponent
    mode="single"
    selected={selectedDate}
    onSelect={handleDateChange}
    initialFocus
    data-testid="calendar-component"
  />

// 排班卡片容器
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="schedule-cards">

// 单个排班卡片
<Card key={schedule.id} className="cursor-pointer hover:shadow-md transition-shadow" 
      onClick={() => handleScheduleClick(schedule)}
      data-testid="schedule-card">

// 日视图容器
<div className="space-y-4" data-testid="day-view">

// 周视图容器
<div className="space-y-4" data-testid="week-view">

// 月视图容器
<div className="space-y-4" data-testid="month-view">

// 统计信息容器
<div className="grid gap-4 md:grid-cols-3 mb-6" data-testid="schedule-stats">

// 详情对话框
<Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen} data-testid="schedule-detail-dialog">

// 关闭对话框按钮
<Button variant="outline" onClick={() => setIsDetailDialogOpen(false)} data-testid="close-dialog">

// 当前日期显示
<span data-testid="current-date">{getViewTitle()}</span>

// 日期导航按钮
<Button variant="outline" size="sm" onClick={handlePrevious} data-testid="previous-day">
<Button variant="outline" size="sm" onClick={handleNext} data-testid="next-day">`
  });
  
  // 问题2: 错误处理可以改进
  fixes.frontend.issues.push({
    type: 'error-handling',
    description: 'API错误处理可以更加用户友好',
    severity: 'low'
  });
  
  fixes.frontend.fixes.push({
    type: 'error-handling',
    description: '改进错误处理和用户反馈',
    code: `
// 改进错误处理
const loadSchedules = async () => {
  if (!user) return;

  setIsLoading(true);
  try {
    const storeFilter = getAccessibleStoreIds(user?.profile || null);
    
    let params: any = {
      store_id: storeFilter || undefined
    };

    // ... 现有参数设置逻辑

    const schedulesData = await clientApi.getSchedules(params);
    
    // ... 现有数据处理逻辑
    
    setSchedules(validSchedules);
  } catch (error) {
    console.error('加载排班失败:', error);
    
    // 改进错误处理
    let errorMessage = '加载排班失败，请稍后重试';
    
    if (error.response?.status === 401) {
      errorMessage = '登录已过期，请重新登录';
    } else if (error.response?.status === 403) {
      errorMessage = '权限不足，无法访问排班信息';
    } else if (error.response?.status === 404) {
      errorMessage = '未找到排班信息';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setIsLoading(false);
  }
};`
  });
}

// 生成修复报告
function generateFixReport() {
  const report = `
# 护士排期查看功能问题修复报告

## 发现的问题

### API服务器问题
${fixes.apiServer.issues.map((issue, index) => 
  `#### ${index + 1}. ${issue.type.toUpperCase()} - ${issue.description}
- **严重程度**: ${issue.severity}
- **位置**: 第${issue.line}行
- **影响**: ${getIssueImpact(issue.type)}`
).join('\n')}

### 前端问题
${fixes.frontend.issues.map((issue, index) => 
  `#### ${index + 1}. ${issue.type.toUpperCase()} - ${issue.description}
- **严重程度**: ${issue.severity}
- **影响**: ${getIssueImpact(issue.type)}`
).join('\n')}

## 修复方案

### API服务器修复
${fixes.apiServer.fixes.map((fix, index) => 
  `#### 修复${index + 1}: ${fix.description}
\`\`\`javascript
${fix.code}
\`\`\``
).join('\n')}

### 前端修复
${fixes.frontend.fixes.map((fix, index) => 
  `#### 修复${index + 1}: ${fix.description}
\`\`\`typescript
${fix.code}
\`\`\``
).join('\n')}

## 优先级建议

### 高优先级
1. **修复权限验证中间件** - 安全性问题，需要立即修复
2. **改进UUID验证** - 防止服务器错误，提高稳定性

### 中优先级
3. **改进日期格式验证** - 提高用户体验，减少错误
4. **添加测试属性** - 便于自动化测试和调试

### 低优先级
5. **改进错误处理** - 提高用户体验

## 实施建议

### 立即实施
1. 在API服务器添加权限验证中间件
2. 改进UUID和日期格式验证

### 短期实施（1-2周）
1. 添加前端测试属性
2. 改进错误处理逻辑

### 长期实施（1个月）
1. 完善测试覆盖率
2. 添加监控和日志

## 验证方法

修复后，请运行以下测试进行验证：

1. **API测试**
   \`\`\`bash
   node test-nurse-schedule-comprehensive.cjs
   \`\`\`

2. **前端测试**
   \`\`\`bash
   node test-nurse-schedule-frontend.cjs
   \`\`\`

3. **手动测试**
   - 测试无token访问API
   - 测试无效UUID参数
   - 测试无效日期格式
   - 测试前端各种交互场景

## 风险评估

### 修复风险
- **权限验证**: 可能影响现有客户端，需要通知前端团队
- **UUID验证**: 如果现有数据格式不一致，可能导致兼容性问题
- **日期验证**: 如果现有API调用格式不规范，可能需要调整

### 缓解措施
- 分阶段部署，先在测试环境验证
- 提供向后兼容的过渡期
- 添加详细的日志记录

## 修复时间估算

- **权限验证**: 2-4小时
- **UUID验证**: 1-2小时
- **日期验证**: 1-2小时
- **测试属性**: 2-3小时
- **错误处理**: 3-4小时

**总计**: 9-15小时

## 修复后预期效果

1. **安全性提升**: 防止未授权访问
2. **稳定性改善**: 减少服务器错误
3. **用户体验优化**: 更友好的错误提示
4. **可测试性提升**: 便于自动化测试

---

*报告生成时间: ${new Date().toISOString()}*
`;

  return report;
}

function getIssueImpact(type) {
  const impacts = {
    security: '可能导致未授权访问数据',
    validation: '可能导致服务器错误或数据不一致',
    testing: '影响自动化测试和调试',
    'error-handling': '影响用户体验和问题排查'
  };
  
  return impacts[type] || '影响系统功能和用户体验';
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// 主函数
async function runAnalysis() {
  log('开始分析护士排期查看功能问题...', 'info');
  
  try {
    // 分析API服务器问题
    analyzeApiServerIssues();
    
    // 分析前端问题
    analyzeFrontendIssues();
    
    // 生成修复报告
    const report = generateFixReport();
    
    // 保存报告
    fs.writeFileSync('nurse-schedule-fix-report.md', report);
    
    log('问题分析完成！', 'success');
    log(`发现API问题: ${fixes.apiServer.issues.length}个`, 'info');
    log(`发现前端问题: ${fixes.frontend.issues.length}个`, 'info');
    log(`修复报告已保存到: nurse-schedule-fix-report.md`, 'info');
    
  } catch (error) {
    log(`分析过程中发生错误: ${error.message}`, 'error');
    console.error(error);
  }
}

// 运行分析
if (require.main === module) {
  runAnalysis();
}

module.exports = {
  runAnalysis,
  fixes,
  generateFixReport
};