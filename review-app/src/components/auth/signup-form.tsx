'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { IoCheckmarkCircle, IoSync } from 'react-icons/io5';
import { toast } from 'sonner';
import { createUserInDatabase } from '@/app/actions/auth';

// Form schema
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['faculty', 'student'], {
    required_error: 'Please select a role',
  }),
  department: z.string().optional(),
  rollNumber: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const supabase = createClientComponentClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: undefined,
      department: '',
      rollNumber: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Use server action to create user in database
      const result = await createUserInDatabase({
        supabase_user_id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        department: data.department || null,
        roll_number: data.rollNumber || null,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Show success state
      setIsSuccess(true);
      
      // Show toast notification
      toast.success('Account created successfully!', {
        description: 'Please check your email for verification link.',
        duration: 5000,
      });
      
      // Redirect to verification pending page after a delay
      setTimeout(() => {
        router.push('/verify-email?email=' + encodeURIComponent(data.email));
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
      toast.error('Signup failed', {
        description: err.message || 'An error occurred during signup',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center p-8 rounded-xl"
        >
          <IoCheckmarkCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Account Created!</h2>
          <p className="text-gray-400 mb-6">
            We've sent a verification link to your email. Please check your inbox and verify your account.
          </p>
          <p className="text-gray-400 mb-2">Redirecting you to verification page...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">Create an account</h2>
          <p className="mt-2 text-gray-400">
            Sign up to schedule and manage your project reviews
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

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
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
                Role
              </label>
              <select
                id="role"
                {...register('role')}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
              >
                <option value="">Select a role</option>
                <option value="faculty">Faculty</option>
                <option value="student">Student</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            {selectedRole === 'faculty' && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-1">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  {...register('department')}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
                  placeholder="Enter your department"
                />
              </div>
            )}

            {selectedRole === 'student' && (
              <>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    id="department"
                    type="text"
                    {...register('department')}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
                    placeholder="Enter your department"
                  />
                </div>
                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-300 mb-1">
                    Roll Number
                  </label>
                  <input
                    id="rollNumber"
                    type="text"
                    {...register('rollNumber')}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 text-white"
                    placeholder="Enter your roll number"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 text-sm text-red-400 bg-red-900/30 rounded-lg border border-red-800"
            >
              {error}
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
                Creating account...
              </>
            ) : (
              'Sign up'
            )}
          </button>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-white hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
