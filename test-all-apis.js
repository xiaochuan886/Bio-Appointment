// Comprehensive API test script
const API_BASE = 'http://localhost:3001/api';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n🧪 Testing ${description}...`);
    const response = await fetch(`${API_BASE}${endpoint}`);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${description} - Success`);
      console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      return true;
    } else {
      console.log(`❌ ${description} - Failed (${response.status})`);
      console.log(`   Error: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - Error`);
    console.log(`   ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running comprehensive API tests...\n');

  const tests = [
    ['/health', 'Health Check'],
    ['/services', 'Get Services'],
    ['/appointments', 'Get Appointments'],
    ['/profiles', 'Get Profiles'],
    ['/resources', 'Get Resources'],
    ['/schedules', 'Get Schedules'],
    ['/task-executions', 'Get Task Executions'],
    ['/dashboard/stats', 'Dashboard Stats'],
    ['/resources/availability?date=2025-11-30&time_start=09:00:00&time_end=10:00:00', 'Resource Availability']
  ];

  let passed = 0;
  let failed = 0;

  for (const [endpoint, description] of tests) {
    const success = await testAPI(endpoint, description);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test appointment creation
  console.log('\n🧪 Testing Appointment Creation...');
  try {
    const createResponse = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173',
      },
      body: JSON.stringify({
        customer_name: '测试客户',
        customer_phone: '13800138000',
        service_id: 'ca337488-dcf3-40ec-8b61-69b51f95cef7',
        requested_date: '2025-11-30',
        requested_time_start: '09:00:00',
        requested_time_end: '10:00:00',
        notes: 'API测试预约'
      })
    });

    if (createResponse.ok) {
      console.log('✅ Appointment Creation - Success');
      passed++;
    } else {
      console.log('❌ Appointment Creation - Failed');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Appointment Creation - Error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

runTests();