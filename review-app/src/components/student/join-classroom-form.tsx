'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmark, IoClose, IoSync } from 'react-icons/io5';

interface JoinClassroomFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function JoinClassroomForm({ onSuccess, onCancel }: JoinClassroomFormProps) {
  const [linkCode, setLinkCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkCode.trim()) {
      setError('Please enter a classroom link code');
      return;
    }
    
    // Format the code properly (remove spaces, make uppercase)
    let formattedCode = linkCode.trim().toUpperCase();
    
    // Add hyphen if missing (XXX-XXX format)
    if (formattedCode.length === 6 && !formattedCode.includes('-')) {
      formattedCode = `${formattedCode.slice(0, 3)}-${formattedCode.slice(3, 6)}`;
    }
    
    // Keep the formatted code with hyphen for backend processing
    console.log('Sending formatted code to API:', formattedCode);

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the API endpoint to join classroom
      const response = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkCode: formattedCode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join classroom');
      }

      const result = await response.json();
      
      if (result.alreadyJoined) {
        throw new Error('You are already a member of this classroom');
      }

      setSuccess(true);
      setLinkCode(''); // Reset the link code after joining a classroom
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to join classroom');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 1,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 1,
        ease: "easeIn"
      }
    }
  };

  const modalVariants = {
    hidden: { 
      y: 20, 
      opacity: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 500
      }
    },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 500,
        delay: 0.05
      }
    },
    exit: { 
      y: 20, 
      opacity: 0,
      transition: {
        type: "tween",
        duration: 1,
        ease: "easeIn"
      }
    }
  };

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-[#1e1e1e] rounded-lg w-full max-w-md overflow-hidden"
      >
      <div className="p-6 border-b border-[#1e1e1e]">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Join Classroom</h3>
          {onCancel && (
            <button 
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200"
            >
              <IoClose size={14} className="text-[#a0a0a0]" />
            </button>
          )}
        </div>
      </div>
      <div className="p-6">

      {success ? (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
            <IoCheckmark className="h-8 w-8 text-white" />
          </div>
          <h4 className="text-base font-medium mb-2">Successfully joined classroom!</h4>
          <p className="text-[#a0a0a0] text-sm text-center">You can now create or join teams in this classroom</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="linkCode" className="block text-sm font-medium text-white mb-2">
              Classroom Link Code
            </label>
            <input
              type="text"
              id="linkCode"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              placeholder="XXX-XXX"
              maxLength={7}
              pattern="[A-Za-z0-9]{3}-?[A-Za-z0-9]{3}"
              className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#303030] transition-colors duration-200 uppercase"
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-2 text-[#a0a0a0] text-xs">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-[#a0a0a0] hover:text-white text-sm transition-colors duration-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="bg-[#1e1e1e] text-white px-3 py-1.5 rounded-md text-sm hover:bg-[#252525] transition-colors duration-200 flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <IoSync size={14} className="animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                'Join Classroom'
              )}
            </button>
          </div>
        </form>
      )}
      </div>
    </motion.div>
    </motion.div>
  );
}
