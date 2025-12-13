'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoPeople, IoCheckmarkCircle, IoClose, IoRefresh } from 'react-icons/io5';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface JoinClassroomStepProps {
  onSuccess: (classroomId: number) => void;
  onSkip: () => void;
}

export default function JoinClassroomStep({ onSuccess, onSkip }: JoinClassroomStepProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to join a classroom');
        setIsSubmitting(false);
        return;
      }
      
      // First get the user's ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', user.id)
        .single();
        
      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        setError('Could not find your user account. Please contact support.');
        setIsSubmitting(false);
        return;
      }
      
      // Check if the classroom exists with this invite code
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('link_code', inviteCode.trim())
        .single();
      
      if (classroomError || !classroom) {
        console.error('Classroom error:', classroomError);
        setError('Invalid invitation code. Please check and try again.');
        setIsSubmitting(false);
        return;
      }
      
      // Check if the user is already in this classroom
      const { data: existingEnrollment, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select('id')
        .eq('classroom_id', classroom.id)
        .eq('student_id', userData.id)
        .single();
      
      if (existingEnrollment) {
        setError('You are already enrolled in this classroom');
        setIsSubmitting(false);
        return;
      }
      
      // Add the user to the classroom
      const { error: joinError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: userData.id
        });
      
      if (joinError) {
        setError('Failed to join classroom. Please try again.');
        setIsSubmitting(false);
        return;
      }
      
      // Success!
      setSuccess(true);
      setClassroomId(classroom.id);
      
      // Delay to show success message before completing
      setTimeout(() => {
        onSuccess(classroom.id);
      }, 1500);
      
    } catch (err) {
      console.error('Error joining classroom:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-medium mb-1">Join a Classroom</h3>
            <p className="text-[#a0a0a0] text-sm">Enter the invitation code provided by your faculty</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <IoPeople size={20} className="text-blue-500" />
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                <IoCheckmarkCircle size={32} className="text-green-500" />
              </div>
              <h4 className="text-lg font-medium mb-1">Successfully Joined!</h4>
              <p className="text-[#a0a0a0] text-sm mb-4">You've been added to the classroom</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium mb-1">
                  Invitation Code
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter code (e.g., ABC123)"
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
                
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-red-400 text-sm flex items-center gap-1"
                  >
                    <IoClose size={14} />
                    {error}
                  </motion.p>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <IoRefresh size={16} className="animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Classroom'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={onSkip}
                  className="px-4 py-2 rounded-md bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#252525] transition-colors duration-200"
                >
                  Skip
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
