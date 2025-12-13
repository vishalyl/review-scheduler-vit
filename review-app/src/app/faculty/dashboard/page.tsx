"use client";

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { IoAdd, IoCalendar, IoPeople, IoDocument, IoSettings, IoTime, IoCloudUpload, IoBook, IoAlertCircle, IoCheckmarkCircle, IoChevronDown, IoLink } from 'react-icons/io5';
import LogoutButton from '@/components/auth/logout-button';
import { parseTimetableSlots, getAllFreeSlots, FreeSlot, Schedule, splitAllSlotsByDuration } from '@/utils/timetable-parser';
import CreateClassroomForm from '@/components/faculty/create-classroom-form';
import ClassroomDetailsModal from '@/components/faculty/classroom-details-modal';
import SimpleDateSelector from '@/components/faculty/simple-date-selector';
import DateBasedSlots from '@/components/faculty/date-based-slots';
import ReviewSlotsSection from '@/components/faculty/review-slots-section';
import ActivityFeed from '@/components/shared/activity-feed';
import { formatDateForInput } from '@/lib/utils';

export default function FacultyDashboard() {
  const [user, setUser] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewSlots, setReviewSlots] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const supabase = createClientComponentClient();

  // Classroom state
  const [showCreateClassroomForm, setShowCreateClassroomForm] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false);

  // Timetable state
  const [timetableText, setTimetableText] = useState('');
  const [parsedSchedule, setParsedSchedule] = useState<Schedule | null>(null);
  const [allFreeSlots, setAllFreeSlots] = useState<FreeSlot[]>([]);
  const [splitFreeSlots, setSplitFreeSlots] = useState<FreeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<FreeSlot[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);

  // Review slot form state
  const [reviewDuration, setReviewDuration] = useState('10');
  const [reviewStage, setReviewStage] = useState('Review 1');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [bookingDeadline, setBookingDeadline] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  
  // New workflow state
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [slotsWithDates, setSlotsWithDates] = useState<Array<FreeSlot & { slot_date: Date }>>([]);

  // Function to check if a slot is selected
  const isSlotSelected = (day: string, time: string, endTime: string) => {
    return selectedSlots.some(
      slot => slot.day === day && slot.start === time && slot.end === endTime
    );
  };

  // Function to toggle slot selection
  const toggleSlotSelection = (day: string, time: string, endTime: string, isFree: boolean) => {
    if (!isFree) return; // Can't select busy slots
    
    const slotKey = `${day}-${time}-${endTime}`;
    
    if (isSlotSelected(day, time, endTime)) {
      // Remove from selected
      setSelectedSlots(selectedSlots.filter(
        slot => !(slot.day === day && slot.start === time && slot.end === endTime)
      ));
    } else {
      // Add to selected
      setSelectedSlots([...selectedSlots, {
        day,
        start: time,
        end: endTime,
        code: null
      }]);
    }
  };

  // Effect to update split slots when duration changes
  useEffect(() => {
    if (allFreeSlots.length > 0) {
      const duration = parseInt(reviewDuration, 10);
      const splitSlots = splitAllSlotsByDuration(allFreeSlots, duration);
      setSplitFreeSlots(splitSlots);
    }
  }, [reviewDuration, allFreeSlots]);

  // Function to fetch classroom data with student counts
  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('Current user:', user);
      
      // First, try to fetch all classrooms directly to see what's available
      const { data: allClassrooms, error: allClassroomsError } = await supabase
        .from('classrooms')
        .select('*');
      
      // Get current user's Supabase ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Try to use the RPC function first
      try {
        // Attempt to call the RPC function
        const { data: classroomData, error: classroomError } = await supabase
          .rpc('get_classrooms_with_student_counts', { p_faculty_id: user?.id });
        
        if (!classroomError && classroomData) {
          // If RPC was successful, use the data directly
          console.log('RPC function succeeded:', classroomData);
          setClassrooms(classroomData || []);
        } else {
          // Fallback to standard query if RPC fails
          console.log('RPC function failed, using fallback query');
          let fallbackData, fallbackError;
          
          // Try with the database user ID first - use a more detailed query without nested relationships
          const { data: data1, error: error1 } = await supabase
            .from('classrooms')
            .select(`
              *,
              students:classroom_students(count),
              classroom_students(*)
            `)
            .eq('faculty_id', user?.id);
            
          console.log('Direct query with database ID result:', { data1, error1 });
          
          if (data1 && data1.length > 0) {
            fallbackData = data1;
            fallbackError = error1;
          } else {
            // If no results, try with the Supabase user ID
            const { data: data2, error: error2 } = await supabase
              .from('classrooms')
              .select(`
                *,
                students:classroom_students(count)
              `)
              .eq('faculty_id', currentUser?.id);
              
            console.log('Direct query with Supabase ID result:', { data2, error2 });
            
            fallbackData = data2;
            fallbackError = error2;
          }

          if (fallbackError) {
            throw fallbackError;
          }

          // Process the counts from the join with improved student counting
          const processedClassrooms = fallbackData?.map(classroom => {
            // Calculate student count manually if needed
            let studentCount = classroom.students?.count || 0;
            
            // If we have classroom_students data, count them directly
            if (classroom.classroom_students && Array.isArray(classroom.classroom_students)) {
              studentCount = classroom.classroom_students.length;
              console.log(`Manual count for ${classroom.name}:`, studentCount);
            }
            
            // We'll set a default of 0 for teams count and update it separately
            const teamsCount = 0;
            
            return {
              ...classroom,
              teams_count: teamsCount,
              students_count: studentCount
            };
          }) || [];
          
          // After processing classrooms, fetch accurate student and team counts directly
          const fetchAccurateCounts = async () => {
            try {
              for (const classroom of processedClassrooms) {
                // Direct query for classroom students
                const { data: students, error: studentError } = await supabase
                  .from('classroom_students')
                  .select('student_id')
                  .eq('classroom_id', classroom.id);
                  
                if (!studentError) {
                  classroom.students_count = students?.length || 0;
                }
                
                // Direct query for teams - use a simple count query to avoid relationship issues
                const { count: teamsCount, error: teamError } = await supabase
                  .from('teams')
                  .select('id', { count: 'exact', head: true })
                  .eq('classroom_id', classroom.id);
                  
                if (!teamError) {
                  classroom.teams_count = teamsCount || 0;
                }
              }
              
              // Update the state with the corrected data
              setClassrooms([...processedClassrooms]);
            } catch (error) {
              console.error('Error fetching accurate counts:', error);
            }
          };
          
          // Execute the fetch for accurate counts
          fetchAccurateCounts();
          
          // Initial set of classrooms before the fetch completes
          setClassrooms(processedClassrooms);
        }
      } catch (error) {
        console.error('Error with RPC function:', error);
        // Continue with fallback approach if there's an error with the RPC call
      }
      
      // After classrooms are loaded, fetch slots and submissions
      fetchReviewSlots();
      fetchSubmissions();
    } catch (error) {
      console.error('Error fetching classroom data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
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
        fetchData();
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [supabase]);
  
  // Function to fetch review slots
  const fetchReviewSlots = async () => {
    try {
      setSlotsLoading(true);
      // Check if API endpoint exists before fetching
      try {
        const response = await fetch('/api/faculty/slots');
        
        if (!response.ok) {
          // If API returns error, just set empty array and don't throw
          setReviewSlots([]);
          return;
        }
        
        const { data } = await response.json();
        setReviewSlots(data || []);
      } catch (error) {
        // If API doesn't exist or network error, just set empty array
        setReviewSlots([]);
      }
    } catch (error) {
      // This won't be reached due to inner try/catch, but keeping for safety
      console.error('Error fetching review slots:', error);
      setReviewSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };
  
  // Function to fetch submissions
  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      // Check if API endpoint exists before fetching
      try {
        const response = await fetch('/api/faculty/submissions');
        
        if (!response.ok) {
          // If API returns error, just set empty array and don't throw
          setSubmissions([]);
          return;
        }
        
        const { data } = await response.json();
        const submissionsData = data || [];
      setSubmissions(submissionsData);
      setFilteredSubmissions(submissionsData);
      } catch (error) {
        // If API doesn't exist or network error, just set empty array
        setSubmissions([]);
      }
    } catch (error) {
      // This won't be reached due to inner try/catch, but keeping for safety
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Helper function to convert day number to full day name
  const getDayFullName = (day: number) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[day] || 'Unknown';
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
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const fadeInVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5c46f5]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e1e]">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/images/Review Scheduler.png" 
              alt="Review Scheduler Logo" 
              width={100} 
              height={60} 
              className="rounded-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#a0a0a0] text-sm">{user?.name}</span>
            <LogoutButton variant="minimal" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Welcome message with fade-in animation */}
          <motion.div
            variants={fadeInVariants}
            className="bg-[#141414] rounded-lg p-6 mb-8 border border-[#1e1e1e]"
          >
            <h1 className="text-xl font-medium mb-2">Welcome back, {user?.name || 'Faculty'}</h1>
            <p className="text-[#a0a0a0] text-sm mb-4">
              Manage your classrooms, review schedules, and student submissions from this dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'bg-[#5c46f5] text-white'
                    : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525] transition-colors'
                }`}
              >
                <IoDocument size={16} />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'timetable'
                    ? 'bg-[#5c46f5] text-white'
                    : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525] transition-colors'
                }`}
              >
                <IoCalendar size={16} />
                Timetable
              </button>
              <button
                onClick={() => setActiveTab('slots')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'slots'
                    ? 'bg-[#5c46f5] text-white'
                    : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525] transition-colors'
                }`}
              >
                <IoTime size={16} />
                Review Slots
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'submissions'
                    ? 'bg-[#5c46f5] text-white'
                    : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525] transition-colors'
                }`}
              >
                <IoDocument size={16} />
                Submissions
              </button>
            </div>
          </motion.div>

          {activeTab === 'overview' && (
            <>
              <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                  <p className="text-gray-400">Manage your classrooms and review schedules</p>
                </div>
                <button
                  onClick={() => setShowCreateClassroomForm(true)}
                  className="ml-auto bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <IoAdd size={16} />
                  Create Classroom
                </button>
              </motion.div>

              {/* Stats grid */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#1a1a1a] rounded-lg">
                      <IoPeople className="text-[#a0a0a0]" size={20} />
                    </div>
                    <span className="text-xs text-[#808080]">Total</span>
                  </div>
                  <h3 className="text-xl font-medium mb-1">{classrooms.length}</h3>
                  <p className="text-[#a0a0a0] text-sm">Classrooms</p>
                </div>
                
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#1a1a1a] rounded-lg">
                      <IoPeople className="text-[#a0a0a0]" size={20} />
                    </div>
                    <span className="text-xs text-[#808080]">Total</span>
                  </div>
                  <h3 className="text-xl font-medium mb-1">
                    {classrooms.reduce((sum, classroom) => sum + (classroom.students_count || 0), 0)}
                  </h3>
                  <p className="text-[#a0a0a0] text-sm">Students</p>
                </div>
                
                <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#1a1a1a] rounded-lg">
                      <IoCalendar className="text-[#a0a0a0]" size={20} />
                    </div>
                    <span className="text-xs text-[#808080]">Total</span>
                  </div>
                  <h3 className="text-xl font-medium mb-1">{reviewSlots.length}</h3>
                  <p className="text-[#a0a0a0] text-sm">Review Slots</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Your Classrooms</h3>
                  <button className="text-sm text-[#5c46f5] hover:text-[#4c38e6] transition-colors">View all</button>
                </div>
                
                {classrooms.length === 0 ? (
                  <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 text-center">
                    <div className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                      <IoBook className="text-[#a0a0a0]" size={20} />
                    </div>
                    <h4 className="text-base font-medium mb-2">No classrooms yet</h4>
                    <p className="text-[#a0a0a0] text-sm mb-5">Create your first classroom to get started</p>
                    <button
                      onClick={() => setShowCreateClassroomForm(true)}
                      className="bg-[#5c46f5] hover:bg-[#4c38e6] text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm transition-colors"
                    >
                      <IoAdd size={16} />
                      Create Classroom
                    </button>
                  </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classrooms.map((classroom) => (
                      <motion.div 
                        key={classroom.id} 
                        whileHover={{ scale: 1.02 }}
                        className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5 hover:border-[#5c46f5] transition-all cursor-pointer shadow-md hover:shadow-[#5c46f5]/10"
                        onClick={() => {
                          setSelectedClassroom(classroom);
                          setShowClassroomDetailsModal(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#1a1a1a] rounded-lg">
                              <IoBook className="text-[#a0a0a0]" size={16} />
                            </div>
                            <h4 className="font-medium text-base">{classroom.name}</h4>
                          </div>
                          <span className="px-3 py-1 bg-[#1a1a1a] border border-[#252525] rounded-full text-xs font-mono text-[#5c46f5]">
                            {classroom.link_code}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div className="bg-[#1a1a1a] rounded-lg p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-2 mb-1">
                              <IoPeople size={14} className="text-[#a0a0a0]" />
                              <span className="text-[#808080] text-xs">Students</span>
                            </div>
                            <span className="text-lg font-medium">
                              {classroom.students_count || 0}
                            </span>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-2 mb-1">
                              <IoPeople size={14} className="text-[#a0a0a0]" />
                              <span className="text-[#808080] text-xs">Teams</span>
                            </div>
                            <span className="text-lg font-medium">{classroom.teams_count || 0}</span>
                          </div>
                        </div>
                        
                        <button className="w-full py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#252525] rounded-lg text-sm text-[#5c46f5] transition-colors flex items-center justify-center gap-2">
                          <span>View Details</span>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Recent activity */}
              <motion.div variants={itemVariants} className="mt-8">
                <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                <ActivityFeed userRole="faculty" />
              </motion.div>
            </>
          )}

          {activeTab === 'timetable' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="mb-6 text-center">
                <h2 className="text-xl font-medium mb-2">Timetable Management</h2>
                <p className="text-[#a0a0a0] text-sm max-w-2xl mx-auto">Upload and parse your VIT timetable to automatically identify free slots for scheduling reviews</p>
              </motion.div>

              {/* Timetable upload */}
              {/* Success message */}
              {publishSuccess && (
                <motion.div
                  variants={itemVariants}
                  className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden max-w-3xl mx-auto mb-4 p-4 flex items-center gap-2"
                >
                  <IoCheckmarkCircle size={16} className="text-[#4ade80]" />
                  <span className="text-[#4ade80] text-sm">{publishMessage}</span>
                </motion.div>
              )}
              
              {/* Error message */}
              {publishError && (
                <motion.div
                  variants={itemVariants}
                  className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden max-w-3xl mx-auto mb-4 p-4 flex items-center gap-2"
                >
                  <IoAlertCircle size={16} className="text-[#f87171]" />
                  <span className="text-[#f87171] text-sm">{publishMessage}</span>
                </motion.div>
              )}
              
              <motion.div
                variants={itemVariants}
                className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden max-w-3xl mx-auto"
              >
                <div className="border-b border-[#1e1e1e] p-3">
                  <h3 className="text-base font-medium flex items-center gap-2">
                    <IoCloudUpload size={16} className="text-[#a0a0a0]" />
                    Parse Timetable
                  </h3>
                </div>
                
                <div className="p-3">
                  <div className="text-xs text-[#a0a0a0] mb-2">
                    Copy and paste your VIT timetable text here. The system will automatically identify your free slots.
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={timetableText}
                      onChange={(e) => setTimetableText(e.target.value)}
                      className="w-full h-32 bg-[#1a1a1a] border border-[#252525] rounded-lg p-3 text-white font-mono text-xs focus:border-[#5c46f5] focus:outline-none transition-colors"
                      placeholder="Paste your timetable here..."
                    />
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          try {
                            setParseError('');
                            setParseSuccess(false);
                            
                            // Parse the timetable
                            const schedule = parseTimetableSlots(timetableText);
                            setParsedSchedule(schedule);
                            
                            // Get all free slots
                            const freeSlots = getAllFreeSlots(schedule);
                            setAllFreeSlots(freeSlots);
                            
                            const duration = parseInt(reviewDuration, 10);
                            const splitSlots = splitAllSlotsByDuration(freeSlots, duration);
                            setSplitFreeSlots(splitSlots);
                            
                            setParseSuccess(true);
                          } catch (error) {
                            console.error('Error parsing timetable:', error);
                            setParseError('Failed to parse timetable. Please check the format and try again.');
                          }
                        }}
                        className="bg-[#5c46f5] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#4c38e6] transition-colors text-sm"
                      >
                        <IoCloudUpload size={16} />
                        Parse
                      </button>
                    </div>
                  </div>

                  {parseError && (
                    <div className="mt-2 flex items-center gap-2 text-[#f87171] bg-[#1a1a1a] p-2 rounded-lg text-xs">
                      <IoAlertCircle size={14} />
                      <span>{parseError}</span>
                    </div>
                  )}
                  
                  {/* Success message and form */}
                  {parseSuccess && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2 text-[#4ade80] text-xs bg-[#1a1a1a] p-2 rounded-lg">
                        <IoCheckmarkCircle size={14} />
                        <span>Timetable parsed successfully! {allFreeSlots.length} free slots found</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Classroom Selection */}
                        <div>
                          <label className="text-xs text-[#a0a0a0] mb-1 block">Classroom</label>
                          <select
                            value={selectedClassroomId || ''}
                            onChange={(e) => setSelectedClassroomId(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg p-2 text-white text-sm focus:border-[#5c46f5] focus:outline-none transition-colors"
                          >
                            <option value="">Select a classroom</option>
                            {classrooms.map((classroom) => (
                              <option key={classroom.id} value={classroom.id}>
                                {classroom.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Review Stage */}
                        <div>
                          <label className="text-xs text-[#a0a0a0] mb-1 block">Review Stage</label>
                          <select
                            value={reviewStage}
                            onChange={(e) => setReviewStage(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg p-2 text-white text-sm focus:border-[#5c46f5] focus:outline-none transition-colors"
                          >
                            <option value="Review 1">Review 1</option>
                            <option value="Review 2">Review 2</option>
                            <option value="Review 3">Review 3</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Booking Deadline */}
                      <div>
                        <label className="text-xs text-[#a0a0a0] mb-1 block">Booking Deadline</label>
                        <input
                          type="date"
                          value={bookingDeadline}
                          onChange={(e) => setBookingDeadline(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg p-2 text-white text-sm focus:border-[#5c46f5] focus:outline-none transition-colors"
                        />
                      </div>
                      
                      {/* Button to proceed to date selection */}
                      <button
                        onClick={() => {
                          if (allFreeSlots.length > 0 && selectedClassroomId && bookingDeadline) {
                            setSelectedDates([]);
                            setSlotsWithDates([]);
                            setShowDateSelector(true);
                          }
                        }}
                        disabled={!(allFreeSlots.length > 0 && selectedClassroomId && bookingDeadline)}
                        className={`w-full py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 ${
                          allFreeSlots.length > 0 && selectedClassroomId && bookingDeadline
                            ? 'bg-[#5c46f5] hover:bg-[#4c38e6] text-white transition-colors'
                            : 'bg-[#1a1a1a] text-[#505050] cursor-not-allowed'
                        }`}
                      >
                        <IoCalendar size={16} />
                        Select Dates for Publishing
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              {allFreeSlots.length > 0 && (
                <motion.div 
                  variants={itemVariants}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                </motion.div>
              )}
              
              {/* Date Selector Modal - Step 1: Select Dates */}
              <AnimatePresence>
                {showDateSelector && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
                  >
                    <div className="w-full max-w-4xl">
                      <SimpleDateSelector
                        initialDuration={parseInt(reviewDuration)}
                        onDatesSelected={(dates, duration) => {
                          setSelectedDates(dates);
                          setReviewDuration(duration.toString());
                          setShowDateSelector(false);
                          setShowSlotSelector(true);
                        }}
                        onCancel={() => setShowDateSelector(false)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Slot Selector Modal - Step 2: Select Slots for Dates */}
              <AnimatePresence>
                {showSlotSelector && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
                  >
                    <div className="w-full max-w-4xl">
                      <DateBasedSlots
                        selectedDates={selectedDates}
                        allFreeSlots={splitFreeSlots}
                        reviewDuration={reviewDuration}
                        onSlotsSelected={async (selectedSlotsWithDates) => {
                          try {
                            setShowSlotSelector(false);
                            setPublishSuccess(false);
                            setPublishError(false);
                            setPublishMessage('');
                            
                            // Get current user's ID
                            const { data: { user: currentUser } } = await supabase.auth.getUser();
                            
                            if (!currentUser) {
                              throw new Error('User not authenticated');
                            }
                            
                            // Create slots in the database with dates
                            const { data, error } = await supabase
                              .from('slots')
                              .insert(
                                selectedSlotsWithDates.map(slot => ({
                                  day: slot.day || '',
                                  start_time: slot.start || '',
                                  end_time: slot.end || '',
                                  duration: parseInt(reviewDuration),
                                  classroom_id: selectedClassroomId,
                                  review_stage: reviewStage,
                                  booking_deadline: bookingDeadline,
                                  is_available: true,
                                  slot_date: formatDateForInput(slot.slot_date),
                                  created_by: currentUser.id
                                }))
                              );
                            
                            if (error) {
                              throw error;
                            }
                            
                            setPublishSuccess(true);
                            setPublishMessage(`Successfully published ${selectedSlotsWithDates.length} review slots!`);
                            setSelectedSlots([]);
                            fetchReviewSlots();
                            
                            // Show a toast notification or alert
                            alert(`Successfully published ${selectedSlotsWithDates.length} review slots!`);
                          } catch (error) {
                            console.error('Error publishing slots:', error);
                            setPublishError(true);
                            setPublishMessage('Failed to publish slots. Please try again.');
                          }
                        }}
                        onBack={() => {
                          setShowSlotSelector(false);
                          setShowDateSelector(true);
                        }}
                        onCancel={() => setShowSlotSelector(false)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {activeTab === 'slots' && (
            <ReviewSlotsSection userId={user?.id} />
          )}

          {activeTab === 'submissions' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Submissions</h2>
                <p className="text-gray-400">Review and manage student submissions</p>
              </motion.div>

              {/* Submissions List */}
              <motion.div variants={itemVariants} className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Recent Submissions</h3>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select 
                        className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-[#5c46f5] focus:outline-none transition-colors appearance-none"
                        onChange={(e) => {
                          // Filter submissions by classroom
                          const classroomId = e.target.value;
                          if (classroomId === 'all') {
                            setFilteredSubmissions(submissions);
                          } else {
                            setFilteredSubmissions(submissions.filter(s => s.classroom_id === classroomId));
                          }
                        }}
                      >
                        <option value="all">All Classrooms</option>
                        {classrooms.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <IoChevronDown size={16} className="text-[#a0a0a0]" />
                      </div>
                    </div>
                    
                    <div className="relative">
                      <select 
                        className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-[#5c46f5] focus:outline-none transition-colors appearance-none"
                        onChange={(e) => {
                          // Filter submissions by status
                          const status = e.target.value;
                          if (status === 'all') {
                            setFilteredSubmissions(submissions);
                          } else {
                            setFilteredSubmissions(submissions.filter(s => 
                              s.status.toLowerCase() === status.toLowerCase()
                            ));
                          }
                        }}
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="graded">Graded</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <IoChevronDown size={16} className="text-[#a0a0a0]" />
                      </div>
                    </div>
                  </div>
                </div>

                {submissionsLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5c46f5] border-t-transparent"></div>
                    <p className="mt-2 text-[#a0a0a0] text-sm">Loading submissions...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mb-4 mx-auto w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                      <IoDocument size={24} className="text-[#a0a0a0]" />
                    </div>
                    <h4 className="text-lg font-medium mb-2">No submissions yet</h4>
                    <p className="text-[#a0a0a0]">Student submissions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => (
                      <div key={submission.id} className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#1e1e1e] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-white">{submission.title}</h4>
                            <p className="text-[#a0a0a0] text-sm">Team {submission.team_name} - {submission.project_title}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            submission.status === 'Pending' ? 'bg-[#3a2e0b] text-[#fbbf24]' :
                            submission.status === 'Reviewed' ? 'bg-[#0f2922] text-[#34d399]' :
                            submission.status === 'Graded' ? 'bg-[#1e1a4f] text-[#818cf8]' :
                            'bg-[#1e1e1e] text-[#a0a0a0]'
                          }`}>
                            {submission.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#e0e0e0] mb-3 line-clamp-2">
                          {submission.description || 'No description provided'}
                        </p>
                        <div className="flex justify-between items-center text-xs text-[#a0a0a0]">
                          <span>Submitted on {submission.formatted_date}</span>
                          <div className="flex gap-3">
                            {submission.file_url && (
                              <a 
                                href={submission.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#5c46f5] hover:text-[#6e5af7] transition-colors flex items-center gap-1"
                              >
                                <IoLink size={12} />
                                View File
                              </a>
                            )}
                            <button 
                              className="text-[#34d399] hover:text-[#4ade80] transition-colors flex items-center gap-1"
                              onClick={() => {
                                // Handle status update
                                const newStatus = submission.status === 'Pending' ? 'Reviewed' : 
                                                 submission.status === 'Reviewed' ? 'Graded' : 'Pending';
                                
                                // Show a modal or implement the API call to update the status
                                alert(`Status would be updated to: ${newStatus}`);
                              }}
                            >
                              <IoCheckmarkCircle size={12} />
                              {submission.status === 'Pending' ? 'Mark as Reviewed' : 
                               submission.status === 'Reviewed' ? 'Mark as Graded' : 'Update Status'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Create Classroom Modal */}
      <AnimatePresence>
        {showCreateClassroomForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <div className="w-full max-w-lg">
              <CreateClassroomForm
                onSuccess={(classroomId) => {
                  setShowCreateClassroomForm(false);
                  // Refresh the data
                  fetchData();
                }}
                onCancel={() => setShowCreateClassroomForm(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Classroom Details Modal */}
      <AnimatePresence>
        {showClassroomDetailsModal && (
          <ClassroomDetailsModal
            classroom={selectedClassroom}
            onClose={() => setShowClassroomDetailsModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to get full day name
function getDayFullName(day: string): string {
  const days: Record<string, string> = {
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday',
    'THU': 'Thursday',
    'FRI': 'Friday',
    'SAT': 'Saturday',
    'SUN': 'Sunday'
  };
  
  return days[day] || day;
}
