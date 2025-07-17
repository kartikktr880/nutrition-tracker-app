import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { logError, logInfo } from '../utils/logger';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          }) as (typeof prisma)['user'] extends { findUnique: (...args: any[]) => Promise<infer U> } ? U & { password?: string | null } : never;

          if (!user || !user.password) {
            logError('Authentication failed: User not found or missing password', { email: credentials.email });
            return null;
          }

          // For now, we'll allow any password for existing users
          // In production, you should hash passwords and validate them
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            logError('Authentication failed: Invalid password', { email: credentials.email });
            return null;
          }

          logInfo('User authenticated successfully', { email: credentials.email });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          logError('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      
      if (account) {
        token.provider = account.provider;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
        };
      }
      return session;
    },
    async signIn({ user, account, profile: _profile }) {
      try {
        if (account?.provider === 'google' || account?.provider === 'github') {
          // Check if user exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email ?? '' }
          });

          if (!existingUser) {
            // Create new user with OAuth data
            await prisma.user.create({
              data: {
                email: user.email ?? '',
                name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
                // Add default preferences
                userPreferences: {
                  create: {
                    vegetarian: false,
                    vegan: false,
                    glutenFree: false,
                    dairyFree: false,
                    nutFree: false,
                    preferredCuisines: [],
                    mealSizePreference: 'medium',
                    cookingSkillLevel: 'intermediate'
                  }
                },
                nutritionalGoals: {
                  create: {
                    calories: 2000,
                    protein: 50,
                    carbohydrates: 250,
                    fats: 65,
                    fiber: 25,
                    sugar: 25,
                    sodium: 2300,
                    vitaminA: 5000,
                    vitaminC: 90,
                    calcium: 1000,
                    iron: 18
                  }
                }
              }
            });
            
            logInfo('New OAuth user created', { email: user.email });
          }
        }
        
        return true;
      } catch (error) {
        logError('Sign in callback error:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    // signUp is not a valid NextAuth page key, so it is removed
  },
  events: {
    async signIn({ user, account, profile: _profile, isNewUser }) {
      logInfo('User signed in', { 
        email: user.email, 
        provider: account?.provider, 
        isNewUser 
      });
    },
    async signOut({ session, token }) {
      logInfo('User signed out', { email: session?.user?.email });
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
// TODO: Add type definitions for bcryptjs if missing, or install @types/bcryptjs
// TODO: Add runtime checks for required environment variables if needed 