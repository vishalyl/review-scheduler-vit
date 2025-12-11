'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Student {
  id: number;
  name: string;
  email: string;
  roll_number: string;
  team?: {
    id: number;
    name: string;
    project_title?: string;
    role?: string;
  };
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  members_count: number;
  members: {
    id: number;
    name: string;
    email: string;
    roll_number?: string;
    role: string;
  }[];
}

interface Classroom {
  id: number;
  name: string;
  link_code: string;
  review_deadlines: Record<string, string>;
  created_at: string;
}

export default function ClassroomManagementPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('students');

  useEffect(() => {
    const fetchClassroomData = async () => {
      try {
        setLoading(true);

        // Fetch classroom details first
        const classroomResponse = await fetch(`/api/classrooms/${classroomId}/data`);

        if (!classroomResponse.ok) {
          const errorData = await classroomResponse.json();
          throw new Error(errorData.message || 'Failed to fetch classroom data');
        }

        const classroomData = await classroomResponse.json();
        console.log('Received classroom data:', classroomData);

        setClassroom(classroomData.classroom);
        setStudents(classroomData.students || []);

        // Fetch teams separately using the dedicated endpoint
        const teamsResponse = await fetch(`/api/classrooms/${classroomId}/teams`);

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          console.log('Received teams data:', teamsData);
          setTeams(teamsData.teams || []);
        } else {
          console.error('Failed to fetch teams, but continuing with other data');
          setTeams([]);
        }
      } catch (error: any) {
        console.error('Error fetching classroom data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (classroomId) {
      fetchClassroomData();
    }
  }, [classroomId]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-medium mb-4">Error</h1>
          <p className="text-[#f87171] mb-4">{error || 'Classroom not found'}</p>
          <Link href="/faculty/dashboard" className="text-[#5c46f5] hover:text-[#4c38e6] transition-colors mt-4 inline-block text-sm">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
              >
                <span className="text-lg">←</span>
              </button>
              <div>
                <h1 className="text-xl font-medium">{classroom.name}</h1>
                <p className="text-[#a0a0a0] text-sm">Classroom Management</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-[#1a1a1a] text-[#a0a0a0] px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-[#252525]">
                <span>👥 {students.length} students</span>
              </div>
              <div className="bg-[#1a1a1a] text-[#a0a0a0] px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-[#252525]">
                <span>🏫 {teams.length} teams</span>
              </div>
              <div className="bg-[#1a1a1a] text-[#a0a0a0] px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-[#252525]">
                <span>📅</span>
                <span>
                  {Object.keys(classroom.review_deadlines || {}).length > 0
                    ? `${Object.keys(classroom.review_deadlines).length} deadlines`
                    : 'No deadlines set'}
                </span>
              </div>
            </div>

            {/* Invitation Code */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-4 mb-6">
              <p className="text-xs text-[#a0a0a0] mb-2">Classroom Invitation Code</p>
              <div className="flex items-center justify-between">
                <code className="font-mono text-[#5c46f5] text-base">{classroom.link_code}</code>
                <button
                  className="text-[#5c46f5] hover:text-[#4c38e6] transition-colors p-2 text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(classroom.link_code);
                    alert('Invitation code copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#1e1e1e] mb-6">
              <div className="flex gap-6">
                <button
                  className={`pb-3 px-1 ${activeTab === 'students'
                    ? 'text-white border-b-2 border-[#5c46f5] font-medium'
                    : 'text-[#a0a0a0] hover:text-white transition-colors'
                    }`}
                  onClick={() => setActiveTab('students')}
                >
                  Students
                </button>
                <button
                  className={`pb-3 px-1 ${activeTab === 'teams'
                    ? 'text-white border-b-2 border-[#5c46f5] font-medium'
                    : 'text-[#a0a0a0] hover:text-white transition-colors'
                    }`}
                  onClick={() => setActiveTab('teams')}
                >
                  Teams
                </button>
              </div>
            </div>
          </motion.div>

          {/* Students Tab */}
          {activeTab === 'students' && (
            <motion.div variants={itemVariants}>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#1e1e1e] flex justify-between items-center">
                  <h2 className="font-medium text-base">All Students</h2>
                  <span className="text-xs text-[#a0a0a0]">{students.length} total</span>
                </div>

                {!students || students.length === 0 ? (
                  <div className="p-6 text-center text-[#a0a0a0]">
                    <div className="text-4xl mb-3">👤</div>
                    <p className="text-sm">No students have joined this classroom yet</p>
                    <p className="text-xs mt-2">Share the invitation code with your students</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a] text-left">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium text-[#a0a0a0]">Name</th>
                          <th className="px-4 py-3 text-xs font-medium text-[#a0a0a0]">Roll Number</th>
                          <th className="px-4 py-3 text-xs font-medium text-[#a0a0a0]">Email</th>
                          <th className="px-4 py-3 text-xs font-medium text-[#a0a0a0]">Team</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e1e]">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-[#1a1a1a] transition-colors">
                            <td className="px-4 py-3 text-sm">{student.name || 'Unknown'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#a0a0a0]">
                              {student.roll_number || '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#a0a0a0]">{student.email || '-'}</td>
                            <td className="px-4 py-3">
                              {student.team ? (
                                <span className="bg-[#1a1a1a] text-[#5c46f5] px-2 py-1 rounded text-xs border border-[#252525]">
                                  {student.team.name}
                                </span>
                              ) : (
                                <span className="bg-[#1a1a1a] text-[#a0a0a0] px-2 py-1 rounded text-xs border border-[#252525]">
                                  No Team
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <motion.div variants={itemVariants}>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden mb-6">
                <div className="p-4 border-b border-[#1e1e1e] flex justify-between items-center">
                  <h2 className="font-medium text-base">All Teams</h2>
                  <span className="text-xs text-[#a0a0a0]">{teams.length} total</span>
                </div>

                {!teams || teams.length === 0 ? (
                  <div className="p-6 text-center text-[#a0a0a0]">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-sm">No teams have been created in this classroom yet</p>
                    <p className="text-xs mt-2">Students can create teams after joining</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1e1e1e]">
                    {teams.map((team) => (
                      <div key={team.id} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-medium text-base">{team.name || 'Unnamed Team'}</h3>
                            {team.project_title && (
                              <p className="text-[#a0a0a0] text-xs">{team.project_title}</p>
                            )}
                          </div>
                          <span className="bg-[#1a1a1a] text-[#a0a0a0] px-3 py-1 rounded-lg text-xs border border-[#252525]">
                            {team.members_count || 0} members
                          </span>
                        </div>

                        {team.members && team.members.length > 0 ? (
                          <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-[#1a1a1a] text-left">
                                <tr>
                                  <th className="px-4 py-2 text-xs font-medium text-[#a0a0a0]">Name</th>
                                  <th className="px-4 py-2 text-xs font-medium text-[#a0a0a0]">Roll Number</th>
                                  <th className="px-4 py-2 text-xs font-medium text-[#a0a0a0]">Role</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#252525]">
                                {team.members.map((member) => (
                                  <tr key={member.id} className="hover:bg-[#252525] transition-colors">
                                    <td className="px-4 py-2 text-sm">{member.name || 'Unknown'}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-[#a0a0a0]">
                                      {member.roll_number || '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-1 rounded text-xs ${member.role === 'leader'
                                        ? 'bg-[#1a1a1a] text-[#5c46f5] border border-[#252525]'
                                        : 'bg-[#1a1a1a] text-[#a0a0a0] border border-[#252525]'
                                        }`}>
                                        {member.role || 'member'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-400">
                            <p>No members in this team</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
