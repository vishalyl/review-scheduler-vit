'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    link_code?: string;
  };
  onClose: () => void;
}

export default function ClassroomDetailsModal({ classroom, onClose }: ClassroomDetailsModalProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(classroom.link_code || null);
  const supabase = createClientComponentClient();

  // Get the classroom link code if not provided
  useEffect(() => {
    const fetchLinkCode = async () => {
      if (linkCode) return;
      
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select('link_code')
          .eq('id', classroom.id)
          .single();
        
        if (!error && data) {
          setLinkCode(data.link_code);
        }
      } catch (error) {
        // ignore
      }
    };
    
    fetchLinkCode();
  }, [classroom.id, linkCode, supabase]);

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

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#0f1014] border border-gray-800 rounded-xl w-full max-w-md shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-xl font-bold">{classroom.name}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Stats */}
          <div className="flex space-x-3 mb-4">
            <div className="flex items-center gap-2 bg-indigo-900/30 text-indigo-300 px-3 py-2 rounded-lg">
              <IoPeople size={16} />
              <span>{classroom.students_count || 0} students</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-900/30 text-emerald-300 px-3 py-2 rounded-lg">
              <IoSchool size={16} />
              <span>{classroom.teams_count || 0} teams</span>
            </div>
          </div>

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
          <div>
            <p className="text-sm text-gray-400 mb-2">Review Deadlines</p>
            {classroom.review_deadlines && Object.keys(classroom.review_deadlines).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(classroom.review_deadlines).map(([review, date]) => {
                  const reviewDate = new Date(date);
                  const isUpcoming = reviewDate > new Date();
                  return (
                    <div key={review} className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <IoCalendar size={16} className={isUpcoming ? "text-emerald-400" : "text-gray-400"} />
                        <span>{review}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isUpcoming 
                          ? 'bg-emerald-900/30 text-emerald-400' 
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {reviewDate.toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-800/30 rounded">
                <IoTime size={24} className="mx-auto mb-2 text-gray-500" />
                <p className="text-gray-400">No deadlines set</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Close
          </button>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            onClick={() => {
              window.location.href = `/faculty/classroom/${classroom.id}`;
            }}
          >
            Manage Classroom
          </button>
        </div>
      </motion.div>
    </div>
  );
}
