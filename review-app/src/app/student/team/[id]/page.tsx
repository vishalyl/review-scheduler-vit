'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { IoPeople, IoCalendar, IoDocument, IoTime, IoCopy, IoLogOut, IoCreate, IoAdd, IoChevronBack, IoCheckmarkCircle } from 'react-icons/io5';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  roll_number?: string;
  joined_at: string;
}

interface BookedSlot {
  id: string;
  day: string;
  date: string;
  start_time: string;
  end_time: string;
  review_stage: string;
  classroom_name: string;
  booking_id: string;
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  project_description?: string | null;
  project_tags?: string[] | null;
  invitation_code: string;
  max_members: number;
  classroom_id: number;
  classroom_name: string;
  members: TeamMember[];
  is_leader: boolean;
  booked_slots: BookedSlot[];
}

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [showEditProject, setShowEditProject] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const supabase = createClientComponentClient();

  // Initialize state values when team data is loaded
  useEffect(() => {
    if (team) {
      setProjectTitle(team.project_title || '');
      setProjectDescription(team.project_description || '');
      setProjectTags(team.project_tags || []);
    }
  }, [team]);

  useEffect(() => {
    const fetchTeamData = async () => {
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

        // Check if user is a member of this team
        const { data: membership, error: membershipError } = await supabase
          .from('team_members')
          .select('id, role')
          .eq('team_id', teamId)
          .eq('student_id', userData.id)
          .single();

        if (membershipError) {
          if (membershipError.code === 'PGRST116') {
            router.push('/student/dashboard');
            throw new Error('You are not a member of this team');
          }
          throw membershipError;
        }

        // Get team details
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            project_title,
            project_description,
            project_tags,
            invitation_code,
            max_members,
            classroom_id,
            classrooms(name)
          `)
          .eq('id', teamId)
          .single();

        if (teamError) {
          throw teamError;
        }

        // Get team members
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            role,
            joined_at,
            users:student_id(
              id,
              name,
              roll_number
            )
          `)
          .eq('team_id', teamId)
          .order('role', { ascending: false }) // Leaders first
          .order('joined_at', { ascending: true });

        if (membersError) {
          throw membersError;
        }

        // Get booked slots for this team
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            slot_id,
            created_at,
            slots(
              id,
              day,
              slot_date,
              start_time,
              end_time,
              review_stage,
              classroom_id
            )
          `)
          .eq('team_id', teamId);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        }

        // Get classroom names for the booked slots
        const bookedSlotsWithClassrooms: BookedSlot[] = [];
        if (bookings && bookings.length > 0) {
          for (const booking of bookings) {
            // TypeScript fix - ensure slots exists and has the expected properties
            const slots = booking.slots as any;
            if (slots && slots.classroom_id) {
              const { data: classroomData } = await supabase
                .from('classrooms')
                .select('name')
                .eq('id', slots.classroom_id)
                .single();

              const classroomName = classroomData ? classroomData.name : 'Unknown Classroom';

              // Format the date
              const slotDate = slots.slot_date ? new Date(slots.slot_date) : null;
              const formattedDate = slotDate ?
                new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(slotDate) :
                slots.day;

              bookedSlotsWithClassrooms.push({
                id: slots.id,
                day: slots.day,
                date: formattedDate,
                start_time: slots.start_time,
                end_time: slots.end_time,
                review_stage: slots.review_stage,
                classroom_name: classroomName,
                booking_id: booking.id
              });
            }
          }
        }

        // Sort booked slots by date/time
        bookedSlotsWithClassrooms.sort((a, b) => {
          // First compare by date if available
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          }
          // Then by day of week
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          // Then by start time
          return a.start_time.localeCompare(b.start_time);
        });

        setBookedSlots(bookedSlotsWithClassrooms);

        // Format team data
        const formattedTeam = {
          id: teamData.id,
          name: teamData.name,
          project_title: teamData.project_title || '',
          project_description: teamData.project_description || null,
          project_tags: teamData.project_tags || [],
          invitation_code: teamData.invitation_code,
          max_members: teamData.max_members,
          classroom_id: teamData.classroom_id,
          classroom_name: teamData.classrooms && typeof teamData.classrooms === 'object' ? teamData.classrooms.name : 'Unknown Classroom',
          members: Array.isArray(membersData) ? membersData.map((member: any) => ({
            id: member.users.id,
            name: member.users.name,
            role: member.role,
            roll_number: member.users.roll_number,
            joined_at: member.joined_at
          })) : [],
          is_leader: membership.role === 'leader',
          booked_slots: bookedSlotsWithClassrooms
        };

        setTeam(formattedTeam);
      } catch (error: any) {
        console.error('Error fetching team data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeamData();
    }
  }, [teamId, supabase, router]);

  const handleLeaveTeam = async () => {
    try {
      if (!confirmLeave) {
        setConfirmLeave(true);
        return;
      }

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

      // Check if user is the team leader
      if (team?.is_leader) {
        // If there are other members, promote the next member to leader
        if (team.members.length > 1) {
          const nextLeader = team.members.find(member => member.id !== userData?.id);

          if (nextLeader) {
            // Promote next member to leader
            const { error: promoteError } = await supabase
              .from('team_members')
              .update({ role: 'leader' })
              .eq('team_id', teamId)
              .eq('student_id', nextLeader.id);

            if (promoteError) {
              throw promoteError;
            }
          }
        } else {
          // If user is the only member, delete the team
          const { error: deleteTeamError } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId);

          if (deleteTeamError) {
            throw deleteTeamError;
          }

          if (team) {
            router.push(`/student/classroom/${team.classroom_id}`);
          } else {
            router.push('/student/dashboard');
          }
          return;
        }
      }

      // Remove user from team
      const { error: leaveError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('student_id', userData?.id);

      if (leaveError) {
        throw leaveError;
      }

      if (team) {
        router.push(`/student/classroom/${team.classroom_id}`);
      } else {
        router.push('/student/dashboard');
      }
    } catch (error: any) {
      console.error('Error leaving team:', error);
      alert(`Failed to leave team: ${error.message}`);
      setConfirmLeave(false);
    }
  };

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
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 max-w-md">
          <h2 className="text-lg font-medium mb-3 text-red-400">Error</h2>
          <p className="text-[#a0a0a0] text-sm mb-6">{error}</p>
          <Link
            href="/student/dashboard"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md inline-flex items-center gap-2 text-sm font-medium shadow-md shadow-blue-500/10"
          >
            <IoChevronBack size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 max-w-md">
          <h2 className="text-lg font-medium mb-3">Team Not Found</h2>
          <p className="text-[#a0a0a0] text-sm mb-6">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href="/student/dashboard"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md inline-flex items-center gap-2 text-sm font-medium shadow-md shadow-blue-500/10"
          >
            <IoChevronBack size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e1e]">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/student/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <h1 className="text-lg font-medium">Review Scheduler</h1>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { }}
              className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200 relative group"
            >
              <span className="absolute -bottom-8 right-0 bg-[#252525] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">View Profile</span>
              <IoPeople size={14} className="text-[#a0a0a0]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <Link
              href="/student/dashboard"
              className="text-[#a0a0a0] hover:text-white inline-flex items-center gap-2 mb-4 text-sm transition-colors duration-200"
            >
              <IoChevronBack size={16} />
              Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-medium">{team.name}</h2>
                <p className="text-[#a0a0a0] text-sm mt-1">Classroom: {team.classroom_name}</p>
              </div>
              <motion.button
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#1e1e1e] hover:bg-[#252525] text-[#a0a0a0] hover:text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors duration-200"
                onClick={handleLeaveTeam}
              >
                <IoLogOut size={18} />
                {confirmLeave ? 'Confirm Leave' : 'Leave Team'}
              </motion.button>
            </div>
          </motion.div>

          {/* Team Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Team Information */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-lg font-medium">Team Information</h3>
                    <p className="text-[#a0a0a0] text-xs mt-1">Details about your team</p>
                  </div>
                  {team.is_leader && (
                    <button
                      onClick={() => setShowEditProject(true)}
                      className="text-xs px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-white rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <IoCreate size={12} />
                      Edit Project
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Project Overview Card */}
                  <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-[#272741] p-5 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5c46f5]/20">
                        <IoDocument size={16} className="text-[#5c46f5]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{team.project_title || 'Untitled Project'}</h3>
                        <p className="text-[#a0a0a0] text-xs mt-0.5">Team: {team.name}</p>
                      </div>
                    </div>

                    {/* Project Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-[#0f0f1a] rounded-md p-3">
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Team Size</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{team.members.length} / {team.max_members}</p>
                          <IoPeople size={14} className="text-[#5c46f5]" />
                        </div>
                      </div>
                      <div className="bg-[#0f0f1a] rounded-md p-3">
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Reviews</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{team.booked_slots.length}</p>
                          <IoCalendar size={14} className="text-[#5c46f5]" />
                        </div>
                      </div>
                      <div className="bg-[#0f0f1a] rounded-md p-3">
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Classroom</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate max-w-[80px]">{team.classroom_name}</p>
                          <IoPeople size={14} className="text-[#5c46f5]" />
                        </div>
                      </div>
                    </div>

                    {/* Project Description */}
                    {team.project_description ? (
                      <div className="bg-[#0f0f1a] rounded-md p-3 mb-3">
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Project Description</p>
                        <p className="text-xs text-[#e0e0e0]">{team.project_description}</p>
                      </div>
                    ) : team.is_leader ? (
                      <button
                        onClick={() => setShowEditProject(true)}
                        className="w-full bg-[#0f0f1a] rounded-md p-3 mb-3 text-left hover:bg-[#141428] transition-colors"
                      >
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Project Description</p>
                        <p className="text-xs text-[#5c46f5] flex items-center gap-1">
                          <IoAdd size={10} />
                          Add a project description
                        </p>
                      </button>
                    ) : (
                      <div className="bg-[#0f0f1a] rounded-md p-3 mb-3">
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Project Description</p>
                        <p className="text-xs text-[#a0a0a0] italic">No description provided yet</p>
                      </div>
                    )}

                    {/* Project Tags */}
                    <div className="flex flex-wrap gap-2">
                      {team.project_tags && team.project_tags.length > 0 ? (
                        team.project_tags.map((tag: string, index: number) => (
                          <span key={index} className="bg-[#5c46f5]/20 text-[#5c46f5] px-2 py-0.5 rounded-full text-[10px]">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="bg-[#0f0f1a] text-[#a0a0a0] px-2 py-0.5 rounded-full text-[10px]">
                          No tags
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team Access */}
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h4 className="text-xs font-medium mb-3">Team Access</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#0f0f0f] border border-[#252525] rounded-md px-3 py-2">
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Invitation Code</p>
                        <p className="font-mono text-sm">{team.invitation_code}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(team.invitation_code);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }}
                        className="bg-[#252525] hover:bg-[#303030] text-white h-full px-3 rounded-md transition-colors flex items-center gap-2"
                      >
                        {codeCopied ? (
                          <>
                            <IoCheckmarkCircle size={14} className="text-green-400" />
                            <span className="text-xs">Copied!</span>
                          </>
                        ) : (
                          <>
                            <IoCopy size={14} />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Your Status */}
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h4 className="text-xs font-medium mb-3">Your Status</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Role</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${team.is_leader ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {team.is_leader ? 'Team Leader' : 'Team Member'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Joined</p>
                        <p className="text-xs">
                          {team.members.find(m => m.role === (team.is_leader ? 'leader' : 'member'))?.joined_at ?
                            new Date(team.members.find(m => m.role === (team.is_leader ? 'leader' : 'member'))?.joined_at || '').toLocaleDateString() :
                            'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Team Members */}
            <motion.div variants={itemVariants}>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-lg font-medium">Team Members</h3>
                    <p className="text-[#a0a0a0] text-xs mt-1">People in your team</p>
                  </div>
                  {team.is_leader && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">
                        Team Leader
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Team Members List */}
                  <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                    <div className="bg-[#0f0f0f] px-4 py-2 border-b border-[#252525] flex items-center justify-between">
                      <h4 className="text-xs font-medium">Members ({team.members.length}/{team.max_members})</h4>
                      {team.members.length < team.max_members && (
                        <button
                          onClick={() => navigator.clipboard.writeText(team.invitation_code)}
                          className="text-[10px] text-[#a0a0a0] hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <IoCopy size={10} />
                          Copy Invite Code
                        </button>
                      )}
                    </div>

                    {team.members.map((member, index) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-4 ${index !== team.members.length - 1 ? 'border-b border-[#252525]' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${member.role === 'leader' ? 'bg-purple-500/20' : 'bg-blue-500/20'} flex items-center justify-center text-sm font-medium`}>
                            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{member.name}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${member.role === 'leader' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                {member.role === 'leader' ? 'Leader' : 'Member'}
                              </span>
                            </div>
                            {member.roll_number && (
                              <p className="text-[#a0a0a0] text-xs">{member.roll_number}</p>
                            )}
                          </div>
                        </div>

                        {/* Role Management (Only for team leader) */}
                        {team.is_leader && member.id !== team.members.find(m => m.role === 'leader')?.id && (
                          <div className="flex items-center gap-2">
                            <button
                              className="text-xs px-3 py-1 bg-[#252525] hover:bg-[#303030] text-[#a0a0a0] hover:text-white rounded-md transition-colors"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to promote ${member.name} to team leader? You will become a regular member.`)) {
                                  try {
                                    // Get current user
                                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                                    if (!currentUser) throw new Error('User not found');

                                    // Get user details
                                    const { data: userData } = await supabase
                                      .from('users')
                                      .select('id')
                                      .eq('supabase_user_id', currentUser.id)
                                      .single();

                                    if (!userData) {
                                      throw new Error('User data not found');
                                    }

                                    // Update roles in a transaction
                                    await supabase.rpc('transfer_team_leadership', {
                                      p_team_id: team.id,
                                      p_old_leader_id: userData.id,
                                      p_new_leader_id: member.id
                                    });

                                    // Refresh page
                                    window.location.reload();
                                  } catch (error) {
                                    console.error('Error transferring leadership:', error);
                                    alert('Failed to transfer leadership. Please try again.');
                                  }
                                }
                              }}
                            >
                              Promote to Leader
                            </button>
                            <button
                              className="text-xs px-3 py-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-md transition-colors"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
                                  try {
                                    // Remove member
                                    const { error } = await supabase
                                      .from('team_members')
                                      .delete()
                                      .eq('team_id', team.id)
                                      .eq('student_id', member.id);

                                    if (error) throw error;

                                    // Refresh page
                                    window.location.reload();
                                  } catch (error) {
                                    console.error('Error removing member:', error);
                                    alert('Failed to remove member. Please try again.');
                                  }
                                }
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Invitation Section */}
                  {team.members.length < team.max_members && (
                    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#252525]">
                      <h4 className="text-xs font-medium mb-2">Invite New Members</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 bg-[#0f0f0f] border border-[#252525] rounded-md px-3 py-2">
                          <p className="font-mono text-sm">{team.invitation_code}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(team.invitation_code);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                          className="bg-[#252525] hover:bg-[#303030] text-white px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                        >
                          {codeCopied ? (
                            <>
                              <IoCheckmarkCircle size={14} className="text-green-400" />
                              <span className="text-xs">Copied!</span>
                            </>
                          ) : (
                            <>
                              <IoCopy size={14} />
                              <span className="text-xs">Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[#a0a0a0] text-xs">
                        Share this code with your classmates to let them join your team.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Upcoming Reviews */}
          <motion.div variants={itemVariants}>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-lg font-medium">Upcoming Reviews</h3>
                  <p className="text-[#a0a0a0] text-xs mt-1">Scheduled review sessions</p>
                </div>
              </div>

              {team?.booked_slots && team.booked_slots.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#252525]">
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Time</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Review Stage</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Classroom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.booked_slots.map((slot, index) => (
                        <tr key={slot.id} className={index !== team.booked_slots.length - 1 ? "border-b border-[#1e1e1e]" : ""}>
                          <td className="px-5 py-3 whitespace-nowrap text-xs font-medium">
                            {slot.date || slot.day}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">
                            {slot.start_time} - {slot.end_time}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-400">
                              {slot.review_stage}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">
                            {slot.classroom_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-[#1e1e1e] rounded-full flex items-center justify-center mx-auto mb-3">
                    <IoCalendar size={18} className="text-[#a0a0a0]" />
                  </div>
                  <h4 className="text-sm font-medium mb-1">No upcoming reviews</h4>
                  <p className="text-[#a0a0a0] text-xs">Your scheduled reviews will appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Project Edit Modal */}
      {showEditProject && team && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Edit Project Details</h3>
              <button
                onClick={() => setShowEditProject(false)}
                className="text-[#a0a0a0] hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                console.log('=== UPDATE DEBUG ===');
                console.log('projectTitle state:', projectTitle);
                console.log('projectDescription state:', projectDescription);
                console.log('projectTags state:', projectTags);
                console.log('team.project_title:', team.project_title);
                console.log('team.project_description:', team.project_description);
                console.log('team.project_tags:', team.project_tags);

                const updateData = {
                  project_title: projectTitle !== null && projectTitle !== undefined ? projectTitle : team.project_title,
                  project_description: projectDescription !== null && projectDescription !== undefined ? projectDescription : team.project_description,
                  project_tags: projectTags.length > 0 ? projectTags : (team.project_tags || [])
                };

                console.log('Sending update:', updateData);

                const { data, error } = await supabase
                  .from('teams')
                  .update(updateData)
                  .eq('id', team.id)
                  .select();

                console.log('Update response:', { data, error });

                if (error) throw error;

                console.log('Update successful, reloading page...');
                // Refresh page
                window.location.reload();
              } catch (error) {
                console.error('Error updating project:', error);
                alert('Failed to update project details. Please try again.');
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="projectTitle" className="block text-sm font-medium text-[#a0a0a0] mb-1">
                    Project Title
                  </label>
                  <input
                    id="projectTitle"
                    type="text"
                    value={projectTitle || team.project_title || ''}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all"
                    placeholder="Enter project title"
                  />
                </div>

                <div>
                  <label htmlFor="projectDescription" className="block text-sm font-medium text-[#a0a0a0] mb-1">
                    Project Description
                  </label>
                  <textarea
                    id="projectDescription"
                    value={projectDescription || team.project_description || ''}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all min-h-[100px]"
                    placeholder="Describe your project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
                    Project Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(projectTags.length > 0 ? projectTags : (team.project_tags || [])).map((tag, index) => (
                      <div key={index} className="bg-[#252525] text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = [...(projectTags.length > 0 ? projectTags : (team.project_tags || []))];
                            newTags.splice(index, 1);
                            setProjectTags(newTags);
                          }}
                          className="text-[#a0a0a0] hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="flex-1 bg-[#1a1a1a] border border-[#252525] rounded-l-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all"
                      placeholder="Add a tag"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTag.trim()) {
                          setProjectTags([...(projectTags.length > 0 ? projectTags : (team.project_tags || [])), newTag.trim()]);
                          setNewTag('');
                        }
                      }}
                      className="bg-[#252525] hover:bg-[#303030] text-white px-3 py-2 rounded-r-md transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditProject(false)}
                  className="px-4 py-2 text-[#a0a0a0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
