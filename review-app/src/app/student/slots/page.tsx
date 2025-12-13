'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IoChevronBack } from 'react-icons/io5';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EnhancedReviewSlots from '@/components/student/enhanced-review-slots';

// Simple page that hosts the StudentReviewSlotsSection component

export default function StudentSlotsPage() {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUser();
  }, [supabase]);
  
  if (!userId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5c46f5]"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link 
          href="/student/dashboard" 
          className="text-[#a0a0a0] hover:text-white inline-flex items-center gap-1 mb-4 transition-colors duration-200"
        >
          <IoChevronBack size={16} />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold">Available Review Slots</h1>
        <p className="text-[#a0a0a0] mt-1">View and book available slots for your project reviews</p>
      </div>
      
      {userId && <EnhancedReviewSlots userId={userId} />}
    </div>
  );
}
