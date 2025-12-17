"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const connection_1 = require("@/db/connection");
// JWT Configuration
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || import.meta.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = import.meta.env.VITE_JWT_EXPIRES_IN || import.meta.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = import.meta.env.VITE_JWT_REFRESH_EXPIRES_IN || import.meta.env.JWT_REFRESH_EXPIRES_IN || '7d';
/**
 * Authentication service for handling user authentication
 */
class AuthService {
    /**
     * Hash a password using bcrypt
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt_1.default.hash(password, saltRounds);
    }
    /**
     * Compare a password with its hash
     */
    static async comparePassword(password, hash) {
        return await bcrypt_1.default.compare(password, hash);
    }
    /**
     * Generate JWT access token
     */
    static generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email || '',
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'bio-appointment',
            audience: 'bio-appointment-users',
        });
    }
    /**
     * Generate JWT refresh token
     */
    static generateRefreshToken(user) {
        const payload = {
            userId: user.id,
            email: user.email || '',
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
            issuer: 'bio-appointment',
            audience: 'bio-appointment-users',
        });
    }
    /**
     * Verify JWT token
     */
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
                issuer: 'bio-appointment',
                audience: 'bio-appointment-users',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Token expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    /**
     * Generate both access and refresh tokens
     */
    static generateTokens(user) {
        return {
            accessToken: this.generateAccessToken(user),
            refreshToken: this.generateRefreshToken(user),
        };
    }
    /**
     * Register a new user
     */
    static async register(credentials) {
        const { username, password, full_name } = credentials;
        // Check if user already exists
        const existingUser = await connection_1.DatabaseHelper.findMany('profiles', { username });
        if (existingUser.length > 0) {
            throw new Error('Username already exists');
        }
        // Hash the password
        const passwordHash = await this.hashPassword(password);
        // Create the user
        const newUser = await connection_1.DatabaseHelper.create('profiles', {
            username,
            email: credentials.email,
            full_name,
            password_hash: passwordHash,
            role: 'sales', // Default role
            status: 'active',
        });
        // Remove password hash from returned user
        const { password_hash, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }
    /**
     * Authenticate user with credentials
     * Supports login with either username or email
     */
    static async login(credentials) {
        const { username, password } = credentials;
        // Find user by username OR email
        const result = await (0, connection_1.query)('SELECT * FROM profiles WHERE username = $1 OR email = $1 LIMIT 1', [username]);
        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }
        const user = result.rows[0];
        // Check if user is active
        if (user.status !== 'active') {
            throw new Error('Account is disabled');
        }
        // Verify password
        const isPasswordValid = await this.comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        // Generate tokens
        const tokens = this.generateTokens(user);
        // Remove password hash from returned user
        const { password_hash, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            tokens,
        };
    }
    /**
     * Refresh access token using refresh token
     */
    static async refreshToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken);
            // Get user from database
            const user = await connection_1.DatabaseHelper.findById('profiles', decoded.userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Check if user is still active
            if (user.status !== 'active') {
                throw new Error('Account is disabled');
            }
            // Generate new tokens
            return this.generateTokens(user);
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    /**
     * Get user by ID (without password hash)
     */
    static async getUserById(userId) {
        const user = await connection_1.DatabaseHelper.findById('profiles', userId);
        if (!user) {
            return null;
        }
        // Remove password hash from returned user
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Update user profile
     */
    static async updateProfile(userId, updates) {
        // Don't allow updating sensitive fields directly
        const { id, password_hash, created_at, updated_at, ...allowedUpdates } = updates;
        const updatedUser = await connection_1.DatabaseHelper.update('profiles', userId, allowedUpdates);
        if (!updatedUser) {
            return null;
        }
        // Remove password hash from returned user
        const { password_hash: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    /**
     * Change user password
     */
    static async changePassword(userId, currentPassword, newPassword) {
        // Get user with password hash
        const user = await connection_1.DatabaseHelper.findById('profiles', userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Verify current password
        const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        // Hash new password
        const newPasswordHash = await this.hashPassword(newPassword);
        // Update password
        await connection_1.DatabaseHelper.update('profiles', userId, {
            password_hash: newPasswordHash,
            updated_at: new Date(),
        });
    }
    /**
     * Reset password (admin function)
     */
    static async resetPassword(userId, newPassword) {
        const newPasswordHash = await this.hashPassword(newPassword);
        await connection_1.DatabaseHelper.update('profiles', userId, {
            password_hash: newPasswordHash,
            updated_at: new Date(),
        });
    }
    /**
     * Deactivate user account
     */
    static async deactivateUser(userId) {
        await connection_1.DatabaseHelper.update('profiles', userId, {
            status: 'disabled',
            updated_at: new Date(),
        });
    }
    /**
     * Activate user account
     */
    static async activateUser(userId) {
        await connection_1.DatabaseHelper.update('profiles', userId, {
            status: 'active',
            updated_at: new Date(),
        });
    }
    /**
     * Get user permissions based on role
     */
    static getUserPermissions(role) {
        const rolePermissions = {
            super_admin: [
                'user:create', 'user:read', 'user:update', 'user:delete',
                'appointment:create', 'appointment:read', 'appointment:update', 'appointment:delete',
                'schedule:create', 'schedule:read', 'schedule:update', 'schedule:delete',
                'system:config', 'system:backup', 'system:restore'
            ],
            sales: [
                'appointment:create', 'appointment:read', 'appointment:update',
            ],
            head_nurse: [
                'appointment:read', 'appointment:update',
                'schedule:create', 'schedule:read', 'schedule:update',
                'task:create', 'task:read', 'task:update',
            ],
            nurse: [
                'task:read', 'task:update',
            ],
            doctor: [
                'appointment:read', 'appointment:update',
            ],
        };
        return rolePermissions[role] || [];
    }
    /**
     * Check if user has specific permission
     */
    static hasPermission(userRole, permission) {
        const permissions = this.getUserPermissions(userRole);
        return permissions.includes(permission);
    }
}
exports.AuthService = AuthService;
// Export default instance for backward compatibility
exports.default = AuthService;
