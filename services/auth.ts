import { storage } from './storage';
import { logError, logInfo, logWarn } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLogin: string;
  preferences?: UserPreferences;
  role?: 'user' | 'admin';
  verified?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';
  calorieGoal?: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
  waterGoal?: number;
  notificationsEnabled?: boolean;
  privacySettings?: {
    shareActivity: boolean;
    shareProgress: boolean;
    allowDataAnalytics: boolean;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthToken {
  token: string;
  expiresAt: number; // Timestamp in milliseconds
}

class AuthService {
  private currentUser: User | null = null;
  private currentToken: AuthToken | null = null;
  private authListeners: Array<(state: AuthState) => void> = [];
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  };
  private sessionCheckInterval: number | null = null;
  private readonly TOKEN_EXPIRY_DAYS = 7; // Token expires after 7 days
  private readonly SESSION_STORAGE_KEY = 'auth_session';
  private readonly TOKEN_REFRESH_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Check for existing session only on client-side
      if (typeof window === 'undefined' || !window.localStorage) {
        this.updateAuthState({ isLoading: false });
        return;
      }
      
      const storedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
      
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        
        if (sessionData && typeof sessionData === 'object' && 'user' in sessionData && 'token' in sessionData) {
          // Validate token
          const isValid = this.validateToken(sessionData.token);
          
          if (isValid) {
            this.currentUser = sessionData.user;
            this.currentToken = {
              token: sessionData.token,
              expiresAt: sessionData.expiresAt
            };
            
            this.updateAuthState({
              user: sessionData.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            logInfo(`User ${sessionData.user.email} session restored`);
            
            // Update last login time
            this.updateLastLogin(sessionData.user.id);
            
            // Start session check interval
            this.startSessionCheck();
            
            return;
          } else {
            // Token is invalid or expired, clear session
            logInfo('Session token expired or invalid, clearing session');
            localStorage.removeItem(this.SESSION_STORAGE_KEY);
          }
        }
      }
      
      // No valid session found
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize auth';
      logError('Auth initialization error:', err);
      
      // Clear potentially corrupted session data
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
      
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      });
    }
  }

  private validateToken(token: string): boolean {
    try {
      // In a real app, this would verify with the backend
      // For now, just check if token exists and hasn't expired
      // WARNING: This is insecure and for demo purposes only.
      if (typeof token !== 'string' || !token.includes('.') || typeof window === 'undefined' || !window.atob) {
        return false;
      }
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      return tokenData && typeof tokenData === 'object' && 'exp' in tokenData && tokenData.exp > Date.now() / 1000;
    } catch (err) {
      logError('Token validation error:', err);
      return false;
    }
  }

  private updateAuthState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.authListeners.forEach(listener => {
      try {
        listener(this.authState);
      } catch (err) {
        logError('Error in auth listener:', err);
      }
    });
  }

  private async updateLastLogin(userId: string) {
    try {
      if (this.currentUser) {
        const updatedUser = {
          ...this.currentUser,
          lastLogin: new Date().toISOString()
        };
        
        this.currentUser = updatedUser;
        
        // Update session in localStorage
        if (this.currentToken) {
          localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify({
            token: this.currentToken.token,
            expiresAt: this.currentToken.expiresAt,
            user: updatedUser
          }));
        }
        
        // Update user in storage
        await storage.setItem(`user_${userId}`, updatedUser, 'users');
        
        this.updateAuthState({ user: updatedUser });
      }
    } catch (err) {
      logError('Failed to update last login:', err);
    }
  }

  private startSessionCheck() {
    // Clear any existing interval
    if (this.sessionCheckInterval !== null) {
      window.clearInterval(this.sessionCheckInterval);
    }
    
    // Check session validity every minute
    this.sessionCheckInterval = window.setInterval(() => {
      this.checkSession();
    }, 60 * 1000);
  }

  private checkSession() {
    try {
      // If no token, clear session
      if (!this.currentToken) {
        this.logout();
        return;
      }
      
      const now = Date.now();
      
      // If token is expired, logout
      if (now >= this.currentToken.expiresAt) {
        logInfo('Session expired, logging out');
        this.logout();
        return;
      }
      
      // If token is close to expiry, refresh it
      if (this.currentToken.expiresAt - now < this.TOKEN_REFRESH_THRESHOLD) {
        this.refreshToken();
      }
    } catch (err) {
      logError('Session check error:', err);
    }
  }

  private async refreshToken() {
    try {
      if (!this.currentUser || !this.currentToken) {
        return;
      }
      
      // In a real app, this would call an API to refresh the token
      // For demo, we'll just generate a new token.
      // WARNING: This is insecure and should be replaced with a backend call.
      const newToken = this.generateToken(this.currentUser.id);
      const expiresAt = Date.now() + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      this.currentToken = {
        token: newToken,
        expiresAt
      };
      
      // Update session in localStorage
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify({
        token: newToken,
        expiresAt,
        user: this.currentUser
      }));
      
      logInfo('Session token refreshed');
    } catch (err) {
      logError('Token refresh error:', err);
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      this.updateAuthState({ isLoading: true, error: null });
      
      // Validate input
      if (!data.email || !data.password || !data.name) {
        throw new Error('Email, password, and name are required');
      }
      
      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Check if user already exists
      const existingUsers = await storage.getAll<User>('users');
      const userExists = existingUsers.some(user => user.email.toLowerCase() === data.email.toLowerCase());
      
      if (userExists) {
        throw new Error('User with this email already exists');
      }
      
      // In a real app, password would be hashed on the server
      // For demo, we'll store a simplified user object
      const newUser: User = {
        id: crypto.randomUUID(),
        email: data.email,
        name: data.name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        role: 'user',
        verified: false,
        preferences: {
          theme: 'system',
          units: 'metric',
          privacySettings: {
            shareActivity: false,
            shareProgress: false,
            allowDataAnalytics: true
          },
          notificationsEnabled: true
        }
      };
      
      // Store user in IndexedDB/localStorage
      await storage.setItem(`user_${newUser.id}`, newUser, 'users');
      
      // Store credentials for login (in a real app, this would be handled by the backend)
      await storage.setItem(`credentials_${data.email.toLowerCase()}`, {
        userId: newUser.id,
        password: data.password // In a real app, this would be hashed
      }, 'credentials');
      
      logInfo(`User registered: ${newUser.email}`);
      
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      logError('Registration error:', err);
      
      this.updateAuthState({
        isLoading: false,
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    } finally {
      this.updateAuthState({ isLoading: false });
    }
  }

  /**
   * Login a user
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      this.updateAuthState({ isLoading: true, error: null });
      
      // Validate input
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }
      
      // In a real app, authentication would happen on the server
      // For demo, we'll simulate a login process
      const storedCredentials = await storage.getItem<{ userId: string, password: string }>(
        `credentials_${credentials.email.toLowerCase()}`,
        'credentials'
      );
      
      if (!storedCredentials) {
        throw new Error('Invalid email or password');
      }
      
      if (storedCredentials.password !== credentials.password) {
        throw new Error('Invalid email or password');
      }
      
      // Get user data
      const user = await storage.getItem<User>(`user_${storedCredentials.userId}`, 'users');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate a token (in a real app, this would be from the server)
      const token = this.generateToken(user.id);
      const expiresAt = Date.now() + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      // Update last login
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString()
      };
      
      // Store session
      this.currentToken = {
        token,
        expiresAt
      };
      
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify({
        token,
        expiresAt,
        user: updatedUser
      }));
      
      // Update user in storage
      await storage.setItem(`user_${user.id}`, updatedUser, 'users');
      
      this.currentUser = updatedUser;
      this.updateAuthState({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      // Start session check interval
      this.startSessionCheck();
      
      logInfo(`User logged in: ${updatedUser.email}`);
      
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      logError('Login error:', err);
      
      this.updateAuthState({
        isLoading: false,
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      // Clear session data
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
      
      // Clear interval
      if (this.sessionCheckInterval !== null) {
        window.clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = null;
      }
      
      // Reset state
      this.currentUser = null;
      this.currentToken = null;
      
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      logInfo('User logged out');
    } catch (err) {
      logError('Logout error:', err);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      // Ensure user is authenticated
      if (!this.currentUser || this.currentUser.id !== userId) {
        throw new Error('Unauthorized');
      }
      
      // Get current user data
      const user = await storage.getItem<User>(`user_${userId}`, 'users');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Prevent updating sensitive fields
      const safeUpdates = { ...updates };
      delete safeUpdates.id;
      delete safeUpdates.createdAt;
      delete safeUpdates.role;
      
      // Update user
      const updatedUser = {
        ...user,
        ...safeUpdates,
        updatedAt: new Date().toISOString()
      };
      
      // Store updated user
      await storage.setItem(`user_${userId}`, updatedUser, 'users');
      
      // Update current user
      this.currentUser = updatedUser;
      
      // Update session
      if (this.currentToken) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify({
          token: this.currentToken.token,
          expiresAt: this.currentToken.expiresAt,
          user: updatedUser
        }));
      }
      
      this.updateAuthState({
        user: updatedUser
      });
      
      logInfo(`User profile updated: ${updatedUser.email}`);
      
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      logError('Profile update error:', err);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      // Ensure user is authenticated
      if (!this.currentUser || this.currentUser.id !== userId) {
        throw new Error('Unauthorized');
      }
      
      // Get current user data
      const user = await storage.getItem<User>(`user_${userId}`, 'users');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update preferences
      const updatedPreferences = {
        ...user.preferences,
        ...preferences
      };
      // Ensure theme is always set to a valid value
      if (!updatedPreferences.theme) {
        updatedPreferences.theme = 'system';
      }
      // Ensure units is always set to a valid value
      if (!updatedPreferences.units) {
        updatedPreferences.units = 'metric';
      }

      // Update user with new preferences
      const updatedUser: User = {
        ...user,
        preferences: {
          ...updatedPreferences,
          theme: updatedPreferences.theme as 'light' | 'dark' | 'system',
          units: updatedPreferences.units as 'metric' | 'imperial',
        },
      };
      
      // Store updated user
      await storage.setItem(`user_${userId}`, updatedUser, 'users');
      
      // Update current user
      this.currentUser = updatedUser;
      
      // Update session
      if (this.currentToken) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify({
          token: this.currentToken.token,
          expiresAt: this.currentToken.expiresAt,
          user: updatedUser
        }));
      }
      
      this.updateAuthState({
        user: updatedUser
      });
      
      logInfo(`User preferences updated: ${updatedUser.email}`);
      
      return updatedPreferences as UserPreferences;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      logError('Preferences update error:', err);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return this.authState;
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.authListeners.push(listener);
    
    // Immediately call with current state
    listener(this.authState);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Generate a JWT-like token
   */
  private generateToken(userId: string): string {
    // WARNING: Insecure. Tokens should be generated and signed by a secure backend.
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { 
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60)
    };
    
    // This is not a real signature and is highly insecure.
    if (typeof window === 'undefined' || !window.btoa) return '';
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    return `${encodedHeader}.${encodedPayload}.insecure_signature`;
  }
}

export const auth = new AuthService(); 