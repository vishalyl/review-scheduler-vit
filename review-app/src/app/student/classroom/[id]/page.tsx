'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { IoArrowBack, IoPeople, IoCalendar, IoDocument, IoTime, IoSchool, IoAdd } from 'react-icons/io5';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import CreateTeamForm from '@/components/student/create-team-form';
import JoinTeamForm from '@/components/student/join-team-form';

interface Classroom {
  id: number;
  name: string;
  faculty_name?: string;
  review_deadlines?: Record<string, string>;
  teams_count?: number;
  students_count?: number;
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  members_count?: number;
  is_member: boolean;
}

export default function ClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false);
  const [showJoinTeamForm, setShowJoinTeamForm] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchClassroomData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('User not found');
        }

        // Get user details from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('supabase_user_id', currentUser.id)
          .single();

        if (userError) {
          throw userError;
        }

        // Check if student is in this classroom
        const { data: membership, error: membershipError } = await supabase
          .from('classroom_students')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('student_id', userData.id)
          .single();

        if (membershipError) {
          if (membershipError.code === 'PGRST116') {
            router.push('/student/dashboard');
            throw new Error('You are not a member of this classroom');
          }
          throw membershipError;
        }

        // Get classroom details without using relationships
        const { data: classroomData, error: classroomError } = await supabase
          .from('classrooms')
          .select(`
            id,
            name,
            review_deadlines,
            faculty_id
          `)
          .eq('id', classroomId)
          .single();

        if (classroomError) {
          throw classroomError;
        }

        // Get faculty name separately - improved query to ensure we get the faculty name
        let facultyName = 'Unknown';
        if (classroomData.faculty_id) {
          // First try with the direct faculty_id
          const { data: facultyData } = await supabase
            .from('users')
            .select('name')
            .eq('id', classroomData.faculty_id)
            .single();
            
          if (facultyData && facultyData.name) {
            facultyName = facultyData.name;
          } else {
            // Try with a more comprehensive approach
            const { data: classroomWithFaculty } = await supabase
              .from('classrooms')
              .select('faculty_id')
              .eq('id', classroomId)
              .single();
              
            if (classroomWithFaculty && classroomWithFaculty.faculty_id) {
              const { data: facultyUser } = await supabase
                .from('users')
                .select('name')
                .eq('id', classroomWithFaculty.faculty_id)
                .single();
                
              if (facultyUser && facultyUser.name) {
                facultyName = facultyUser.name;
              }
            }
          }
        }
        
        // Get team count separately
        const { count: teamsCount } = await supabase
          .from('teams')
          .select('id', { count: 'exact', head: true })
          .eq('classroom_id', classroomId);
          
        // Get student count separately
        const { count: studentsCount } = await supabase
          .from('classroom_students')
          .select('id', { count: 'exact', head: true })
          .eq('classroom_id', classroomId);
        
        // Format classroom data
        const formattedClassroom = {
          id: classroomData.id,
          name: classroomData.name,
          faculty_name: facultyName,
          review_deadlines: classroomData.review_deadlines,
          teams_count: teamsCount || 0,
          students_count: studentsCount || 0
        };

        setClassroom(formattedClassroom);

        // Check if user is already in a team in this classroom - avoid nested relationships
        const { data: userTeamMemberships } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('student_id', userData.id);
          
        let userTeamData = null;
        
        // If user has team memberships, find one in this classroom
        if (userTeamMemberships && userTeamMemberships.length > 0) {
          const teamIds = userTeamMemberships.map(tm => tm.team_id);
          
          const { data: teamsInClassroom } = await supabase
            .from('teams')
            .select('id, name, project_title')
            .eq('classroom_id', classroomId)
            .in('id', teamIds);
            
          if (teamsInClassroom && teamsInClassroom.length > 0) {
            userTeamData = teamsInClassroom[0];
          }
        }

        if (userTeamData) {
          // Get member count for this team
          const { count: membersCount } = await supabase
            .from('team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', userTeamData.id);
            
          setUserTeam({
            id: userTeamData.id,
            name: userTeamData.name,
            project_title: userTeamData.project_title,
            members_count: membersCount || 0,
            is_member: true
          });
        }

        // Get teams in this classroom without using relationships
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, project_title')
          .eq('classroom_id', classroomId);

        if (teamError) {
          throw teamError;
        }

        // Check which teams the student is a member of
        const { data: memberTeams, error: memberTeamsError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('student_id', userData.id);

        if (memberTeamsError) {
          throw memberTeamsError;
        }

        const memberTeamIds = memberTeams?.map(mt => mt.team_id) || [];

        // Format team data with member counts fetched separately
        // This will display all teams in the classroom
        const formattedTeams = [];
        
        if (teamData && teamData.length > 0) {
          console.log(`Found ${teamData.length} teams in classroom ${classroomId}`);
          
          for (const team of teamData) {
            // Get member count for each team
            const { count: membersCount } = await supabase
              .from('team_members')
              .select('id', { count: 'exact', head: true })
              .eq('team_id', team.id);
            
            // Get team members to show more details
            const { data: teamMembers } = await supabase
              .from('team_members')
              .select(`
                student_id,
                role
              `)
              .eq('team_id', team.id);
            
            const memberCount = membersCount || (teamMembers ? teamMembers.length : 0);
            console.log(`Team ${team.name} has ${memberCount} members`);
              
            formattedTeams.push({
              id: team.id,
              name: team.name,
              project_title: team.project_title || '',
              members_count: memberCount,
              is_member: memberTeamIds.includes(team.id)
            });
          }
        }

        setTeams(formattedTeams);
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
  }, [classroomId, supabase, router]);

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-400">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link href="/student/dashboard" className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
            <IoArrowBack size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4">Classroom Not Found</h2>
          <p className="text-gray-300 mb-6">The classroom you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/student/dashboard" className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
            <IoArrowBack size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <Link href="/student/dashboard" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-2 mb-4">
              <IoArrowBack size={18} />
              Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{classroom.name}</h2>
                {classroom.faculty_name && (
                  <p className="text-gray-400">Faculty: {classroom.faculty_name}</p>
                )}
              </div>
              {!userTeam ? (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    onClick={() => setShowCreateTeamForm(true)}
                  >
                    <IoAdd size={18} />
                    Create Team
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    onClick={() => setShowJoinTeamForm(true)}
                  >
                    <IoPeople size={18} />
                    Join Team
                  </motion.button>
                </div>
              ) : (
                <Link href={`/student/team/${userTeam.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <IoPeople size={18} />
                    View Your Team
                  </motion.button>
                </Link>
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
                    router.push(`/student/team/${teamId}`);
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
                    router.push(`/student/team/${teamId}`);
                  }}
                  onCancel={() => setShowJoinTeamForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats overview */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-900/30 rounded-lg">
                  <IoPeople className="text-indigo-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Students</p>
                  <h3 className="text-2xl font-bold">{classroom.students_count}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-900/30 rounded-lg">
                  <IoPeople className="text-emerald-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Teams</p>
                  <h3 className="text-2xl font-bold">{classroom.teams_count}</h3>
                </div>
              </div>
            </div>
            
            <Link href={`/student/classroom/${classroomId}/slots`} className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-900/30 rounded-lg">
                  <IoTime className="text-purple-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Review Slots</p>
                  <h3 className="text-lg font-bold">Book a Slot</h3>
                </div>
              </div>
            </Link>
            
            {classroom.review_deadlines && Object.keys(classroom.review_deadlines).length > 0 && (
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-900/30 rounded-lg">
                    <IoCalendar className="text-amber-400" size={24} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Reviews</p>
                    <h3 className="text-2xl font-bold">{Object.keys(classroom.review_deadlines).length}</h3>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Review Deadlines */}
          {classroom.review_deadlines && Object.keys(classroom.review_deadlines).length > 0 && (
            <motion.div variants={itemVariants} className="mb-8">
              <h3 className="text-xl font-bold mb-4">Review Deadlines</h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Review</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Deadline</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(classroom.review_deadlines).map(([review, deadline], index, arr) => {
                        const deadlineDate = new Date(deadline);
                        const isUpcoming = deadlineDate > new Date();
                        const isPast = deadlineDate < new Date();
                        
                        return (
                          <tr key={review} className={index !== arr.length - 1 ? "border-b border-gray-800" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{review}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {deadlineDate.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                isUpcoming
                                  ? 'bg-emerald-900/30 text-emerald-400'
                                  : isPast
                                    ? 'bg-red-900/30 text-red-400'
                                    : 'bg-amber-900/30 text-amber-400'
                              }`}>
                                {isUpcoming ? 'Upcoming' : isPast ? 'Past' : 'Today'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Teams */}
          <motion.div variants={itemVariants} className="mb-8">
            <h3 className="text-xl font-bold mb-4">Teams</h3>
            
            {teams.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <IoPeople size={24} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-medium mb-2">No teams yet</h4>
                <p className="text-gray-400 mb-6">Create a team or join an existing one</p>
                <div className="flex gap-3 justify-center">
                  <button 
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    onClick={() => setShowCreateTeamForm(true)}
                  >
                    <IoAdd size={18} />
                    Create Team
                  </button>
                  <button 
                    className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    onClick={() => setShowJoinTeamForm(true)}
                  >
                    <IoPeople size={18} />
                    Join Team
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Link 
                    href={`/student/team/${team.id}`} 
                    key={team.id}
                    className={`bg-gray-900 border ${team.is_member ? 'border-indigo-800' : 'border-gray-800'} rounded-xl p-6 hover:bg-gray-800 transition-colors`}
                  >
                    <h4 className="font-bold text-lg mb-2">{team.name}</h4>
                    <p className="text-gray-400 text-sm mb-4">{team.project_title || 'No project title'}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded-full">
                        {team.members_count || 0} members
                      </span>
                      {team.is_member && (
                        <span className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded-full">
                          Your Team
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
