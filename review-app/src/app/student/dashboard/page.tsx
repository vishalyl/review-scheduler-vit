'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import './custom-scrollbar.css';
import './onboarding.css';
import { IoAdd, IoCalendar, IoPeople, IoDocument, IoTime, IoClose, IoChevronForward } from 'react-icons/io5';
import Link from 'next/link';
import LogoutButton from '@/components/auth/logout-button';
import EnhancedJoinClassroomModal from '@/components/student/enhanced-join-classroom-modal';
import CreateTeamForm from '@/components/student/create-team-form';
import JoinTeamForm from '@/components/student/join-team-form';
import ClassroomCard from '@/components/student/classroom-card';
import ClassroomDetailsModal from '@/components/shared/classroom-details-modal';
import ActivityFeed from '@/components/shared/activity-feed';
import OnboardingController from '@/components/onboarding/onboarding-controller';
import { useOnboarding } from '@/components/onboarding/onboarding-context';

interface Classroom {
  id: number;
  name: string;
  faculty_name?: string;
  review_deadlines?: Record<string, string>;
  teams_count?: number;
  students_count?: number;
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false);
  const [showJoinTeamForm, setShowJoinTeamForm] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null);
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateTeamFormWithClassroom, setShowCreateTeamFormWithClassroom] = useState(false);
  const [showJoinTeamFormWithClassroom, setShowJoinTeamFormWithClassroom] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const supabase = createClientComponentClient();
  
  // Get onboarding context
  const { 
    hasJoinedClassroom, 
    hasJoinedTeam, 
    isOnboardingComplete,
    markClassroomJoined,
    markTeamJoined
  } = useOnboarding();

  // Function to fetch available slots for the student
  const fetchAvailableSlots = async () => {
    try {
      setSlotsLoading(true);
      const response = await fetch('/api/student/slots');
      
      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }
      
      const { data } = await response.json();
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };
  
  // Function to book a slot
  const bookSlot = async (slotId: string, reviewStage: string) => {
    try {
      // Get the student's team ID
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('student_id', user.id);
      
      if (!teamMembers || teamMembers.length === 0) {
        alert('You need to be part of a team to book a slot');
        return;
      }
      
      const teamId = teamMembers[0].team_id;
      
      // Check if the team already has a booking for this review stage
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          slot_id,
          slot:slots!slot_id(review_stage)
        `)
        .eq('team_id', teamId);
      
      const hasBookingForStage = existingBookings?.some(
        (booking: any) => booking.slot?.review_stage === reviewStage
      );
      
      if (hasBookingForStage) {
        alert(`Your team already has a booking for ${reviewStage}. You can only have one booking per review stage.`);
        return;
      }
      
      // Create a booking
      const { error } = await supabase
        .from('bookings')
        .insert({
          slot_id: slotId,
          team_id: teamId,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Booking error:', error);
        throw new Error('Failed to create booking. Please try again.');
      }
      
      alert('Slot booked successfully!');
      fetchAvailableSlots(); // Refresh the slots
    } catch (error) {
      console.error('Error booking slot:', error);
      alert('Failed to book slot. Please try again.');
    }
  };

  const fetchData = async () => {
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
        .select('*')
        .eq('supabase_user_id', currentUser.id)
        .single();

      if (userError) {
        throw userError;
      }

      setUser(userData);

      // Get student's classrooms
      const { data: classroomStudents, error: classroomStudentsError } = await supabase
        .from('classroom_students')
        .select('classroom_id')
        .eq('student_id', userData.id);

      if (classroomStudentsError) {
        throw classroomStudentsError;
      }

      if (classroomStudents && classroomStudents.length > 0) {
        const classroomIds = classroomStudents.map(cs => cs.classroom_id);
        
        // Get classroom details with faculty information
        const { data: classroomData, error: classroomError } = await supabase
          .from('classrooms')
          .select(`
            id,
            name,
            review_deadlines,
            faculty_id
          `)
          .in('id', classroomIds);
          
        console.log('Raw classroom data:', classroomData);
        
        // Fetch available slots
        fetchAvailableSlots();

        if (classroomError) {
          console.error('Error fetching classrooms:', classroomError);
          throw classroomError;
        }

        // Format classroom data
        const formattedClassrooms = [];
        
        for (const classroom of classroomData) {
          console.log('Processing classroom:', classroom);
          
          // Get faculty name using our dedicated API endpoint
          let facultyName = null;
          
          if (classroom.faculty_id) {
            try {
              // Call the API endpoint to get faculty name
              const response = await fetch('/api/faculty/get-faculty-name', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  facultyId: classroom.faculty_id
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                facultyName = data.name;
                console.log(`Found faculty name for classroom ${classroom.name}:`, facultyName);
              } else {
                console.error(`Error finding faculty for classroom ${classroom.name}:`, await response.text());
              }
            } catch (error) {
              console.error('Error fetching faculty information:', error);
            }
          } else {
            console.log(`No faculty_id found for classroom ${classroom.name}`);
          }
          
          // Count teams in this classroom - use service client to bypass RLS
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id')
            .eq('classroom_id', classroom.id);
            
          const teamsCount = teamsData?.length || 0;
          console.log(`Found ${teamsCount} teams for classroom ${classroom.id}`);
            
          // Count students in this classroom - direct count
          const { data: studentsData, error: studentsError } = await supabase
            .from('classroom_students')
            .select('student_id')
            .eq('classroom_id', classroom.id);
          
          const studentsCount = studentsData?.length || 0;
          console.log(`Found ${studentsCount} students for classroom ${classroom.id}`);
          
          formattedClassrooms.push({
            id: classroom.id,
            name: classroom.name,
            faculty_name: facultyName || 'Faculty Not Found',
            review_deadlines: classroom.review_deadlines,
            teams_count: teamsCount,
            students_count: studentsCount
          });
        }

        console.log('Formatted classrooms:', formattedClassrooms);
        setClassrooms(formattedClassrooms);
      } else {
        console.log('No classrooms found');
        setClassrooms([]);
      }

      // Get student teams
      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team:team_id(
            id,
            name,
            project_title,
            classroom_id,
            classroom:classroom_id(name)
          ),
          role,
          student_id
        `)
        .eq('student_id', userData.id);

      if (teamError) {
        throw teamError;
      }

      // Format team data
      const formattedTeams = [];
      
      if (teamData && teamData.length > 0) {
        // Get unique team IDs safely
        const uniqueTeamIds = new Set<number>();
        teamData.forEach(item => {
          if (item.team && item.team.id) {
            uniqueTeamIds.add(item.team.id);
          }
        });
        const teamIds = Array.from(uniqueTeamIds);
        
        // For each team, get member count and details
        for (const teamId of teamIds) {
          const teamItem = teamData.find(item => item.team && item.team.id === teamId);
          
          if (!teamItem || !teamItem.team) continue;
          
          if (teamItem) {
            try {
              // Get member count for this team - use a direct count query
              const { count, error: membersCountError } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamId);
                
              if (membersCountError) {
                console.error('Error getting member count:', membersCountError);
              }
              
              // As a backup, get the actual members to count them
              const { data: teamMembers, error: teamMembersError } = await supabase
                .from('team_members')
                .select('*')
                .eq('team_id', teamId);
                
              // Use the count from the query or fall back to the length of the members array
              const memberCount = count !== null ? count : (teamMembers ? teamMembers.length : 0);
              
              console.log(`Team ${teamId} has ${memberCount} members`);
                
              formattedTeams.push({
                id: teamItem.team.id,
                name: teamItem.team.name,
                project_title: teamItem.team.project_title,
                classroom_id: teamItem.team.classroom_id,
                classroom_name: teamItem.team.classroom?.name,
                role: teamItem.role,
                members_count: memberCount
              });
            } catch (error) {
              console.error('Error processing team:', error);
            }
          }
        }
        
        setTeams(formattedTeams);
        
        // Get upcoming reviews
        const { data: reviews, error: reviewsError } = await supabase
          .from('bookings')
          .select(`
            id,
            team_id,
            slot:slot_id(
              id,
              date,
              time_start,
              time_end,
              faculty_id,
              faculty:faculty_id(name),
              review_stage
            )
          `)
          .in('team_id', teamIds)
          .order('slot.date', { ascending: true });
        
        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
        }
        
        setUpcomingReviews(reviews || []);
        
        // Update onboarding status based on data
        if (classrooms.length > 0 && !hasJoinedClassroom) {
          markClassroomJoined();
        }
        
        if (formattedTeams.length > 0 && !hasJoinedTeam) {
          markTeamJoined();
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the date for a day of the week
  const getDayDate = (day: string) => {
    const days = {
      'MON': 1,
      'TUE': 2,
      'WED': 3,
      'THU': 4,
      'FRI': 5,
      'SAT': 6,
      'SUN': 0
    };
    
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const targetDay = days[day as keyof typeof days];
    
    // Calculate days to add
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7; // If target day is today or earlier, go to next week
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

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

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e1e]">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <Image 
              src="/images/Review Scheduler.png" 
              alt="Review Scheduler Logo" 
              width={100} 
              height={60} 
              className="rounded-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200 relative group"
            >
              <span className="absolute -bottom-8 right-0 bg-[#252525] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">View Profile</span>
              <IoPeople size={14} className="text-[#a0a0a0]" />
            </button>
            <LogoutButton variant="minimal" />
          </div>
        </div>
      </header>

      {/* Onboarding Controller */}
      <OnboardingController />
      
      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-medium">Hello, {user?.name?.split(' ')[0] || 'Student'} <span className="text-blue-400">•</span></h2>
              <p className="text-[#a0a0a0] text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex gap-3">
              {/* Buttons removed */}
            </div>
          </motion.div>

          {/* Stats overview */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#141414] p-5 rounded-lg border border-[#1e1e1e] hover:border-[#252525] transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider font-medium mb-1">Classrooms</p>
                  <h3 className="text-xl font-medium">{classrooms.length}</h3>
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500/10">
                  <IoPeople className="text-blue-400" size={18} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
                <p className="text-[#a0a0a0] text-xs">
                  {classrooms.length > 0 ? 
                    (classrooms.length + " active " + (classrooms.length === 1 ? 'classroom' : 'classrooms')) : 
                    'No classrooms joined'}
                </p>
              </div>
            </div>
            
            <div className="bg-[#141414] p-5 rounded-lg border border-[#1e1e1e] hover:border-[#252525] transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider font-medium mb-1">Teams</p>
                  <h3 className="text-xl font-medium">{teams.length}</h3>
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-500/10">
                  <IoPeople className="text-purple-400" size={18} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
                <p className="text-[#a0a0a0] text-xs">
                  {teams.length > 0 ? 
                    (teams.length + " active " + (teams.length === 1 ? 'team' : 'teams')) : 
                    'No teams joined'}
                </p>
              </div>
            </div>
            
            <div className="bg-[#141414] p-5 rounded-lg border border-[#1e1e1e] hover:border-[#252525] transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider font-medium mb-1">Reviews</p>
                  <h3 className="text-xl font-medium">{upcomingReviews.length}</h3>
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500/10">
                  <IoCalendar className="text-green-400" size={18} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
                <p className="text-[#a0a0a0] text-xs">
                  {upcomingReviews.length > 0 ? 
                    (upcomingReviews.length + " upcoming " + (upcomingReviews.length === 1 ? 'review' : 'reviews')) : 
                    'No upcoming reviews'}
                </p>
              </div>
            </div>
            
            <div className="bg-[#141414] p-5 rounded-lg border border-[#1e1e1e] hover:border-[#252525] transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider font-medium mb-1">Student ID</p>
                  <h3 className="text-xl font-medium truncate max-w-[120px]">{user?.roll_number || 'Not set'}</h3>
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/10">
                  <IoTime className="text-amber-400" size={18} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
                <p className="text-[#a0a0a0] text-xs">
                  {user?.roll_number ? 'Student ID verified' : 'ID not set'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Available Review Slots */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-medium">Available Review Slots</h3>
                <p className="text-[#a0a0a0] text-xs mt-1">Book slots for your upcoming project reviews</p>
              </div>
              <Link 
                href="/student/slots" 
                className="text-xs text-white px-3 py-1.5 rounded-md bg-[#5c46f5] hover:bg-[#4c38e6] transition-colors duration-200 flex items-center gap-1"
              >
                View all
                <IoChevronForward size={12} />
              </Link>
            </div>
            
            <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-[#272741] p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5c46f5]/20">
                  <IoCalendar size={16} className="text-[#5c46f5]" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Book Your Review Slots</h3>
                  <p className="text-[#a0a0a0] text-xs mt-0.5">Select a time slot for your team's project review</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="bg-[#5c46f5]/20 text-[#5c46f5] px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <IoTime size={12} /> Schedule Reviews
                </span>
                <span className="bg-[#5c46f5]/20 text-[#5c46f5] px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <IoCalendar size={12} /> View Details
                </span>
              </div>
              
              {classrooms.length === 0 ? (
                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#252525] text-center">
                  <p className="text-[#a0a0a0] text-sm mb-3">You haven't joined any classrooms yet</p>
                  <Link
                    href="/student/slots"
                    className="bg-gradient-to-r from-[#5c46f5] to-[#4c38e6] text-white px-4 py-2 rounded-md inline-flex items-center gap-2 text-xs font-medium shadow-md shadow-[#5c46f5]/10 hover:shadow-[#5c46f5]/20 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    View Available Slots
                    <IoChevronForward size={12} />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classrooms.map((classroom) => (
                    <Link 
                      key={classroom.id}
                      href="/student/slots"
                      className="bg-[#1a1a1a] rounded-lg p-4 border border-[#252525] hover:border-[#5c46f5]/30 transition-all duration-200 group hover:shadow-md hover:shadow-[#5c46f5]/10"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{classroom.name}</h4>
                        <span className="text-[10px] bg-[#5c46f5]/20 text-[#5c46f5] px-2 py-0.5 rounded-full group-hover:bg-[#5c46f5]/30 transition-colors duration-200">
                          View Slots
                        </span>
                      </div>
                      <p className="text-[#a0a0a0] text-xs mb-3">
                        Faculty: {classroom.faculty_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <IoTime size={14} className="text-[#5c46f5]" />
                        <span>Book your review slot now</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Team Management Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-medium">Team Management</h3>
                <p className="text-[#a0a0a0] text-xs mt-1">Create or join teams for your projects</p>
              </div>
            </div>
            
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1a1a1a] rounded-lg p-5 border border-[#252525] hover:border-blue-500/30 transition-colors duration-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <IoPeople size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-medium">Create a New Team</h4>
                      <p className="text-[#a0a0a0] text-xs mt-1">Start a new team and invite classmates</p>
                    </div>
                  </div>
                  <p className="text-[#a0a0a0] text-xs mb-4">Create a team for your project and become the team leader. You'll get an invitation code to share with your classmates.</p>
                  <button
                    onClick={() => setShowCreateTeamForm(true)}
                    disabled={classrooms.length === 0}
                    className={`w-full py-2 rounded-md text-sm font-medium transition-colors duration-200 ${classrooms.length === 0 ? 'bg-[#252525] text-[#505050] cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    {classrooms.length === 0 ? 'Join a classroom first' : 'Create Team'}
                  </button>
                </div>
                
                <div className="bg-[#1a1a1a] rounded-lg p-5 border border-[#252525] hover:border-indigo-500/30 transition-colors duration-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <IoPeople size={20} className="text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-medium">Join Existing Team</h4>
                      <p className="text-[#a0a0a0] text-xs mt-1">Join a team using an invitation code</p>
                    </div>
                  </div>
                  <p className="text-[#a0a0a0] text-xs mb-4">Enter the invitation code shared by your team leader to join their team and collaborate on projects.</p>
                  <button
                    onClick={() => setShowJoinTeamForm(true)}
                    disabled={classrooms.length === 0}
                    className={`w-full py-2 rounded-md text-sm font-medium transition-colors duration-200 ${classrooms.length === 0 ? 'bg-[#252525] text-[#505050] cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >
                    {classrooms.length === 0 ? 'Join a classroom first' : 'Join Team'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Join Classroom Modal */}
          <AnimatePresence>
            {showJoinForm && (
              <EnhancedJoinClassroomModal
                onSuccess={() => {
                  setShowJoinForm(false);
                  fetchData();
                }}
                onClose={() => setShowJoinForm(false)}
              />
            )}
          </AnimatePresence>

          {/* Classrooms */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-medium">Your Classrooms</h3>
                <p className="text-[#a0a0a0] text-xs mt-1">Manage your enrolled classrooms</p>
              </div>
              <button
                onClick={() => setShowJoinForm(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-1.5"
              >
                <IoAdd size={12} />
                Join Classroom
              </button>
            </div>
            
            {classrooms.length === 0 ? (
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 text-center">
                <div className="mb-4 mx-auto w-12 h-12 bg-[#1e1e1e] rounded-full flex items-center justify-center">
                  <IoPeople size={20} className="text-[#a0a0a0]" />
                </div>
                <h4 className="text-base font-medium mb-2">No classrooms joined yet</h4>
                <p className="text-[#a0a0a0] text-sm mb-4">Join a classroom to start creating or joining teams</p>
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <IoAdd size={14} />
                  Join Classroom
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {classrooms.map((classroom) => (
                  <div 
                    key={classroom.id} 
                    className="bg-[#141414] border border-[#1e1e1e] hover:border-[#252525] rounded-lg p-5 transition-colors duration-200 cursor-pointer group" 
                    onClick={() => {
                      setSelectedClassroom(classroom);
                      setShowClassroomDetailsModal(true);
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-sm">{classroom.name}</h4>
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/10">
                        <IoPeople size={14} className="text-blue-400" />
                      </div>
                    </div>
                    <p className="text-[#a0a0a0] text-xs mb-4">{classroom.faculty_name || 'Unknown Faculty'}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-[#1e1e1e]">
                      <span className="text-[10px] bg-[#1e1e1e] px-2 py-0.5 rounded-full text-[#a0a0a0]">
                        {classroom.teams_count || 0} team{classroom.teams_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full group-hover:bg-blue-500/20 transition-colors duration-200">
                        {classroom.students_count || 0} student{classroom.students_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Teams */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-medium">Your Teams</h3>
                <p className="text-[#a0a0a0] text-xs mt-1">Teams you're currently part of</p>
              </div>
              {/* Join Team button removed */}
            </div>
            
            {teams.length === 0 ? (
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 text-center">
                <div className="mb-4 mx-auto w-12 h-12 bg-[#1e1e1e] rounded-full flex items-center justify-center">
                  <IoPeople size={20} className="text-[#a0a0a0]" />
                </div>
                <h4 className="text-base font-medium mb-2">No teams yet</h4>
                <p className="text-[#a0a0a0] text-sm mb-4">Join a team or create one to start scheduling reviews</p>
                {/* Join Team button removed */}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Link 
                    href={`/student/team/${team.id}`} 
                    key={team.id}
                    className="bg-[#141414] border border-[#1e1e1e] hover:border-[#252525] rounded-lg p-5 transition-colors duration-200 group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-sm">{team.name}</h4>
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500/10">
                        <IoPeople size={14} className="text-purple-400" />
                      </div>
                    </div>
                    <p className="text-[#a0a0a0] text-xs mb-4">{team.project_title || 'No project title set'}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-[#1e1e1e]">
                      <span className="text-[10px] bg-[#1e1e1e] px-2 py-0.5 rounded-full text-[#a0a0a0]">
                        {team.members_count || 0} member{team.members_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full group-hover:bg-purple-500/20 transition-colors duration-200">
                        {team.classroom_name || 'Unknown'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-medium">Activity Feed</h3>
                <p className="text-[#a0a0a0] text-xs mt-1">Recent updates and notifications</p>
              </div>
            </div>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden">
              <ActivityFeed userRole="student" />
            </div>
          </motion.div>

          {/* Upcoming Reviews */}
          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-medium">Upcoming Reviews</h3>
                <p className="text-[#a0a0a0] text-xs mt-1">Your scheduled project review sessions</p>
              </div>
              <Link 
                href="/student/bookings" 
                className="text-xs text-[#a0a0a0] hover:text-white px-3 py-1.5 rounded-md bg-[#1e1e1e] hover:bg-[#252525] transition-colors duration-200"
              >
                View all
              </Link>
            </div>
            
            {upcomingReviews.length === 0 ? (
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 text-center">
                <div className="mb-4 mx-auto w-12 h-12 bg-[#1e1e1e] rounded-full flex items-center justify-center">
                  <IoCalendar size={20} className="text-[#a0a0a0]" />
                </div>
                <h4 className="text-base font-medium mb-2">No upcoming reviews</h4>
                <p className="text-[#a0a0a0] text-sm">Your scheduled reviews will appear here</p>
              </div>
            ) : (
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#252525]">
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Review</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Time</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Classroom</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Team</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-right text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingReviews.map((review, index) => (
                        <tr key={review.id} className={index !== upcomingReviews.length - 1 ? "border-b border-[#1e1e1e]" : ""}>
                          <td className="px-5 py-3 whitespace-nowrap text-xs font-medium">{review.title}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">{review.date}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">{review.time}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">{review.classroom}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">{review.team}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/10 text-green-400">
                              {review.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right text-xs">
                            <Link href={`/student/bookings/${review.id}`} className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="ml-2 text-white hover:text-white/80">
                <IoClose size={14} />
              </button>
            </div>
          </motion.div>
        )}
        
        {showClassroomDetailsModal && (
          <ClassroomDetailsModal 
            classroom={selectedClassroom} 
            onClose={() => setShowClassroomDetailsModal(false)} 
          />
        )}
        
        {showCreateTeamForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateTeamForm(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              {classrooms.length > 0 ? (
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 mb-4">
                  <h4 className="text-base font-medium mb-3">Select a Classroom</h4>
                  <p className="text-[#a0a0a0] text-xs mb-4">Choose the classroom for which you want to create a team</p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {classrooms.map((classroom) => (
                      <button
                        key={classroom.id}
                        onClick={() => {
                          setSelectedClassroomId(classroom.id);
                          setShowCreateTeamForm(false);
                          // Small delay to allow the first modal to close
                          setTimeout(() => setShowCreateTeamFormWithClassroom(true), 100);
                        }}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors duration-200 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">{classroom.name}</p>
                          <p className="text-[#a0a0a0] text-xs mt-0.5">{classroom.faculty_name}</p>
                        </div>
                        <IoChevronForward size={16} className="text-[#a0a0a0]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 text-center">
                  <div className="mb-4 mx-auto w-12 h-12 bg-[#1e1e1e] rounded-full flex items-center justify-center">
                    <IoPeople size={20} className="text-[#a0a0a0]" />
                  </div>
                  <h4 className="text-base font-medium mb-2">No classrooms joined</h4>
                  <p className="text-[#a0a0a0] text-sm mb-4">You need to join a classroom before creating a team</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
        
        {showCreateTeamFormWithClassroom && selectedClassroomId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateTeamFormWithClassroom(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <CreateTeamForm 
                classroomId={selectedClassroomId} 
                onSuccess={(teamId) => {
                  setShowCreateTeamFormWithClassroom(false);
                  // Refresh data to show the new team
                  fetchData();
                  // Show success message
                  setSuccessMessage('Team created successfully! Share your invitation code with teammates.');
                  // Navigate to team page
                  window.location.href = `/student/team/${teamId}`;
                }}
                onCancel={() => setShowCreateTeamFormWithClassroom(false)}
              />
            </motion.div>
          </motion.div>
        )}
        
        {showJoinTeamForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoinTeamForm(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              {classrooms.length > 0 ? (
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 mb-4">
                  <h4 className="text-base font-medium mb-3">Select a Classroom</h4>
                  <p className="text-[#a0a0a0] text-xs mb-4">Choose the classroom for which you want to join a team</p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {classrooms.map((classroom) => (
                      <button
                        key={classroom.id}
                        onClick={() => {
                          setSelectedClassroomId(classroom.id);
                          setShowJoinTeamForm(false);
                          // Small delay to allow the first modal to close
                          setTimeout(() => setShowJoinTeamFormWithClassroom(true), 100);
                        }}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors duration-200 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">{classroom.name}</p>
                          <p className="text-[#a0a0a0] text-xs mt-0.5">{classroom.faculty_name}</p>
                        </div>
                        <IoChevronForward size={16} className="text-[#a0a0a0]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 text-center">
                  <div className="mb-4 mx-auto w-12 h-12 bg-[#1e1e1e] rounded-full flex items-center justify-center">
                    <IoPeople size={20} className="text-[#a0a0a0]" />
                  </div>
                  <h4 className="text-base font-medium mb-2">No classrooms joined</h4>
                  <p className="text-[#a0a0a0] text-sm mb-4">You need to join a classroom before joining a team</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
        
        {showJoinTeamFormWithClassroom && selectedClassroomId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoinTeamFormWithClassroom(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <JoinTeamForm 
                classroomId={selectedClassroomId} 
                onSuccess={(teamId) => {
                  setShowJoinTeamFormWithClassroom(false);
                  // Refresh data to show the new team
                  fetchData();
                  // Show success message
                  setSuccessMessage('Successfully joined team!');
                  // Navigate to team page
                  window.location.href = `/student/team/${teamId}`;
                }}
                onCancel={() => setShowJoinTeamFormWithClassroom(false)}
              />
            </motion.div>
          </motion.div>
        )}
        
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-[#1e1e1e] rounded-lg w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[#1e1e1e]">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Profile</h3>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200"
                  >
                    <IoClose size={14} className="text-[#a0a0a0]" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h4 className="text-base font-medium">{user?.name || 'Student'}</h4>
                    <p className="text-[#a0a0a0] text-xs mt-1">{user?.email || 'No email available'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h5 className="text-xs font-medium mb-2">Student Information</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Registration Number</p>
                        <p className="text-xs">22MIA1079</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Joined</p>
                        <p className="text-xs">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h5 className="text-xs font-medium mb-2">Statistics</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Classrooms</p>
                        <p className="text-xs">{classrooms.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Teams</p>
                        <p className="text-xs">{teams.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Reviews</p>
                        <p className="text-xs">{upcomingReviews.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-[#1e1e1e] flex justify-end">
                  <LogoutButton variant="minimal" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
