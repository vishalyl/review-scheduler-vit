'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { IoClose, IoPeople, IoCalendar, IoSchool, IoCopy, IoTime, IoPerson } from 'react-icons/io5';

interface ClassroomDetailsModalProps {
  classroom: {
    id: number;
    name: string;
    faculty_name?: string;
    review_deadlines?: Record<string, string>;
    teams_count?: number;
    students_count?: number;
  };
  onClose: () => void;
}

export default function ClassroomDetailsModal({ classroom, onClose }: ClassroomDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  // Get the classroom link code if needed (for faculty)
  useEffect(() => {
    const fetchLinkCode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('supabase_user_id', user.id)
          .single();
        if (userData?.role === 'faculty') {
          const { data, error } = await supabase
            .from('classrooms')
            .select('link_code')
            .eq('id', classroom.id)
            .single();
          if (!error && data) {
            setLinkCode(data.link_code);
          }
        }
      } catch (error) {
        // ignore
      }
    };
    fetchLinkCode();
  }, [classroom.id, supabase]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // Define animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.2,
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
        duration: 0.2,
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
      onClick={handleBackdropClick}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-[#141414] border border-[#1e1e1e] rounded-lg w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
          <h3 className="text-lg font-medium">{classroom.name}</h3>
          <button 
            onClick={onClose}
            className="text-[#a0a0a0] hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <IoClose size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Stats */}
          <div className="flex space-x-3 mb-4">
            <div className="flex items-center gap-2 bg-[#1a1a1a] text-[#a0a0a0] px-3 py-2 rounded-lg">
              <IoPeople size={14} />
              <span className="text-sm">{classroom.students_count || 0} students</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1a1a1a] text-[#a0a0a0] px-3 py-2 rounded-lg">
              <IoCalendar size={14} />
              <span className="text-sm">{classroom.teams_count || 0} teams</span>
            </div>
          </div>

          {/* Faculty */}
          {classroom.faculty_name && (
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Faculty</p>
              <p className="font-medium">{classroom.faculty_name}</p>
            </div>
          )}

          {/* Invitation Code */}
          {linkCode && (
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Invitation Code</p>
              <div className="flex items-center justify-between bg-gray-800 rounded p-2">
                <code className="font-mono text-indigo-300">{linkCode}</code>
                <button 
                  className="text-indigo-400 hover:text-indigo-300 p-1"
                  onClick={() => {
                    navigator.clipboard.writeText(linkCode);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                >
                  {codeCopied ? (
                    <span className="text-green-400 text-xs">Copied!</span>
                  ) : (
                    <IoCopy size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Review Deadlines */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1 text-[#a0a0a0]">
              <IoTime size={14} />
              <span className="text-sm">Review Deadlines</span>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              {classroom.review_deadlines && Object.keys(classroom.review_deadlines).length > 0 ? (
                <ul className="space-y-2">
                  {Object.entries(classroom.review_deadlines).map(([stage, date]) => (
                    <li key={stage} className="flex justify-between text-sm">
                      <span className="text-[#a0a0a0] capitalize">{stage.replace('_', ' ')}</span>
                      <span className="text-[#e0e0e0]">{date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <IoTime size={18} className="text-[#a0a0a0] mb-2" />
                  <p className="text-[#a0a0a0] text-sm">No deadlines set</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e1e1e] flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#e0e0e0] text-sm rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.location.href = `/student/classroom/${classroom.id}/teams`}
            className="px-4 py-2 bg-[#5c46f5] hover:bg-[#4c38e6] text-white text-sm rounded-lg transition-colors"
          >
            View Teams
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
