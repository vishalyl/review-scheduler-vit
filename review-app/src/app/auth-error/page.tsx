'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, LogOut } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [countdown, setCountdown] = useState(5);

  const errorType = searchParams.get('error') || 'unknown';

  let errorTitle = 'Authentication Error';
  let errorMessage = 'An unknown authentication error occurred.';

  switch (errorType) {
    case 'role-not-found':
      errorTitle = 'Role Not Found';
      errorMessage = 'Your user account does not have a role assigned. Please contact support for assistance.';
      break;
    case 'unauthorized-role':
      errorTitle = 'Unauthorized Access';
      errorMessage = 'You do not have permission to access this area. Please use the correct dashboard for your role.';
      break;
    default:
      errorTitle = 'Authentication Error';
      errorMessage = 'An unknown authentication error occurred. Please try signing in again.';
  }

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      router.push('/');
    }
  }, [countdown, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center p-8 rounded-xl"
      >
        <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>

        <h2 className="text-3xl font-bold mb-4">{errorTitle}</h2>

        <motion.p
          className="text-gray-400 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {errorMessage}
        </motion.p>

        <p className="text-gray-500 mb-8">
          Redirecting to home page in {countdown} seconds...
        </p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleSignOut}
            className="bg-red-900/30 text-white border border-red-800 py-3 px-6 rounded-lg font-medium hover:bg-red-900/50 transition-colors flex items-center justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>

          <Link
            href="/"
            className="bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
