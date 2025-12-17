import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

// Database connection
const pool = new Pool({
    host: '127.0.0.1',
    port: 5437,
    database: 'bio_appointment',
    user: 'app_user',
    password: 'secure_password_123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = '123456';

async function hashAllPasswords() {
    console.log('🔐 开始密码哈希处理...\n');

    try {
        // 获取所有用户
        const result = await pool.query(
            'SELECT id, username, password_hash FROM profiles ORDER BY username'
        );

        console.log(`📊 找到 ${result.rows.length} 个用户账号\n`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // 生成默认密码的 bcrypt 哈希
        console.log(`🔑 生成默认密码 "${DEFAULT_PASSWORD}" 的 bcrypt 哈希...`);
        const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
        console.log(`✅ 哈希生成成功: ${defaultPasswordHash.substring(0, 20)}...\n`);

        for (const user of result.rows) {
            const { id, username, password_hash } = user;

            try {
                // 强制更新所有账号为统一的 bcrypt 哈希
                await pool.query(
                    'UPDATE profiles SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [defaultPasswordHash, id]
                );

                const oldHashPreview = password_hash
                    ? (password_hash.length > 20 ? password_hash.substring(0, 20) + '...' : password_hash)
                    : '(null)';

                console.log(`✅ ${username.padEnd(20)} - 已更新 (原: ${oldHashPreview})`);
                updatedCount++;
            } catch (error) {
                console.error(`❌ ${username.padEnd(20)} - 更新失败: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 处理完成统计:');
        console.log(`   ✅ 已更新: ${updatedCount} 个账号`);
        console.log(`   ⏭️  已跳过: ${skippedCount} 个账号 (已是 bcrypt 哈希)`); // This will always be 0
        console.log(`   ❌ 失败:   ${errorCount} 个账号`);
        console.log('='.repeat(60));

        if (updatedCount > 0) {
            console.log(`\n🔑 所有更新的账号密码已重置为: ${DEFAULT_PASSWORD}`);
            console.log(`🔐 使用 bcrypt 哈希算法，salt rounds: ${SALT_ROUNDS}`);
        }

    } catch (error) {
        console.error('❌ 处理过程中发生错误:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('\n✅ 数据库连接已关闭');
    }
}

// 运行脚本
hashAllPasswords()
    .then(() => {
        console.log('\n🎉 密码哈希处理完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 脚本执行失败:', error);
        process.exit(1);
    });
