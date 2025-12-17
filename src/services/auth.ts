import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query, DatabaseHelper } from '@/db/connection';
import type { Profile, LoginCredentials, RegisterCredentials } from '@/types/types';

// JWT Configuration
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || import.meta.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = import.meta.env.VITE_JWT_EXPIRES_IN || import.meta.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = import.meta.env.VITE_JWT_REFRESH_EXPIRES_IN || import.meta.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication service for handling user authentication
 */
export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(user: Profile): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'bio-appointment',
      audience: 'bio-appointment-users',
    });
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(user: Profile): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'bio-appointment',
      audience: 'bio-appointment-users',
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'bio-appointment',
        audience: 'bio-appointment-users',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokens(user: Profile): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Register a new user
   */
  static async register(credentials: RegisterCredentials): Promise<Profile> {
    const { username, password, full_name } = credentials;

    // Check if user already exists
    const existingUser = await DatabaseHelper.findMany('profiles', { username });
    if (existingUser.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash the password
    const passwordHash = await this.hashPassword(password);

    // Create the user
    const newUser = await DatabaseHelper.create('profiles', {
      username,
      email: credentials.email,
      full_name,
      password_hash: passwordHash,
      role: 'sales', // Default role
      status: 'active',
    });

    // Remove password hash from returned user
    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword as Profile;
  }

  /**
   * Authenticate user with credentials
   * Supports login with either username or email
   */
  static async login(credentials: LoginCredentials): Promise<{ user: Profile; tokens: AuthTokens }> {
    const { username, password } = credentials;

    // Find user by username OR email
    const result = await query(
      `SELECT * FROM profiles WHERE username = $1 OR email = $1 LIMIT 1`,
      [username]
    );

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
      user: userWithoutPassword as Profile,
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this.verifyToken(refreshToken);

      // Get user from database
      const user = await DatabaseHelper.findById('profiles', decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is still active
      if (user.status !== 'active') {
        throw new Error('Account is disabled');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user by ID (without password hash)
   */
  static async getUserById(userId: string): Promise<Profile | null> {
    const user = await DatabaseHelper.findById('profiles', userId);
    if (!user) {
      return null;
    }

    // Remove password hash from returned user
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as Profile;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile | null> {
    // Don't allow updating sensitive fields directly
    const { id, password_hash, created_at, updated_at, ...allowedUpdates } = updates as any;

    const updatedUser = await DatabaseHelper.update('profiles', userId, allowedUpdates);
    if (!updatedUser) {
      return null;
    }

    // Remove password hash from returned user
    const { password_hash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as Profile;
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user with password hash
    const user = await DatabaseHelper.findById('profiles', userId);
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
    await DatabaseHelper.update('profiles', userId, {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    });
  }

  /**
   * Reset password (admin function)
   */
  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    const newPasswordHash = await this.hashPassword(newPassword);
    await DatabaseHelper.update('profiles', userId, {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    });
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(userId: string): Promise<void> {
    await DatabaseHelper.update('profiles', userId, {
      status: 'disabled',
      updated_at: new Date(),
    });
  }

  /**
   * Activate user account
   */
  static async activateUser(userId: string): Promise<void> {
    await DatabaseHelper.update('profiles', userId, {
      status: 'active',
      updated_at: new Date(),
    });
  }

  /**
   * Get user permissions based on role
   */
  static getUserPermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
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
  static hasPermission(userRole: string, permission: string): boolean {
    const permissions = this.getUserPermissions(userRole);
    return permissions.includes(permission);
  }
}

// Export default instance for backward compatibility
export default AuthService;