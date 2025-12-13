'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { IoCheckmark, IoClose, IoSync, IoCalendar } from 'react-icons/io5';
import { useForm } from 'react-hook-form';

interface CreateClassroomFormProps {
  onSuccess?: (classroomId: number) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  review1Date: string;
  review2Date: string;
  finalDate: string;
}

export default function CreateClassroomForm({ onSuccess, onCancel }: CreateClassroomFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState({ created: false, copied: false });
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      review1Date: '',
      review2Date: '',
      finalDate: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Get the user's database ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', currentUser.id)
        .single();
        
      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        throw new Error('Failed to get user database ID');
      }

      // Generate a random link code (6 characters)
      const generateLinkCode = () => {
        // Use a more readable character set (no similar looking characters)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 to avoid confusion
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Format as XXX-XXX for better readability
        return `${result.slice(0, 3)}-${result.slice(3, 6)}`;
      };

      const linkCode = generateLinkCode();

      // Prepare review deadlines
      const reviewDeadlines: Record<string, string> = {};
      if (data.review1Date) reviewDeadlines['Review 1'] = data.review1Date;
      if (data.review2Date) reviewDeadlines['Review 2'] = data.review2Date;
      if (data.finalDate) reviewDeadlines['Final'] = data.finalDate;

      // Create the classroom using a server action to bypass RLS
      // We'll use a fetch request to a server endpoint instead of direct Supabase client
      // Log what we're sending for debugging
      console.log('Creating classroom with faculty ID:', userData.id, 'Type:', typeof userData.id);
      
      const response = await fetch('/api/classrooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          faculty_id: userData.id, // Use the database ID instead of auth ID
          link_code: linkCode,
          review_deadlines: reviewDeadlines
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create classroom');
      }

      const classroom = await response.json();
      
      setClassroomId(classroom.id);
      setLinkCode(classroom.link_code);
      setSuccess({ created: true, copied: false });
      
      // Store the link code in local storage so it's not lost on redirect
      localStorage.setItem('lastClassroomCode', classroom.link_code);
      
      // Increase timeout to give more time to copy the code
      setTimeout(() => {
        if (onSuccess) onSuccess(classroom.id);
      }, 10000); // Increased from 3000 to 10000 (10 seconds)
    } catch (error: any) {
      setError(error.message || 'Failed to create classroom');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Create New Classroom</h3>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <IoClose size={20} />
          </button>
        )}
      </div>

      {success.created ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <IoCheckmark className="h-8 w-8 text-green-400" />
          </div>
          <h4 className="text-lg font-medium mb-2">Classroom created successfully!</h4>
          <p className="text-gray-400 text-center mb-6">Your classroom has been created and is ready for students to join</p>
          
          {linkCode && (
            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Share this code with your students:</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono font-bold tracking-wider text-indigo-400">{linkCode}</p>
                <button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(linkCode);
                    // Use a more elegant notification instead of alert
                    setSuccess(prev => ({ ...prev, copied: true }));
                    setTimeout(() => {
                      setSuccess(prev => ({ ...prev, copied: false }));
                    }, 2000);
                  }}
                >
                  {success.copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              if (onSuccess && classroomId) onSuccess(classroomId);
            }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            View Classroom
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Classroom Name *
              </label>
              <input
                id="name"
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., CSE3001 - J Component"
                disabled={isSubmitting}
                {...register('name', { 
                  required: 'Classroom name is required',
                  maxLength: {
                    value: 100,
                    message: 'Classroom name cannot exceed 100 characters'
                  }
                })}
              />
              {errors.name && (
                <p className="mt-2 text-red-400 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <IoCalendar size={16} className="text-indigo-400" />
                Review Deadlines (Optional)
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="review1Date" className="block text-sm text-gray-400 mb-1">
                    Review 1
                  </label>
                  <input
                    id="review1Date"
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSubmitting}
                    min={today}
                    {...register('review1Date')}
                  />
                </div>
                
                <div>
                  <label htmlFor="review2Date" className="block text-sm text-gray-400 mb-1">
                    Review 2
                  </label>
                  <input
                    id="review2Date"
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSubmitting}
                    min={today}
                    {...register('review2Date')}
                  />
                </div>
                
                <div>
                  <label htmlFor="finalDate" className="block text-sm text-gray-400 mb-1">
                    Final Review
                  </label>
                  <input
                    id="finalDate"
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSubmitting}
                    min={today}
                    {...register('finalDate')}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-3">
                <IoClose className="text-red-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Error creating classroom</p>
                  <p className="text-red-300/80 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="mr-4 px-4 py-2 text-gray-300 hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <IoSync size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Classroom'
                )}
              </motion.button>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
