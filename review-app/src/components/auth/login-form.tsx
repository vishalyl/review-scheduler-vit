'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { IoSync, IoAlertCircle } from 'react-icons/io5';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Form schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  // Check for messages in URL params
  useEffect(() => {
    const message = searchParams.get('message');
    const verified = searchParams.get('verified');
    
    if (message) {
      toast.info(message);
    }
    
    if (verified === 'true') {
      toast.success('Email verified successfully!', {
        description: 'You can now sign in with your credentials.',
      });
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      // Show success toast
      toast.success('Signed in successfully!');

      // Fetch user role from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, name')
        .eq('email', data.email)
        .single();

      if (userError) {
        throw new Error('Failed to fetch user role');
      }

      if (!userData || !userData.role) {
        // Show error with animation
        throw new Error('Role not found, please contact support');
      }

      // Show personalized welcome toast
      toast.success(`Welcome${userData.name ? `, ${userData.name}` : ''}!`, {
        description: `Redirecting you to your dashboard...`,
      });

      // Redirect based on role
      if (userData.role === 'faculty') {
        router.push('/faculty/dashboard');
      } else if (userData.role === 'student') {
        router.push('/student/dashboard');
      } else {
        throw new Error('Invalid role');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      toast.error('Login failed', {
        description: err.message || 'An error occurred during login',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">Sign in</h2>
          <p className="mt-2 text-gray-400">
            Enter your credentials to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 text-sm text-red-400 bg-red-900/30 rounded-lg border border-red-800 flex items-start"
            >
              <IoAlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <IoSync className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-white hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
