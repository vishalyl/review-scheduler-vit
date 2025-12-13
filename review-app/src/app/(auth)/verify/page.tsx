'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { IoCheckmarkCircle, IoClose, IoRefresh } from 'react-icons/io5';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Check if we have a verification token in the URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (token && type === 'signup') {
          // Verify the user's email
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup',
          });

          if (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to verify email. Please try again.');
          } else {
            setStatus('success');
            setMessage('Your email has been verified successfully!');

            // Redirect to login after a delay
            setTimeout(() => {
              router.push('/login?verified=true');
            }, 3000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid verification link. Please check your email and try again.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred during verification.');
      }
    };

    verifyEmail();
  }, [router, searchParams, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center p-8 rounded-xl"
      >
        {status === 'loading' && (
          <>
            <IoRefresh className="h-16 w-16 animate-spin text-white mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Verifying Your Email</h2>
            <p className="text-gray-400 mb-6">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <IoCheckmarkCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Email Verified!</h2>
            <p className="text-gray-400 mb-6">{message}</p>
            <p className="text-gray-400 mb-2">Redirecting you to login page...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <IoClose className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Verification Failed</h2>
            <p className="text-gray-400 mb-6">{message}</p>
            <Link
              href="/login"
              className="bg-white text-black py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block"
            >
              Back to Login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
