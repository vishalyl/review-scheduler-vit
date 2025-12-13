import Link from 'next/link';
import { Metadata } from 'next';
import SignupForm from '@/components/auth/signup-form';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign Up | VIT Review Scheduler',
  description: 'Create a new account',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SignupForm />
    </div>
  );
}
