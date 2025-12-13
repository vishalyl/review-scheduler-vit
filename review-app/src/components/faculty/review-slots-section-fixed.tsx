'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { IoCalendar, IoTime, IoFunnel, IoSearch, IoCreate, IoClose, IoAlertCircle, IoCheckmarkCircle, IoChevronDown } from 'react-icons/io5';

interface ReviewSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  classroom_id: string;
  classroom_name: string;
  review_stage: string;
  status: string;
  booked_by?: string;
  student_name?: string;
}

interface ReviewSlotsSectionProps {
  userId: string;
}

export default function ReviewSlotsSection({ userId }: ReviewSlotsSectionProps) {
  const [reviewSlots, setReviewSlots] = useState<ReviewSlot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<ReviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [classrooms, setClassrooms] = useState<{id: string, name: string}[]>([]);
  const [cancellingSlot, setCancellingSlot] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [slotToCancel, setSlotToCancel] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  const supabase = createClientComponentClient();
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  // Function to fetch classrooms
  const fetchClassrooms = async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name');
        
      if (error) {
        console.error('Error fetching classrooms:', error);
        return;
      }
      
      setClassrooms(data || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  // Function to fetch review slots
  const fetchReviewSlots = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Get all slots without filtering
      const { data, error } = await supabase
        .from('slots')
        .select(`
          *,
          classrooms(name),
          bookings(id)
        `);
        
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        setReviewSlots([]);
        setFilteredSlots([]);
        setLoading(false);
        return;
      }
      
      // Format the data
      const formattedSlots: ReviewSlot[] = data.map((slot: any) => {
        const booking = slot.bookings && slot.bookings.length > 0 ? slot.bookings[0] : null;
        
        // Debug the raw slot data
        console.log('Raw slot data:', slot);
        
        return {
          id: slot.id,
          date: slot.day || 'Unknown Date',
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration: slot.duration,
          classroom_id: String(slot.classroom_id), // Ensure it's a string
          classroom_name: slot.classrooms?.name || 'Unknown',
          review_stage: slot.review_stage,
          status: booking ? 'Booked' : 'Available',
          booked_by: booking ? booking.id : undefined,
          student_name: booking ? 'Student' : undefined
        };
      });
      
      // Extract unique dates for the date filter
      const uniqueDates = Array.from(new Set(formattedSlots.map(slot => slot.date))).sort();
      setAvailableDates(uniqueDates);
      
      setReviewSlots(formattedSlots);
      setFilteredSlots(formattedSlots);
      
      // Get all classrooms
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, name');
        
      if (classroomError) {
        console.error('Error fetching classrooms:', classroomError);
      } else {
        setClassrooms(classroomData || []);
      }
    } catch (error: any) {
      console.error('Error fetching review slots:', error);
      setError('Failed to load review slots. Please try again.');
      setReviewSlots([]);
      setFilteredSlots([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch review slots on component mount
  useEffect(() => {
    fetchReviewSlots();
  }, [userId]);
  
  // Function to apply filters
  const applyFilters = () => {
    let filtered = [...reviewSlots];
    console.log('All slots before filtering:', filtered);
    console.log('Selected classroom:', selectedClassroom);
    
    // Filter by classroom
    if (selectedClassroom !== 'all') {
      // Convert both to strings for comparison to avoid type mismatches
      filtered = filtered.filter(slot => String(slot.classroom_id) === String(selectedClassroom));
      console.log('Slots after classroom filtering:', filtered);
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
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        slot =>
          (slot.classroom_name && slot.classroom_name.toLowerCase().includes(query)) ||
          (slot.date && slot.date.toLowerCase().includes(query)) ||
          (slot.start_time && slot.start_time.toLowerCase().includes(query)) ||
          (slot.end_time && slot.end_time.toLowerCase().includes(query)) ||
          (slot.review_stage && slot.review_stage.toLowerCase().includes(query))
      );
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.start_time);
      const dateB = new Date(b.date + ' ' + b.start_time);
      return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
    
    setFilteredSlots(filtered);
  };

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [reviewSlots, selectedClassroom, selectedStage, selectedDate, searchQuery, sortOrder]);
  
  // Show cancel confirmation dialog
  const showCancelConfirmation = (slotId: string) => {
    setSlotToCancel(slotId);
    setShowCancelConfirm(true);
  };
  
  // Cancel a review slot
  const cancelReviewSlot = async (slotId: string) => {
    try {
      setCancellingSlot(slotId);
      setShowCancelConfirm(false);
      
      // Check if the slot is booked
      const slot = reviewSlots.find(s => s.id === slotId);
      if (slot?.status === 'Booked') {
        // Delete the booking first
        const { error: bookingError } = await supabase
          .from('bookings')
          .delete()
          .eq('slot_id', slotId);
          
        if (bookingError) {
          throw bookingError;
        }
        
        // Send notification to student (in a real app, this would be an API call or email service)
        console.log(`Notification sent to student: Your booking for ${slot.date} at ${slot.start_time} has been cancelled.`);
        
        // In a real implementation, you would use an email service or notification system
        // For example:
        // await sendEmail({
        //   to: studentEmail,
        //   subject: 'Review Slot Cancelled',
        //   body: `Your booking for ${slot.date} at ${slot.start_time} has been cancelled.`
        // });
      }
      
      // Delete the review slot
      const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', slotId);
        
      if (error) {
        throw error;
      }
      
      // Update the UI
      setReviewSlots(reviewSlots.filter(s => s.id !== slotId));
      setFilteredSlots(filteredSlots.filter(s => s.id !== slotId));
      setSuccess('Review slot cancelled successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error cancelling review slot:', error);
      setError('Failed to cancel review slot. Please try again.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setCancellingSlot(null);
      setSlotToCancel(null);
    }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full"
    >
      {/* Error and success messages */}
      {error && (
        <motion.div
          variants={itemVariants}
          className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden max-w-3xl mx-auto mb-4 p-4 flex items-center gap-2"
        >
          <IoAlertCircle size={16} className="text-[#f87171]" />
          <span className="text-[#f87171] text-sm">{error}</span>
        </motion.div>
      )}
      
      {success && (
        <motion.div
          variants={itemVariants}
          className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden max-w-3xl mx-auto mb-4 p-4 flex items-center gap-2"
        >
          <IoCheckmarkCircle size={16} className="text-[#4ade80]" />
          <span className="text-[#4ade80] text-sm">{success}</span>
        </motion.div>
      )}
      
      <motion.div
        variants={itemVariants}
        className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden max-w-5xl mx-auto"
      >
        <div className="border-b border-[#1e1e1e] p-4">
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <IoSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a0a0a0]" />
                <input
                  type="text"
                  placeholder="Search slots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:border-[#5c46f5] focus:outline-none transition-colors"
                />
              </div>
            </div>
            
            <div>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-[#5c46f5] focus:outline-none transition-colors appearance-none"
                >
                  <option value="all">All Dates</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <IoChevronDown size={16} className="text-[#a0a0a0]" />
                </div>
              </div>
            </div>
            
            <div>
              <div className="relative">
                <select
                  value={selectedClassroom}
                  onChange={(e) => {
                    console.log('Selected classroom changed to:', e.target.value);
                    setSelectedClassroom(e.target.value);
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-[#5c46f5] focus:outline-none transition-colors appearance-none"
                >
                  <option value="all">All Classrooms</option>
                  {classrooms.map(classroom => {
                    console.log('Classroom option:', classroom.id, classroom.name);
                    return (
                      <option key={classroom.id} value={String(classroom.id)}>
                        {classroom.name}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <IoChevronDown size={16} className="text-[#a0a0a0]" />
                </div>
              </div>
            </div>
            
            <div>
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-[#5c46f5] focus:outline-none transition-colors appearance-none"
                >
                  <option value="all">All Stages</option>
                  <option value="Review 1">Review 1</option>
                  <option value="Review 2">Review 2</option>
                  <option value="Review 3">Review 3</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <IoChevronDown size={16} className="text-[#a0a0a0]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Slots table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5c46f5] border-t-transparent"></div>
              <p className="mt-2 text-[#a0a0a0] text-sm">Loading review slots...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-[#f87171] mb-2">{error}</p>
              <button 
                onClick={() => fetchReviewSlots()}
                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm hover:bg-[#252525] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#a0a0a0] mb-4">No review slots found</p>
              <p className="text-xs text-[#505050] mb-6">
                {reviewSlots.length > 0 
                  ? 'Try adjusting your filters' 
                  : 'Go to the Timetable tab to publish review slots'}
              </p>
              <button 
                onClick={() => {
                  // Use the tab navigation instead of directly manipulating DOM
                  const tabsContainer = document.querySelector('[role="tablist"]');
                  if (tabsContainer) {
                    const timetableTab = Array.from(tabsContainer.querySelectorAll('button'))
                      .find(button => button.textContent?.includes('Timetable'));
                    if (timetableTab) {
                      (timetableTab as HTMLButtonElement).click();
                    }
                  }
                }}
                className="px-4 py-2 bg-[#5c46f5] text-white rounded-lg text-sm hover:bg-[#4c38e6] transition-colors inline-flex items-center gap-2"
              >
                <IoCalendar size={16} />
                Go to Timetable
              </button>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border border-[#1e1e1e] bg-[#141414]">
              <div className="grid grid-cols-6 bg-[#1a1a1a] text-[#a0a0a0] text-xs uppercase font-medium py-3 px-4">
                <div className="pl-1">Time Slot</div>
                <div className="text-center">Duration</div>
                <div className="text-center">Classroom</div>
                <div className="text-center">Review Stage</div>
                <div className="text-center">Status</div>
                <div className="text-center">Actions</div>
              </div>
              
              {filteredSlots.map((slot, index) => (
                <div 
                  key={slot.id} 
                  className={`grid grid-cols-6 text-sm py-4 px-4 items-center ${index % 2 === 0 ? 'bg-[#141414]' : 'bg-[#161616]'} hover:bg-[#1a1a1a] transition-colors`}
                >
                  <div className="pl-1">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{slot.date}</span>
                      <span className="text-[#a0a0a0] text-xs mt-1">{slot.start_time} - {slot.end_time}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <span className="px-2 py-1 rounded-md bg-[#1a1a1a] text-[#a0a0a0] text-xs">{slot.duration} mins</span>
                  </div>
                  
                  <div className="text-center">
                    <span className="font-medium text-white">{slot.classroom_name}</span>
                  </div>
                  
                  <div className="text-center">
                    <span className="px-2 py-1 rounded-md bg-[#1a1a1a] text-[#5c46f5] text-xs font-medium">{slot.review_stage}</span>
                  </div>
                  
                  <div className="text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      slot.status === 'Booked' 
                        ? 'bg-[#422006] text-[#f59e0b]' 
                        : 'bg-[#042f14] text-[#4ade80]'
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      className="p-2 rounded-full hover:bg-[#252525] text-[#a0a0a0] hover:text-white transition-colors"
                      title="Edit"
                    >
                      <IoCreate size={16} />
                    </button>
                    <button 
                      className="p-2 rounded-full hover:bg-[#2d1515] text-[#f87171] hover:text-[#ef4444] transition-colors"
                      title="Cancel"
                      onClick={() => showCancelConfirmation(slot.id)}
                      disabled={cancellingSlot === slot.id}
                    >
                      {cancellingSlot === slot.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#f87171] border-t-transparent"></div>
                      ) : (
                        <IoClose size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-white text-lg font-medium mb-4">Cancel Review Slot</h3>
            <p className="text-[#a0a0a0] mb-6">
              Are you sure you want to cancel this review slot? 
              {reviewSlots.find(s => s.id === slotToCancel)?.status === 'Booked' && (
                <span className="text-[#f87171] block mt-2">
                  This slot is currently booked. The student will be notified of the cancellation.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-[#252525] text-white rounded-lg text-sm hover:bg-[#303030] transition-colors"
                onClick={() => setShowCancelConfirm(false)}
              >
                No, Keep It
              </button>
              <button
                className="px-4 py-2 bg-[#b91c1c] text-white rounded-lg text-sm hover:bg-[#991b1b] transition-colors"
                onClick={() => slotToCancel && cancelReviewSlot(slotToCancel)}
              >
                Yes, Cancel Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
