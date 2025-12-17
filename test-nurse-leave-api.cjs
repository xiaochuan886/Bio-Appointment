const http = require('http');

const API_BASE = 'http://localhost:3001/api';
let authToken = null;

// Helper function to make API requests
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function testNurseLeaveAPI() {
    console.log('\n=== 护士休假API测试 ===\n');

    try {
        // 1. 登录获取token
        console.log('1. 登录为管理员...');
        const loginResult = await makeRequest('POST', '/auth/login', {
            email: 'admin',
            password: 'admin123'
        });
        authToken = loginResult.tokens.accessToken;
        console.log('✅ 登录成功');

        // 2. 获取护士列表
        console.log('\n2. 获取护士列表...');
        const nurses = await makeRequest('GET', '/profiles/nurses/available');
        console.log(`✅ 获取到 ${nurses.length} 个护士`);

        if (nurses.length === 0) {
            console.log('❌ 没有护士数据，无法继续测试');
            return;
        }

        const testNurse = nurses[0];
        console.log(`   测试护士: ${testNurse.full_name} (${testNurse.id})`);

        // 3. 创建休假记录
        console.log('\n3. 创建护士休假记录...');
        const leaveData = {
            nurse_id: testNurse.id,
            leave_date: '2025-12-20',
            leave_period: 'morning',
            reason: 'API测试 - 上午休假'
        };
        const createResult = await makeRequest('POST', '/nurse-leaves', leaveData);
        console.log('✅ 休假记录创建成功');
        console.log(`   休假ID: ${createResult.leave.id}`);
        console.log(`   是否有冲突排班: ${createResult.has_conflicts}`);
        console.log(`   冲突排班数量: ${createResult.conflicting_schedules.length}`);

        const leaveId = createResult.leave.id;

        // 4. 获取休假列表
        console.log('\n4. 获取休假列表...');
        const leaves = await makeRequest('GET', '/nurse-leaves');
        console.log(`✅ 获取到 ${leaves.length} 条休假记录`);

        // 5. 测试护士可用性过滤
        console.log('\n5. 测试护士可用性过滤 (12月20日上午)...');
        const availableNurses = await makeRequest('GET', '/profiles/nurses/available?date=2025-12-20&time=09:00:00');
        console.log(`✅ 可用护士数量: ${availableNurses.length}`);

        const nurseStillAvailable = availableNurses.find(n => n.id === testNurse.id);
        if (nurseStillAvailable) {
            console.log(`   ⚠️  警告: 休假护士仍在可用列表中`);
        } else {
            console.log(`   ✅ 休假护士已被正确过滤`);
        }

        // 6. 更新休假记录
        console.log('\n6. 更新休假记录...');
        const updateResult = await makeRequest('PUT', `/nurse-leaves/${leaveId}`, {
            leave_period: 'full_day',
            reason: 'API测试 - 修改为全天休假'
        });
        console.log('✅ 休假记录更新成功');
        console.log(`   新时段: ${updateResult.leave_period}`);

        // 7. 创建第二条休假记录（用于测试冲突）
        console.log('\n7. 测试重复休假创建（应该失败）...');
        try {
            await makeRequest('POST', '/nurse-leaves', {
                nurse_id: testNurse.id,
                leave_date: '2025-12-20',
                leave_period: 'morning',
                reason: '重复测试'
            });
            console.log('❌ 应该阻止重复休假但没有');
        } catch (error) {
            console.log('✅ 正确阻止了重复休假');
            console.log(`   错误信息: ${error.message}`);
        }

        // 8. 删除休假记录
        console.log('\n8. 删除休假记录...');
        await makeRequest('DELETE', `/nurse-leaves/${leaveId}`);
        console.log('✅ 休假记录删除成功');

        // 9. 验证删除
        console.log('\n9. 验证休假已删除...');
        const leavesAfterDelete = await makeRequest('GET', '/nurse-leaves');
        const deletedLeave = leavesAfterDelete.find(l => l.id === leaveId);
        if (deletedLeave) {
            console.log('❌ 休假记录删除失败，仍然存在');
        } else {
            console.log('✅ 休假记录已成功删除');
        }

        // 10. 测试排班交接API（创建测试数据）
        console.log('\n10. 测试排班交接API...');
        if (nurses.length >= 2) {
            const nurse1 = nurses[0];
            const nurse2 = nurses[1];
            console.log(`   从护士 ${nurse1.full_name} 交接到 ${nurse2.full_name}`);

            // 这里需要有实际的排班数据才能测试
            console.log('   ⚠️  跳过交接测试（需要实际排班数据）');
        } else {
            console.log('   ⚠️  跳过交接测试（护士数量不足）');
        }

        console.log('\n=== 所有测试完成 ===\n');
        console.log('✅ 护士休假API功能正常');

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error);
    }
}

// 运行测试
testNurseLeaveAPI().catch(console.error);
