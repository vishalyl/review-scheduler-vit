'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { IoCalendar, IoTime, IoFunnel, IoSearch, IoCheckmarkCircle, IoAlertCircle, IoChevronDown, IoInformationCircle, IoChevronForward, IoRefresh } from 'react-icons/io5';
import Link from 'next/link';

interface ReviewSlot {
  id: string;
  date: string;  // Formatted date (DD-MM-YYYY)
  day: string;   // Day of week (MON, TUE, etc.)
  start_time: string;
  end_time: string;
  duration: number;
  classroom_id: string;
  classroom_name: string;
  faculty_name: string;
  review_stage: string;
  status: string;
  booking_deadline?: string;
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  classroom_id: string;
  is_leader: boolean;
}

interface ReviewSlotsSectionProps {
  userId: string;
}

export default function StudentReviewSlotsSection({ userId }: ReviewSlotsSectionProps) {
  const [availableSlots, setAvailableSlots] = useState<ReviewSlot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<ReviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [slotToBook, setSlotToBook] = useState<string | null>(null);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<{ id: string, name: string }[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const supabase = createClientComponentClient();

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

  // Fetch available slots with real-time synchronization
  const fetchAvailableSlots = useCallback(async (showRefreshIndicator = true) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error } = await supabase
        .from('slots')
        .select(`
          id, 
          classroom_id, 
          day, 
          start_time, 
          end_time, 
          duration, 
          review_stage, 
          is_available, 
          slot_date,
          booking_deadline,
          classrooms(id, name, faculty_name)
        `)
        .eq('is_available', true);

      if (error) throw error;

      if (data) {
        const formattedSlots = data.map(slot => {
          const classrooms: any = slot.classrooms;
          const classroomName = classrooms ? (Array.isArray(classrooms) ? (classrooms[0]?.name || 'Unknown') : (classrooms.name || 'Unknown')) : 'Unknown';
          const facultyName = classrooms ? (Array.isArray(classrooms) ? (classrooms[0]?.faculty_name || 'Unknown') : (classrooms.faculty_name || 'Unknown')) : 'Unknown';

          return {
            id: slot.id,
            classroom_id: slot.classroom_id,
            classroom_name: classroomName,
            faculty_name: facultyName,
            day: slot.day,
            date: slot.slot_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration: slot.duration,
            review_stage: slot.review_stage,
            status: 'Available',
            booking_deadline: slot.booking_deadline
          };
        });

        // Extract unique dates for the date filter
        const uniqueDates = Array.from(new Set(formattedSlots.map(slot => slot.date))).sort();
        setAvailableDates(uniqueDates);

        // Extract unique classrooms for the classroom filter
        const uniqueClassrooms = Array.from(
          new Set(formattedSlots.map(slot => slot.classroom_id))
        ).map(id => {
          const slot = formattedSlots.find(s => s.classroom_id === id);
          return {
            id,
            name: slot?.classroom_name || 'Unknown'
          };
        });
        setClassrooms(uniqueClassrooms);

        setAvailableSlots(formattedSlots);
        setFilteredSlots(formattedSlots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setError('Failed to load available slots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch user's teams
  const fetchUserTeams = async () => {
    try {
      // Get user's database ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Get user's teams
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          is_leader,
          team:teams(
            id,
            name,
            project_title,
            classroom_id
          )
        `)
        .eq('student_id', userData.id);

      if (teamError) {
        throw teamError;
      }

      if (!teamMembers || teamMembers.length === 0) {
        setTeams([]);
        return;
      }

      const userTeams = teamMembers.map((member: any) => ({
        id: member.team.id,
        name: member.team.name,
        project_title: member.team.project_title,
        classroom_id: member.team.classroom_id,
        is_leader: member.is_leader
      }));

      setTeams(userTeams);
    } catch (error) {
      console.error('Error fetching user teams:', error);
    }
  };

  // Book a slot
  const bookSlot = async (slotId: string) => {
    if (!selectedTeam) {
      setError('Please select a team to book this slot.');
      return;
    }

    try {
      setBookingInProgress(true);
      setError(null);

      // Check if the team already has a booking for this review stage
      const slot = availableSlots.find(s => s.id === slotId);
      if (!slot) {
        throw new Error('Slot not found');
      }

      const reviewStage = slot.review_stage;

      // Get team's existing bookings
      const { data: existingBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          slot_id,
          slot:slots!slot_id(review_stage)
        `)
        .eq('team_id', selectedTeam);

      if (bookingsError) {
        throw bookingsError;
      }

      const hasBookingForStage = existingBookings?.some(
        (booking: any) => booking.slot?.review_stage === reviewStage
      );

      if (hasBookingForStage) {
        setError(`Your team already has a booking for ${reviewStage}. You can only have one booking per review stage.`);
        return;
      }

      // Create the booking
      const { error: insertError } = await supabase
        .from('bookings')
        .insert({
          slot_id: slotId,
          team_id: selectedTeam,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess('Slot booked successfully!');
      setShowBookingConfirm(false);
      fetchAvailableSlots(); // Refresh the slots
    } catch (error) {
      console.error('Error booking slot:', error);
      setError('Failed to book slot. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...availableSlots];

    // Filter by classroom
    if (selectedClassroom !== 'all') {
      filtered = filtered.filter(slot => slot.classroom_id === selectedClassroom);
    }

    // Filter by review stage
    if (selectedStage !== 'all') {
      filtered = filtered.filter(slot => slot.review_stage === selectedStage);
    }

    // Filter by date
    if (selectedDate !== 'all') {
      filtered = filtered.filter(slot => slot.date === selectedDate);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        slot =>
          slot.classroom_name.toLowerCase().includes(query) ||
          slot.review_stage.toLowerCase().includes(query) ||
          slot.day.toLowerCase().includes(query) ||
          `${slot.start_time} - ${slot.end_time}`.toLowerCase().includes(query)
      );
    }

    setFilteredSlots(filtered);
  };

  // Effect to apply filters when filter criteria change
  useEffect(() => {
    applyFilters();
  }, [selectedClassroom, selectedStage, selectedDate, searchQuery, availableSlots]);

  // Initial data fetch
  useEffect(() => {
    fetchAvailableSlots();
    fetchUserTeams();
  }, [userId]);

  // Handle booking a slot
  const handleBookSlot = (slotId: string) => {
    setSlotToBook(slotId);
    setShowBookingConfirm(true);
  };

  // Confirm booking
  const confirmBooking = async () => {
    if (!slotToBook || !selectedTeam) return;

    setBookingInProgress(true);
    try {
      await bookSlot(slotToBook);
      setShowBookingConfirm(false);
      setSlotToBook(null);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Instructions */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-[#272741] p-5 mb-6 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#5c46f5]/20">
            <IoCalendar size={20} className="text-[#5c46f5]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">Review Slot Booking</h2>
            <p className="text-[#a0a0a0]">Book your team's review slot in just a few clicks</p>
          </div>
          <button
            onClick={() => fetchAvailableSlots(true)}
            disabled={refreshing}
            className="flex items-center gap-1 bg-[#0f0f1a] hover:bg-[#1a1a36] text-[#a0a0a0] hover:text-white px-3 py-2 rounded-md text-xs transition-colors duration-200"
          >
            <IoRefresh size={14} className={`${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {lastSyncTime && (
          <div className="mb-4 text-xs text-[#a0a0a0] flex items-center gap-1">
            <span>Last updated: {lastSyncTime}</span>
            {refreshing && <span className="text-[#5c46f5]">• Syncing with faculty updates...</span>}
          </div>
        )}

        <div className="bg-[#0f0f1a] rounded-lg p-4 border border-[#272741]/50">
          <p className="text-[#a0a0a0] mb-3 text-sm font-medium">Simple 3-step booking process:</p>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5c46f5] flex items-center justify-center text-white font-medium text-sm">1</div>
              <div>
                <p className="text-white text-sm font-medium">Filter Slots</p>
                <p className="text-[#a0a0a0] text-xs">By classroom, date, or stage</p>
              </div>
            </div>
            <div className="flex-1 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5c46f5] flex items-center justify-center text-white font-medium text-sm">2</div>
              <div>
                <p className="text-white text-sm font-medium">Select Time Slot</p>
                <p className="text-[#a0a0a0] text-xs">Choose from available options</p>
              </div>
            </div>
            <div className="flex-1 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5c46f5] flex items-center justify-center text-white font-medium text-sm">3</div>
              <div>
                <p className="text-white text-sm font-medium">Confirm Booking</p>
                <p className="text-[#a0a0a0] text-xs">Select your team and confirm</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#141414] rounded-lg border border-[#1e1e1e] p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5c46f5]/20">
            <IoFunnel size={16} className="text-[#5c46f5]" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Filter Available Slots</h3>
            <p className="text-[#a0a0a0] text-xs mt-0.5">Narrow down slots by classroom, date, or review stage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Classroom Filter */}
          <div>
            <label className="text-xs text-[#a0a0a0] mb-1 block">Classroom</label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200"
            >
              <option value="all">All Classrooms</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-xs text-[#a0a0a0] mb-1 block">Date</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200"
            >
              <option value="all">All Dates</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Review Stage Filter */}
          <div>
            <label className="text-xs text-[#a0a0a0] mb-1 block">Review Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200"
            >
              <option value="all">All Stages</option>
              <option value="Review 1">Review 1</option>
              <option value="Review 2">Review 2</option>
              <option value="Final Review">Final Review</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-xs text-[#a0a0a0] mb-1 block">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200"
              />
              <IoSearch size={14} className="absolute left-3 top-2.5 text-[#505050]" />
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <motion.div variants={itemVariants} className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 flex items-start gap-3 animate-fadeIn">
            <IoAlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <p className="text-red-500/70 text-xs mt-1">Please try again or contact support</p>
            </div>
          </motion.div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-900/30 rounded-lg p-4 mb-6 flex items-start gap-3 animate-fadeIn">
            <IoCheckmarkCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-medium">{success}</p>
              <p className="text-green-500/70 text-xs mt-1">You can view your booked slots in your dashboard</p>
            </div>
          </div>
        )}

        {/* Available Slots */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Available Slots</h3>
            <div className="text-sm text-[#a0a0a0]">
              {filteredSlots.length} slot{filteredSlots.length !== 1 ? 's' : ''} available
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5c46f5]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 text-center">
              <IoAlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => fetchAvailableSlots(false)}
                className="mt-4 bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0] hover:text-white px-4 py-2 rounded-md text-xs transition-colors duration-200 flex items-center gap-2 mx-auto"
              >
                <IoRefresh size={14} />
                <span>Try Again</span>
              </button>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 text-center">
              <IoCalendar className="mx-auto h-8 w-8 text-[#505050] mb-2" />
              <h4 className="text-base font-medium mb-2">No slots available</h4>
              <p className="text-[#a0a0a0] text-sm mb-4">
                {availableSlots.length > 0
                  ? 'Try adjusting your filters to see more slots'
                  : 'There are no review slots available at this time'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setSelectedClassroom('all');
                    setSelectedDate('all');
                    setSelectedStage('all');
                    setSearchQuery('');
                  }}
                  className="bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0] hover:text-white px-4 py-2 rounded-md text-sm transition-colors duration-200"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => fetchAvailableSlots(false)}
                  className="bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0] hover:text-white px-4 py-2 rounded-md text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <IoRefresh size={14} />
                  <span>Refresh Slots</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-[#0f0f1a] border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#5c46f5]/30 transition-all duration-200 hover:shadow-lg hover:shadow-[#5c46f5]/5 group"
                >
                  <div className="bg-gradient-to-r from-[#141432] to-[#1a1a36] p-4 border-b border-[#1e1e1e]">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{slot.classroom_name}</h4>
                      <span className="text-xs bg-[#5c46f5]/20 text-[#5c46f5] px-2 py-1 rounded-full font-medium">
                        {slot.review_stage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[#a0a0a0] text-xs">{slot.date} ({slot.day})</p>
                      <span className="text-xs bg-[#1a1a36] px-2 py-0.5 rounded-full text-[#a0a0a0]">
                        Faculty: {slot.faculty_name}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-3 p-3 bg-[#141428] rounded-lg mb-3">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5c46f5]/10">
                        <IoTime size={18} className="text-[#5c46f5]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{slot.start_time} - {slot.end_time}</p>
                        <p className="text-[#a0a0a0] text-xs">{slot.duration} minutes</p>
                      </div>
                    </div>

                    {slot.booking_deadline && (
                      <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-yellow-500/5 border border-yellow-500/10">
                        <IoInformationCircle size={14} className="text-yellow-500" />
                        <p className="text-xs text-yellow-500/80">
                          Book before <span className="font-medium text-yellow-500">{new Date(slot.booking_deadline).toLocaleDateString()}</span>
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => handleBookSlot(slot.id)}
                      className="w-full bg-gradient-to-r from-[#5c46f5] to-[#4c38e6] hover:from-[#6b56ff] hover:to-[#5c48f6] text-white rounded-md py-3 text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 shadow-md shadow-[#5c46f5]/10 hover:shadow-[#5c46f5]/20 flex items-center justify-center gap-2"
                    >
                      <span>Book this slot</span>
                      <IoChevronForward size={16} className="opacity-70" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showBookingConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gradient-to-b from-[#141414] to-[#1a1a1a] border border-[#272741] rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5c46f5]/20">
                  <IoCalendar size={18} className="text-[#5c46f5]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Confirm Booking</h3>
                  <p className="text-[#a0a0a0] text-sm">Select your team to book this slot</p>
                </div>
              </div>

              {teams.length === 0 ? (
                <div className="bg-[#1a1a1a] rounded-md p-4 text-center mb-6 border border-[#252525]">
                  <IoAlertCircle className="mx-auto h-6 w-6 text-yellow-500 mb-2" />
                  <p className="text-[#a0a0a0] text-sm mb-2">You are not part of any teams</p>
                  <p className="text-xs text-[#505050]">You need to be part of a team to book a slot</p>
                </div>
              ) : (
                <div className="mb-6">
                  <label className="text-sm text-white mb-2 block font-medium">Select Team</label>
                  <select
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200"
                  >
                    <option value="" disabled>Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} {team.is_leader ? '(Team Leader)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBookingConfirm(false);
                    setSlotToBook(null);
                    setSelectedTeam(null);
                  }}
                  className="px-4 py-2.5 text-sm text-[#a0a0a0] hover:text-white transition-colors duration-200 rounded-md hover:bg-[#252525]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBooking}
                  disabled={bookingInProgress || !selectedTeam || teams.length === 0}
                  className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${bookingInProgress || !selectedTeam || teams.length === 0 ? 'bg-[#5c46f5]/30 text-white/50 cursor-not-allowed' : 'bg-gradient-to-r from-[#5c46f5] to-[#4c38e6] text-white hover:shadow-md hover:shadow-[#5c46f5]/20 hover:-translate-y-0.5 transform'}`}
                >
                  {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
