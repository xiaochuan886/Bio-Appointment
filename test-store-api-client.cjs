// 测试门店管理API客户端功能
const fs = require('fs');
const path = require('path');

// 读取API客户端文件内容
const apiClientPath = path.join(__dirname, 'src/services/api-client.ts');
const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');

console.log('开始测试门店管理API客户端功能...\n');

// 测试1: 检查门店相关的TypeScript类型定义
console.log('1. 检查门店相关的TypeScript类型定义');

const storeTypes = [
  'interface Store',
  'interface StoreCreateRequest',
  'interface StoreUpdateRequest',
  'interface StoreFilters',
  'interface StoreResource',
  'interface StoreStaff'
];

let allTypesFound = true;
storeTypes.forEach(type => {
  if (apiClientContent.includes(type)) {
    console.log(`✅ 找到 ${type}`);
  } else {
    console.log(`❌ 缺少 ${type}`);
    allTypesFound = false;
  }
});

if (allTypesFound) {
  console.log('✅ 所有门店相关的TypeScript类型定义都已添加');
} else {
  console.log('❌ 部分门店相关的TypeScript类型定义缺失');
}

// 测试2: 检查门店管理相关的API方法
console.log('\n2. 检查门店管理相关的API方法');

const storeMethods = [
  'async getStores',
  'async getStore',
  'async createStore',
  'async updateStore',
  'async deleteStore',
  'async getStoreResources',
  'async getStoreStaff'
];

let allMethodsFound = true;
storeMethods.forEach(method => {
  if (apiClientContent.includes(method)) {
    console.log(`✅ 找到 ${method}`);
  } else {
    console.log(`❌ 缺少 ${method}`);
    allMethodsFound = false;
  }
});

if (allMethodsFound) {
  console.log('✅ 所有门店管理相关的API方法都已添加');
} else {
  console.log('❌ 部分门店管理相关的API方法缺失');
}

// 测试3: 检查现有API方法的门店过滤支持
console.log('\n3. 检查现有API方法的门店过滤支持');

const filterMethods = [
  'getResources',
  'getSchedules',
  'getProfiles',
  'getAvailableNurses',
  'getAvailableRooms'
];

let allFiltersFound = true;
filterMethods.forEach(method => {
  const methodPattern = new RegExp(`async ${method}\\([^)]*\\)`, 'g');
  const methodMatch = apiClientContent.match(methodPattern);
  
  if (methodMatch && methodMatch[0].includes('store_id')) {
    console.log(`✅ ${method} 支持门店过滤`);
  } else {
    console.log(`❌ ${method} 不支持门店过滤`);
    allFiltersFound = false;
  }
});

if (allFiltersFound) {
  console.log('✅ 所有相关API方法都支持门店过滤');
} else {
  console.log('❌ 部分API方法不支持门店过滤');
}

// 测试4: 检查类型定义中的store_id字段
console.log('\n4. 检查类型定义中的store_id字段');

const typesWithStoreId = [
  'interface Appointment',
  'interface Resource',
  'interface Profile',
  'interface CreateAppointmentInput'
];

let allStoreIdsFound = true;
typesWithStoreId.forEach(type => {
  const typePattern = new RegExp(`${type} {[\\s\\S]*?}`, 'g');
  const typeMatch = apiClientContent.match(typePattern);
  
  if (typeMatch && typeMatch[0].includes('store_id?: string')) {
    console.log(`✅ ${type} 包含 store_id 字段`);
  } else {
    console.log(`❌ ${type} 缺少 store_id 字段`);
    allStoreIdsFound = false;
  }
});

if (allStoreIdsFound) {
  console.log('✅ 所有相关类型定义都包含 store_id 字段');
} else {
  console.log('❌ 部分类型定义缺少 store_id 字段');
}

// 测试5: 检查API端点路径
console.log('\n5. 检查API端点路径');

const apiEndpoints = [
  '/stores',
  '/stores/${id}',
  '/stores/${id}/resources',
  '/stores/${id}/staff'
];

let allEndpointsFound = true;
apiEndpoints.forEach(endpoint => {
  if (apiClientContent.includes(endpoint)) {
    console.log(`✅ 找到API端点 ${endpoint}`);
  } else {
    console.log(`❌ 缺少API端点 ${endpoint}`);
    allEndpointsFound = false;
  }
});

if (allEndpointsFound) {
  console.log('✅ 所有门店管理API端点都已定义');
} else {
  console.log('❌ 部分门店管理API端点缺失');
}

// 测试6: 检查认证调用
console.log('\n6. 检查认证调用');

const authCalls = [
  'authenticatedApiCall(`/stores',
  'authenticatedApiCall(`/stores/${id}',
  'authenticatedApiCall(`/stores/${id}/resources',
  'authenticatedApiCall(`/stores/${id}/staff'
];

let allAuthCallsFound = true;
authCalls.forEach(call => {
  if (apiClientContent.includes(call)) {
    console.log(`✅ 找到认证调用 ${call}`);
  } else {
    console.log(`❌ 缺少认证调用 ${call}`);
    allAuthCallsFound = false;
  }
});

if (allAuthCallsFound) {
  console.log('✅ 所有门店管理API都使用认证调用');
} else {
  console.log('❌ 部分门店管理API未使用认证调用');
}

// 总结
console.log('\n📊 测试总结');
console.log('================');

const totalTests = 6;
let passedTests = 0;

if (allTypesFound) passedTests++;
if (allMethodsFound) passedTests++;
if (allFiltersFound) passedTests++;
if (allStoreIdsFound) passedTests++;
if (allEndpointsFound) passedTests++;
if (allAuthCallsFound) passedTests++;

console.log(`通过测试: ${passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过! 门店管理API客户端功能已正确实现。');
} else {
  console.log('⚠️ 部分测试未通过，请检查实现。');
}

console.log('\n✅ 门店管理API客户端功能测试完成');