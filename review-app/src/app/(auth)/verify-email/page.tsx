'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { IoMail, IoChevronForward } from 'react-icons/io5';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center p-8 rounded-xl"
      >
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <IoMail className="h-10 w-10 text-white" />
        </div>

        <h2 className="text-3xl font-bold mb-4">Check your email</h2>

        <p className="text-gray-400 mb-6">
          We've sent a verification link to <span className="text-white font-medium">{email}</span>.
          Please check your inbox and click the link to verify your account.
        </p>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-gray-900 rounded-lg">
            <h3 className="font-medium mb-2">Didn't receive an email?</h3>
            <ul className="text-sm text-gray-400 text-left space-y-2">
              <li className="flex items-start">
                <IoChevronForward className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Check your spam or junk folder
              </li>
              <li className="flex items-start">
                <IoChevronForward className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Make sure you entered the correct email address
              </li>
              <li className="flex items-start">
                <IoChevronForward className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Allow a few minutes for the email to arrive
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Link
            href="/login"
            className="bg-white text-black py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Go to Login
          </Link>

          <Link
            href="/"
            className="text-gray-400 py-2 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
