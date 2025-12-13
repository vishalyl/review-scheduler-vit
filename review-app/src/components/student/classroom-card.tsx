'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { IoPeople, IoCalendar, IoDocument } from 'react-icons/io5';

interface ClassroomCardProps {
  classroom: {
    id: number;
    name: string;
    faculty_name?: string;
    review_deadlines?: Record<string, string>;
    teams_count?: number;
    students_count?: number;
  };
}

export default function ClassroomCard({ classroom }: ClassroomCardProps) {
  // Check if there are any upcoming deadlines
  const upcomingDeadlines = classroom.review_deadlines 
    ? Object.entries(classroom.review_deadlines)
        .filter(([_, date]) => new Date(date) > new Date())
        .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
    : [];

  // Get the next upcoming deadline
  const nextDeadline = upcomingDeadlines.length > 0 ? upcomingDeadlines[0] : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:bg-gray-800/70 transition-colors"
    >
      <Link href={`/student/classroom/${classroom.id}`} className="block">
        <h4 className="font-bold text-lg mb-1">{classroom.name}</h4>
        {classroom.faculty_name && (
          <p className="text-gray-400 text-sm mb-4">Faculty: {classroom.faculty_name}</p>
        )}

        {nextDeadline && (
          <div className="mb-4 flex items-center gap-2">
            <IoCalendar className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs text-gray-400">Next Deadline</p>
              <p className="text-sm">
                <span className="font-medium">{nextDeadline[0]}</span>
                <span className="text-gray-400 ml-2">
                  {new Date(nextDeadline[1]).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="bg-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <IoPeople className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs">{classroom.students_count || 0} students</span>
          </div>
          
          <div className="bg-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <IoDocument className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs">{classroom.teams_count || 0} teams</span>
          </div>
          
          {classroom.review_deadlines && (
            <div className="bg-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <IoCalendar className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs">{Object.keys(classroom.review_deadlines).length} reviews</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
