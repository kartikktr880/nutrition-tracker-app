"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams ? searchParams.get('error') : null;

  const getErrorDetails = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          message: 'There is a problem with the server configuration. Please try again later.',
          action: 'Try again'
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have permission to sign in. Please contact support if you believe this is an error.',
          action: 'Contact Support'
        };
      case 'Verification':
        return {
          title: 'Verification Failed',
          message: 'The verification link has expired or is invalid. Please request a new one.',
          action: 'Request New Link'
        };
      case 'OAuthSignin':
        return {
          title: 'OAuth Sign-in Error',
          message: 'There was an error during the OAuth sign-in process. Please try again.',
          action: 'Try Again'
        };
      case 'OAuthCallback':
        return {
          title: 'OAuth Callback Error',
          message: 'There was an error during the OAuth callback process. Please try again.',
          action: 'Try Again'
        };
      case 'OAuthCreateAccount':
        return {
          title: 'Account Creation Error',
          message: 'There was an error creating your account. Please try again.',
          action: 'Try Again'
        };
      case 'EmailCreateAccount':
        return {
          title: 'Email Account Creation Error',
          message: 'There was an error creating your account with email. Please try again.',
          action: 'Try Again'
        };
      case 'Callback':
        return {
          title: 'Callback Error',
          message: 'There was an error during the authentication callback. Please try again.',
          action: 'Try Again'
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Not Linked',
          message: 'This email is already associated with another account. Please sign in with the original provider.',
          action: 'Sign In'
        };
      case 'EmailSignin':
        return {
          title: 'Email Sign-in Error',
          message: 'There was an error sending the verification email. Please try again.',
          action: 'Try Again'
        };
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          message: 'The email or password you entered is incorrect. Please check your credentials and try again.',
          action: 'Try Again'
        };
      case 'SessionRequired':
        return {
          title: 'Session Required',
          message: 'You must be signed in to access this page. Please sign in to continue.',
          action: 'Sign In'
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during authentication. Please try again.',
          action: 'Try Again'
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20"
          >
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </motion.div>
          
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {errorDetails.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {errorDetails.message}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {errorDetails.action}
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              If you continue to experience issues, please contact our support team at{' '}
              <a href="mailto:support@nutritiontracker.com" className="text-primary hover:text-primary/80">
                support@nutritiontracker.com
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 