// Test login flow script
const API_BASE = 'http://localhost:3001/api';

async function testLogin() {
  console.log('🧪 Testing login flow...');

  try {
    // Step 1: Test login
    console.log('\n1. Testing login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);

    const { user, tokens } = loginData;

    // Step 2: Test get user profile
    console.log('\n2. Testing get user profile...');
    const profileResponse = await fetch(`${API_BASE}/profiles/${user.id}`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Origin': 'http://127.0.0.1:5173',
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`Get profile failed: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log('✅ Profile fetch successful:', profileData);

    // Step 3: Test token refresh
    console.log('\n3. Testing token refresh...');
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173',
      },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken
      })
    });

    if (!refreshResponse.ok) {
      throw new Error(`Token refresh failed: ${refreshResponse.status}`);
    }

    const refreshData = await refreshResponse.json();
    console.log('✅ Token refresh successful:', refreshData);

    console.log('\n🎉 All tests passed! The login flow is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testLogin();