'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { IoLogOut } from 'react-icons/io5';

interface LogoutButtonProps {
  variant?: 'default' | 'minimal';
}

export default function LogoutButton({ variant = 'default' }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
      >
        <IoLogOut size={16} />
        <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleLogout}
      disabled={isLoading}
      className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <IoLogOut size={16} />
      <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
    </motion.button>
  );
}
