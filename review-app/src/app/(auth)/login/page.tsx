import Link from 'next/link';
import { Metadata } from 'next';
import LoginForm from '@/components/auth/login-form';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Login | VIT Review Scheduler',
  description: 'Sign in to your account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <LoginForm />
    </div>
  );
}
