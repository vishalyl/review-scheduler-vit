'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { IoArrowBack, IoPeople, IoPersonAdd, IoCheckmarkCircle, IoCopy, IoAlertCircle, IoTime } from 'react-icons/io5';
import Link from 'next/link';
import CreateTeamForm from '@/components/student/create-team-form';
import JoinTeamForm from '@/components/student/join-team-form';

interface ClassroomStudent {
  id: number;
  name: string;
  email: string;
  has_team: boolean;
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  invitation_code: string;
  max_members: number;
  current_members: number;
  is_member: boolean;
  is_leader: boolean;
  members: TeamMember[];
}

interface TeamMember {
  id: number;
  name: string;
  role: 'leader' | 'member';
}

export default function ClassroomTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<{ id: number; name: string } | null>(null);
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false);
  const [showJoinTeamForm, setShowJoinTeamForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchClassroomData = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          throw new Error('Not authenticated');
        }

        // Get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .eq('supabase_user_id', currentUser.id)
          .single();

        if (userError) {
          throw userError;
        }

        if (userData.role !== 'student') {
          throw new Error('Only students can access this page');
        }

        // Get classroom data
        const { data: classroomData, error: classroomError } = await supabase
          .from('classrooms')
          .select('id, name')
          .eq('id', classroomId)
          .single();

        if (classroomError) {
          throw classroomError;
        }

        setClassroom(classroomData);

        // Check if user is a member of this classroom
        const { data: classroomStudent, error: classroomStudentError } = await supabase
          .from('classroom_students')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('student_id', userData.id)
          .single();

        if (classroomStudentError) {
          throw new Error('You are not a member of this classroom');
        }

        // Get all students in the classroom
        const { data: classroomStudents, error: studentsError } = await supabase
          .from('classroom_students')
          .select(`
            students:student_id(
              id,
              name,
              email
            )
          `)
          .eq('classroom_id', classroomId);

        if (studentsError) {
          throw studentsError;
        }

        // Get all teams in the classroom
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            project_title,
            invitation_code,
            max_members,
            members:team_members(
              student:student_id(
                id,
                name
              ),
              role
            )
          `)
          .eq('classroom_id', classroomId);

        if (teamsError) {
          throw teamsError;
        }

        // Get user's team in this classroom
        const { data: userTeamData, error: userTeamError } = await supabase
          .from('team_members')
          .select(`
            role,
            team:team_id(
              id,
              name,
              project_title,
              invitation_code,
              max_members,
              members:team_members(
                student:student_id(
                  id,
                  name
                ),
                role
              )
            )
          `)
          .eq('student_id', userData.id)
          .eq('team.classroom_id', classroomId)
          .single();

        // Format teams data
        const formattedTeams = teamsData.map(team => {
          const members = team.members.map(member => ({
            id: member.student.id,
            name: member.student.name,
            role: member.role
          }));

          return {
            id: team.id,
            name: team.name,
            project_title: team.project_title,
            invitation_code: team.invitation_code,
            max_members: team.max_members,
            current_members: members.length,
            is_member: false,
            is_leader: false,
            members
          };
        });

        // Format students data
        const studentIds = new Set();
        const teamMemberIds = new Set();

        teamsData.forEach(team => {
          team.members.forEach(member => {
            teamMemberIds.add(member.student.id);
          });
        });

        const formattedStudents = classroomStudents.map(cs => {
          const student = cs.students;
          studentIds.add(student.id);

          return {
            id: student.id,
            name: student.name,
            email: student.email,
            has_team: teamMemberIds.has(student.id)
          };
        });

        setStudents(formattedStudents);
        setTeams(formattedTeams);

        // Set user's team if they have one
        if (!userTeamError && userTeamData) {
          const team = userTeamData.team;
          const members = team.members.map(member => ({
            id: member.student.id,
            name: member.student.name,
            role: member.role
          }));

          setUserTeam({
            id: team.id,
            name: team.name,
            project_title: team.project_title,
            invitation_code: team.invitation_code,
            max_members: team.max_members,
            current_members: members.length,
            is_member: true,
            is_leader: userTeamData.role === 'leader',
            members
          });
        }
      } catch (error: any) {
        console.error('Error fetching classroom data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClassroomData();
  }, [classroomId, supabase]);

  const copyInvitationCode = () => {
    if (userTeam) {
      navigator.clipboard.writeText(userTeam.invitation_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Animation variants
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

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-400">{error}</p>
          <Link href="/student/dashboard" className="text-indigo-400 mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 max-w-md">
          <h2 className="text-lg font-medium mb-4">Classroom Not Found</h2>
          <p className="text-[#a0a0a0] mb-6">The classroom you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/student/dashboard" className="bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm transition-colors">
            <IoArrowBack size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <Link href="/student/dashboard" className="text-[#a0a0a0] hover:text-white inline-flex items-center gap-2 mb-4 transition-colors">
              <IoArrowBack size={16} />
              Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-medium">{classroom.name}: Teams</h2>
                <p className="text-[#a0a0a0] text-sm mt-1">Create or join a team to book review slots</p>
              </div>
              {!userTeam && (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    onClick={() => router.push(`/student/classroom/${classroomId}/slots`)}
                  >
                    <IoTime size={16} />
                    Book Review Slot
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    onClick={() => setShowCreateTeamForm(true)}
                  >
                    <IoPeople size={16} />
                    Create Team
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Create/Join Team Forms */}
          <AnimatePresence>
            {showCreateTeamForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-8"
              >
                <CreateTeamForm
                  classroomId={parseInt(classroomId)}
                  onSuccess={(teamId) => {
                    setShowCreateTeamForm(false);
                    router.refresh();
                  }}
                  onCancel={() => setShowCreateTeamForm(false)}
                />
              </motion.div>
            )}

            {showJoinTeamForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-8"
              >
                <JoinTeamForm
                  classroomId={parseInt(classroomId)}
                  onSuccess={(teamId) => {
                    setShowJoinTeamForm(false);
                    router.refresh();
                  }}
                  onCancel={() => setShowJoinTeamForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* User's Team */}
          {userTeam && (
            <motion.div variants={itemVariants} className="mb-8">
              <h3 className="text-lg font-medium mb-3">Your Team</h3>
              <div className="bg-[#141414] rounded-lg p-5 border border-[#1e1e1e]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-medium">{userTeam.name}</h3>
                    {userTeam.project_title && (
                      <p className="text-[#a0a0a0] text-sm mt-1">{userTeam.project_title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#1a1a1a] text-[#a0a0a0] px-2 py-0.5 rounded-full">
                      {userTeam.current_members}/{userTeam.max_members} Members
                    </span>
                    {userTeam.is_leader && (
                      <span className="text-xs bg-[#5c46f5]/10 text-[#a0a0a0] px-2 py-0.5 rounded-full ml-1">
                        Team Leader
                      </span>
                    )}
                  </div>
                </div>

                {userTeam.is_leader && (
                  <div className="bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-[#a0a0a0] mb-1">Invitation Code</p>
                        <p className="font-mono text-sm">{userTeam.invitation_code}</p>
                      </div>
                      <button
                        className="bg-[#252525] hover:bg-[#303030] text-[#e0e0e0] px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        onClick={copyInvitationCode}
                      >
                        {copiedCode ? <IoCheckmarkCircle size={14} className="text-[#a0a0a0]" /> : <IoCopy size={14} />}
                        {copiedCode ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                    <p className="text-xs text-[#808080] mt-2">
                      Share this code with your teammates so they can join your team
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm text-[#a0a0a0] mb-2">Team Members</h4>
                  <div className="bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg divide-y divide-[#1e1e1e]">
                    {userTeam.members.map(member => (
                      <div key={member.id} className="p-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#252525] p-2 rounded-full">
                            <IoPeople size={14} className="text-[#a0a0a0]" />
                          </div>
                          <span className="text-sm">{member.name}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#a0a0a0]">
                          {member.role === 'leader' ? 'Leader' : 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Link
                    href={`/student/classroom/${classroomId}/slots`}
                    className="bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <IoTime size={16} />
                    Book Review Slot
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Available Students */}
          {!userTeam && (
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Students in Classroom</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-800/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gray-800 rounded-full flex items-center justify-center">
                                  <IoPeople size={16} className="text-indigo-400" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium">{student.name}</div>
                                  <div className="text-sm text-gray-500">{student.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.has_team ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 flex items-center gap-1 w-fit">
                                  <IoCheckmarkCircle size={12} />
                                  In a team
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#a0a0a0]">
                                  No team
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-[#a0a0a0]">
                            No students found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Other Teams */}
          {teams.length > 0 && (
            <motion.div variants={itemVariants}>
              <h3 className="text-lg font-medium mb-3">All Teams</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-4 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-base">{team.name}</h4>
                        {team.project_title && (
                          <p className="text-sm text-[#a0a0a0] mt-1">{team.project_title}</p>
                        )}
                      </div>
                      <span className="text-xs bg-[#1a1a1a] text-[#a0a0a0] px-2 py-0.5 rounded-full">
                        {team.current_members}/{team.max_members} Members
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-[#808080] mb-2">Team Leader</div>
                      <div className="flex items-center gap-2 bg-[#1a1a1a] p-2 rounded-lg">
                        <div className="bg-[#252525] p-1.5 rounded-full">
                          <IoPeople size={14} className="text-[#a0a0a0]" />
                        </div>
                        <span className="text-sm">{team.members.find(m => m.role === 'leader')?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
