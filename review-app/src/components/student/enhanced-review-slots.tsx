'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { IoCalendar, IoTime, IoFunnel, IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoChevronForward, IoRefresh, IoChevronBack } from 'react-icons/io5';
import { format, addMonths, subMonths, isSameDay, isToday } from 'date-fns';

// Types
interface ReviewSlot {
  id: string;
  date: string;
  day: string;
  start_time: string;
  end_time: string;
  duration: number;
  classroom_id: string;
  classroom_name: string;
  faculty_name: string;
  review_stage: string;
  booking_deadline?: string;
}

interface Team {
  id: string;
  name: string;
  project_title?: string;
  classroom_id: string;
  is_leader: boolean;
}

interface EnhancedReviewSlotsProps {
  userId: string;
}

export default function EnhancedReviewSlots({ userId }: EnhancedReviewSlotsProps) {
  // Supabase client
  const supabase = createClientComponentClient();
  
  // Component state
  const [availableSlots, setAvailableSlots] = useState<ReviewSlot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<ReviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [slotToBook, setSlotToBook] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  
  // Filter state
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Data state
  const [teams, setTeams] = useState<Team[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Fetch available slots with real-time synchronization
  const fetchAvailableSlots = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      console.log('Fetching available slots...');
      
      // Query the slots table with proper error handling
      // Based on the database schema update (from 'review_slots' to 'slots')
      console.log('Querying slots table...');
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
          classrooms(id, name)
        `)
        .eq('is_available', true);
      
      console.log('Query result:', { data: data?.length || 0, error: error?.message });
      
      if (error) throw error;
      
      if (data) {
        const formattedSlots = data.map(slot => ({
          id: slot.id || '',
          classroom_id: slot.classroom_id || '',
          classroom_name: (slot.classrooms && typeof slot.classrooms === 'object' ? (slot.classrooms as any).name || 'Unknown' : 'Unknown') as string,
          faculty_name: '', // Removed faculty name as it's not needed
          day: slot.day,
          date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration: slot.duration,
          review_stage: slot.review_stage,
          booking_deadline: slot.booking_deadline
        }));
        
        setAvailableSlots(formattedSlots);
        setFilteredSlots(formattedSlots);
        setLastSyncTime(new Date().toLocaleTimeString());
        
        // Extract unique dates for filter
        const dateSet = new Set<string>();
        formattedSlots.forEach(slot => dateSet.add(slot.date));
        const dates = Array.from(dateSet).sort();
        setAvailableDates(dates);
        
        // Extract unique classrooms for filter
        const classroomIdSet = new Set<string>();
        formattedSlots.forEach(slot => classroomIdSet.add(slot.classroom_id));
        const classroomIds = Array.from(classroomIdSet);
        fetchClassrooms(classroomIds);
      }
    } catch (error: any) {
      console.error('Error fetching slots:', error);
      setError('Failed to load available slots. Please try again or contact support.');
      // Set empty arrays to prevent null reference errors
      setAvailableSlots([]);
      setFilteredSlots([]);
      setAvailableDates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);
  
  // Set up real-time subscription to slots table
  useEffect(() => {
    const subscription = supabase
      .channel('slots-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'slots' }, 
        () => {
          // When any change happens to slots table, refresh the data
          fetchAvailableSlots(true);
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAvailableSlots, supabase]);
  
  // Fetch classrooms data
  const fetchClassrooms = async (classroomIds: string[]) => {
    if (!classroomIds.length) return;
    
    try {
      console.log('Fetching classrooms with IDs:', classroomIds);
      
      // Convert all IDs to strings to ensure consistent comparison
      const normalizedIds = classroomIds.map(id => String(id));
      
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name')
        .in('id', normalizedIds);
      
      if (error) throw error;
      
      if (data) {
        console.log('Fetched classrooms:', data);
        setClassrooms(data);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  // Fetch user teams
  const fetchUserTeams = async () => {
    try {
      const { data: teamMemberships, error: teamMembershipsError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          is_leader,
          teams(id, name, project_title, classroom_id)
        `)
        .eq('user_id', userId);
      
      if (teamMembershipsError) throw teamMembershipsError;
      
      if (teamMemberships && teamMemberships.length > 0) {
        // Define the Team type to fix TypeScript errors
        type TeamData = {
          id: string;
          name: string;
          project_title: string;
          classroom_id: string;
          is_leader: boolean;
        };
        
        const formattedTeams: TeamData[] = teamMemberships.map(membership => {
          // Ensure teams object exists and has the required properties
          if (!membership.teams) {
            return {
              id: '',
              name: '',
              project_title: '',
              classroom_id: '',
              is_leader: membership.is_leader || false
            };
          }
          
          return {
            id: membership.teams.id || '',
            name: membership.teams.name || '',
            project_title: membership.teams.project_title || '',
            classroom_id: membership.teams.classroom_id || '',
            is_leader: membership.is_leader || false
          };
        });
        
        setTeams(formattedTeams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };
  
  // Book a slot
  const bookSlot = async (slotId: string) => {
    if (!selectedTeam) {
      setError('Please select a team to book this slot');
      return;
    }
    
    setBookingInProgress(true);
    setError(null);
    
    try {
      console.log('Starting booking process for slot:', slotId, 'with team:', selectedTeam);
      
      // Check if the slot is still available
      console.log('Checking slot availability...');
      const { data: slotData, error: slotError } = await supabase
        .from('slots')
        .select('is_available')
        .eq('id', slotId)
        .single();
      
      if (slotError) {
        console.error('Error checking slot availability:', slotError);
        throw slotError;
      }
      
      console.log('Slot availability check result:', slotData);
      
      if (!slotData || !slotData.is_available) {
        setError('This slot is no longer available. Please choose another slot.');
        return;
      }
      
      // Check if the team already has a booking for this slot
      console.log('Checking existing bookings...');
      const { data: existingBooking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('slot_id', slotId)
        .eq('team_id', selectedTeam);
      
      if (bookingError) {
        console.error('Error checking existing bookings:', bookingError);
        throw bookingError;
      }
      
      console.log('Existing booking check result:', existingBooking);
      
      if (existingBooking && existingBooking.length > 0) {
        setError('Your team already has a booking for this slot');
        return;
      }
      
      // Create the booking
      console.log('Creating new booking...');
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert({
          slot_id: slotId,
          team_id: selectedTeam,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.error('Error creating booking:', insertError);
        throw insertError;
      }
      
      console.log('Booking created successfully:', newBooking);
      
      // Update the slot availability
      console.log('Updating slot availability...');
      const { data: updatedSlot, error: updateError } = await supabase
        .from('slots')
        .update({ is_available: false })
        .eq('id', slotId)
        .select();
      
      if (updateError) {
        console.error('Error updating slot availability:', updateError);
        throw updateError;
      }
      
      console.log('Slot updated successfully:', updatedSlot);
      
      setSuccess('Slot booked successfully! Your review has been scheduled.');
      setShowBookingConfirm(false);
      fetchAvailableSlots(true);
    } catch (error: any) {
      console.error('Error booking slot:', error);
      setError(`Failed to book slot: ${error.message || 'Unknown error'}. Please try again or contact support.`);
    } finally {
      setBookingInProgress(false);
    }
  };
  
  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...availableSlots];
    
    // Filter by classroom - ensure string comparison
    if (selectedClassroom !== 'all') {
      console.log('Filtering by classroom ID:', selectedClassroom);
      console.log('Available classroom IDs:', filtered.map(slot => slot.classroom_id));
      filtered = filtered.filter(slot => String(slot.classroom_id) === String(selectedClassroom));
    }
    
    // Filter by review stage
    if (selectedStage !== 'all') {
      filtered = filtered.filter(slot => slot.review_stage === selectedStage);
    }
    
    // Filter by date
    if (selectedDate !== 'all') {
      filtered = filtered.filter(slot => slot.date === selectedDate);
    }
    
    setFilteredSlots(filtered);
  }, [availableSlots, selectedClassroom, selectedStage, selectedDate]);
  
  // Effect to apply filters when filter criteria change
  useEffect(() => {
    applyFilters();
  }, [applyFilters, selectedClassroom, selectedStage, selectedDate, availableSlots]);
  
  // Initial data fetch
  useEffect(() => {
    fetchAvailableSlots(false);
    fetchUserTeams();
  }, [fetchAvailableSlots, userId]);
  
  // Handle booking a slot
  const handleBookSlot = (slotId: string) => {
    setSlotToBook(slotId);
    setShowBookingConfirm(true);
  };
  
  // Confirm booking
  const confirmBooking = async () => {
    if (!slotToBook || !selectedTeam) return;
    
    await bookSlot(slotToBook);
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
      <div className="bg-[#0f0f1a] rounded-lg border border-[#1e1e1e] p-3 mb-6">
        <div className="flex items-center justify-between mb-3 border-b border-[#1e1e1e] pb-2">
          <div className="flex items-center gap-1.5">
            <IoFunnel size={12} className="text-[#5c46f5]" />
            <span className="text-xs font-medium">Filters</span>
          </div>
          
          {(selectedClassroom !== 'all' || selectedDate !== 'all' || selectedStage !== 'all') && (
            <button 
              onClick={() => {
                setSelectedClassroom('all');
                setSelectedDate('all');
                setSelectedStage('all');
              }}
              className="text-[10px] text-[#a0a0a0] hover:text-white flex items-center gap-1 transition-colors"
            >
              <IoRefresh size={10} />
              Reset All
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Classroom Filter */}
          <div className="relative">
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="bg-[#1a1a1a] border border-[#252525] rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200 appearance-none pr-7"
            >
              <option value="all">All Classrooms</option>
              {classrooms.map((classroom) => (
                <option key={String(classroom.id)} value={String(classroom.id)}>
                  {classroom.name}
                </option>
              ))}
            </select>
            <IoChevronForward size={10} className="absolute right-2 top-1.5 text-[#505050] rotate-90 pointer-events-none" />
          </div>
          
          {/* Review Stage Filter */}
          <div className="relative">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-[#1a1a1a] border border-[#252525] rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200 appearance-none pr-7"
            >
              <option value="all">All Stages</option>
              <option value="Review 1">Review 1</option>
              <option value="Review 2">Review 2</option>
              <option value="Final Review">Final Review</option>
            </select>
            <IoChevronForward size={10} className="absolute right-2 top-1.5 text-[#505050] rotate-90 pointer-events-none" />
          </div>
          
          {/* Date Filter */}
          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#1a1a1a] border border-[#252525] rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#5c46f5] focus:border-[#5c46f5] transition-all duration-200 appearance-none pr-7"
            >
              <option value="all">All Dates</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {format(new Date(date), 'MMM dd')}
                </option>
              ))}
            </select>
            <IoChevronForward size={10} className="absolute right-2 top-1.5 text-[#505050] rotate-90 pointer-events-none" />
          </div>
          
          {/* Calendar Toggle Button */}
          <button 
            onClick={() => setShowCalendar(!showCalendar)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${showCalendar ? 'bg-[#5c46f5] text-white' : 'bg-[#1a1a1a] border border-[#252525] text-[#a0a0a0] hover:text-white'}`}
          >
            <IoCalendar size={10} />
            Calendar
          </button>
        </div>
        
        {/* Mini Calendar (Collapsible) */}
        {showCalendar && (
          <div className="mt-3 bg-[#1a1a1a] border border-[#252525] rounded-md overflow-hidden w-full md:w-[280px] mx-auto">
            {/* Calendar Header */}
            <div className="flex items-center justify-between bg-[#141414] px-3 py-2">
              <button 
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(prev => {
                    const newMonth = subMonths(prev, 1);
                    return newMonth.getMonth() < today.getMonth() && newMonth.getFullYear() <= today.getFullYear() 
                      ? today : newMonth;
                  });
                }}
                className="w-6 h-6 flex items-center justify-center hover:bg-[#252525] transition-colors rounded"
              >
                <IoChevronBack size={12} className="text-[#a0a0a0]" />
              </button>
              
              <h3 className="text-white text-xs font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-6 h-6 flex items-center justify-center hover:bg-[#252525] transition-colors rounded"
              >
                <IoChevronForward size={12} className="text-[#a0a0a0]" />
              </button>
            </div>
            
            <div className="p-3">
              {/* Calendar Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={index} className="text-center text-[10px] text-[#a0a0a0] aspect-square flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const today = new Date();
                  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                  
                  const daysFromPrevMonth = firstDay.getDay();
                  const daysInMonth = lastDay.getDate();
                  const totalDays = daysFromPrevMonth + daysInMonth;
                  const totalCells = Math.ceil(totalDays / 7) * 7;
                  
                  const days = [];
                  
                  // Previous month days
                  for (let i = 0; i < daysFromPrevMonth; i++) {
                    days.push(
                      <div key={`prev-${i}`} className="aspect-square text-center flex items-center justify-center text-[#505050] opacity-30 text-[10px]">
                        {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), -daysFromPrevMonth + i + 1).getDate()}
                      </div>
                    );
                  }
                  
                  // Current month days
                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isCurrentDay = isToday(date);
                    const isSelectedDate = selectedDate === dateStr;
                    
                    // Count slots for this date
                    const slotsForDate = availableSlots.filter(slot => slot.date === dateStr).length;
                    const hasSlots = slotsForDate > 0;
                    
                    days.push(
                      <button
                        key={`current-${i}`}
                        onClick={() => setSelectedDate(hasSlots ? dateStr : 'all')}
                        disabled={!hasSlots}
                        className={`
                          relative aspect-square flex items-center justify-center text-[10px] rounded transition-colors
                          ${isSelectedDate ? 'bg-[#5c46f5] text-white' : ''}
                          ${isCurrentDay && !isSelectedDate ? 'border border-[#5c46f5] text-white' : ''}
                          ${!isSelectedDate && !isCurrentDay && hasSlots ? 'hover:bg-[#252525] text-white' : ''}
                          ${!hasSlots ? 'opacity-30 cursor-not-allowed text-[#505050]' : 'cursor-pointer'}
                        `}
                      >
                        {i}
                        {hasSlots && (
                          <span className="absolute -top-1 -right-1 bg-[#5c46f5] text-white text-[8px] w-3 h-3 rounded-full flex items-center justify-center">
                            {slotsForDate}
                          </span>
                        )}
                      </button>
                    );
                  }
                  
                  // Next month days
                  const remainingCells = totalCells - days.length;
                  for (let i = 1; i <= remainingCells; i++) {
                    days.push(
                      <div key={`next-${i}`} className="aspect-square text-center flex items-center justify-center text-[#505050] opacity-30 text-[10px]">
                        {i}
                      </div>
                    );
                  }
                  
                  return days;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <IoAlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <p className="text-red-500/70 text-xs mt-1">Please try again or contact support</p>
            <button 
              onClick={() => fetchAvailableSlots(true)}
              className="mt-3 px-4 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs rounded-md flex items-center gap-1.5 transition-colors duration-200"
            >
              <IoRefresh size={12} />
              Try Again
            </button>
          </div>
        </div>
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
        
        {/* Loading state */}
        {loading && (
          <div className="bg-[#141414] rounded-lg border border-[#1e1e1e] p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5c46f5]"></div>
            </div>
            <h3 className="text-lg font-medium mb-2">Loading available slots</h3>
            <p className="text-[#a0a0a0] text-sm mb-4">
              Please wait while we fetch the latest available review slots...
            </p>
          </div>
        )}
        
        {/* Error state */}
        {!loading && error && !success && (
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
        )}
        
        {/* No slots available */}
        {!loading && !error && filteredSlots.length === 0 && (
          <div className="bg-[#141414] rounded-lg border border-[#1e1e1e] p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
              <IoCalendar className="h-8 w-8 text-[#505050]" />
            </div>
            <h3 className="text-lg font-medium mb-2">No slots available</h3>
            <p className="text-[#a0a0a0] text-sm mb-4">
              There are no available slots matching your criteria.
            </p>
            <button
              onClick={() => {
                setSelectedClassroom('all');
                setSelectedDate('all');
                setSelectedStage('all');
              }}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0] text-sm rounded-md transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Slot list */}
        {!loading && !error && filteredSlots.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-[#0f0f1a] border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#5c46f5]/30 transition-all duration-200 hover:shadow-lg hover:shadow-[#5c46f5]/5 group"
              >
                <div className="flex p-3">
                  {/* Left side - Time */}
                  <div className="flex-shrink-0 w-1/3 flex flex-col justify-center items-center border-r border-[#1e1e1e] pr-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5c46f5]/10 mb-1">
                      <IoTime size={14} className="text-[#5c46f5]" />
                    </div>
                    <p className="text-sm font-medium text-center">{slot.start_time} - {slot.end_time}</p>
                    <p className="text-[#a0a0a0] text-xs text-center">{slot.duration} min</p>
                  </div>
                  
                  {/* Right side - Details */}
                  <div className="flex-grow pl-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-medium text-sm">{slot.classroom_name}</h4>
                        <span className="text-xs bg-[#5c46f5]/20 text-[#5c46f5] px-2 py-0.5 rounded-full font-medium">
                          {slot.review_stage}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="text-[#a0a0a0] text-xs">{slot.date} ({slot.day})</p>
                        {/* Removed faculty tag */}
                      </div>
                      
                      {slot.booking_deadline && (
                        <div className="flex items-center gap-1 mb-2 text-xs text-yellow-500/80">
                          <IoInformationCircle size={10} className="text-yellow-500" />
                          Book before {new Date(slot.booking_deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleBookSlot(slot.id)}
                      className="w-full bg-gradient-to-r from-[#5c46f5] to-[#4c38e6] hover:from-[#6b56ff] hover:to-[#5c48f6] text-white rounded-md py-2 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <span>Book this slot</span>
                      <IoChevronForward size={12} className="opacity-70" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Booking Confirmation Modal */}
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
            
            {slotToBook && (
              <div className="mb-4 bg-[#0f0f1a] rounded-lg p-4 border border-[#1e1e1e]">
                {availableSlots.filter(slot => slot.id === slotToBook).map(slot => (
                  <div key={slot.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#a0a0a0] text-xs">Classroom:</span>
                      <span className="text-white text-xs font-medium">{slot.classroom_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a0a0a0] text-xs">Date:</span>
                      <span className="text-white text-xs font-medium">{slot.date} ({slot.day})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a0a0a0] text-xs">Time:</span>
                      <span className="text-white text-xs font-medium">{slot.start_time} - {slot.end_time}</span>
                    </div>
                    {/* Faculty information removed */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#a0a0a0] text-xs">Review Stage:</span>
                      <span className="text-white text-xs font-medium">{slot.review_stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
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
                  {teams.map((team, index) => (
                    <option key={team.id || index} value={team.id || ''}>
                      {team.name || 'Unknown Team'} {team.is_leader ? '(Team Leader)' : ''}
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
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
