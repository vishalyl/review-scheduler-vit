'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoPeople, IoClose } from 'react-icons/io5';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/auth/logout-button';

interface StudentLayoutProps {
  children: ReactNode;
  user: any;
}

export default function StudentLayout({ children, user }: StudentLayoutProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e1e]">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/student/dashboard" className="flex items-center">
            <Image 
              src="/images/Review Scheduler.png" 
              alt="Review Scheduler Logo" 
              width={36} 
              height={36} 
              className="rounded-full"
            />
          </Link>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200 relative group"
            >
              <span className="absolute -bottom-8 right-0 bg-[#252525] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">View Profile</span>
              <IoPeople size={14} className="text-[#a0a0a0]" />
            </button>
            <LogoutButton variant="minimal" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-[#1e1e1e] rounded-lg w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[#1e1e1e]">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Profile</h3>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200"
                  >
                    <IoClose size={14} className="text-[#a0a0a0]" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h4 className="text-base font-medium">{user?.name || 'Student'}</h4>
                    <p className="text-[#a0a0a0] text-xs mt-1">{user?.email || 'No email available'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h5 className="text-xs font-medium mb-2">Student Information</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Registration Number</p>
                        <p className="text-xs">22MIA1079</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Joined</p>
                        <p className="text-xs">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-[#1e1e1e] flex justify-end">
                  <LogoutButton variant="minimal" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
