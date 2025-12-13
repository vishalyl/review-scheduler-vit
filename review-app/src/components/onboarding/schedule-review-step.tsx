import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoCalendar, IoTime, IoCheckmark, IoAlertCircle, IoSync, IoChevronForward } from 'react-icons/io5';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useOnboarding } from './onboarding-context';

interface ScheduleReviewStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Slot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  faculty_id: string;
  faculty_name?: string;
  review_stage: string;
  is_booked?: boolean;
}

interface Team {
  id: number;
  name: string;
  classroom_id: number;
  classroom_name?: string;
}

export default function ScheduleReviewStep({ onComplete, onSkip }: ScheduleReviewStepProps) {
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedReviewStage, setSelectedReviewStage] = useState<string>('REVIEW_1');

  const { markReviewScheduled } = useOnboarding();
  const supabase = createClientComponentClient();

  // Fetch teams and available slots
  useEffect(() => {
    async function fetchData() {
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

        // Get user's teams
        const { data: teamData, error: teamError } = await supabase
          .from('team_members')
          .select(`
            team:team_id(
              id,
              name,
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
        const formattedTeams: Team[] = [];

        if (teamData && teamData.length > 0) {
          teamData.forEach(item => {
            const team: any = Array.isArray(item.team) ? item.team[0] : item.team;
            if (team) {
              formattedTeams.push({
                id: team.id,
                name: team.name,
                classroom_id: team.classroom_id,
                classroom_name: team.classroom?.name || 'Unknown'
              });
            }
          });
        }

        setTeams(formattedTeams);

        // If there's only one team, select it by default
        if (formattedTeams.length === 1) {
          setSelectedTeam(formattedTeams[0].id);
        }

        // Fetch available slots
        const response = await fetch('/api/student/slots');

        if (!response.ok) {
          throw new Error('Failed to fetch available slots');
        }

        const { data } = await response.json();
        setAvailableSlots(data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load teams and available slots. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to format time
  const formatTime = (timeString: string) => {
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Function to book a slot
  const bookSlot = async () => {
    if (!selectedTeam) {
      setError('Please select a team');
      return;
    }

    if (!selectedSlot) {
      setError('Please select a slot');
      return;
    }

    try {
      setBookingLoading(true);
      setError(null);

      // Check if the team already has a booking for this review stage
      const { data: existingBookings, error: bookingCheckError } = await supabase
        .from('bookings')
        .select(`
          id,
          slot_id,
          slot:slot_id(review_stage)
        `)
        .eq('team_id', selectedTeam);

      if (bookingCheckError) {
        throw bookingCheckError;
      }

      const hasBookingForStage = existingBookings?.some(
        (booking: any) => booking.slot?.review_stage === selectedReviewStage
      );

      if (hasBookingForStage) {
        setError(`Your team already has a booking for ${selectedReviewStage.replace('_', ' ')}. You can only have one booking per review stage.`);
        return;
      }

      // Create a booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          slot_id: selectedSlot,
          team_id: selectedTeam,
          created_at: new Date().toISOString()
        });

      if (bookingError) {
        throw bookingError;
      }

      // Update onboarding status
      markReviewScheduled();

      // Show success message
      setSuccess(true);

      // Complete the step after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Error booking slot:', error);
      setError('Failed to book the slot. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Filter slots by review stage
  const filteredSlots = availableSlots.filter(slot =>
    slot.review_stage === selectedReviewStage && !slot.is_booked
  );

  // Group slots by date
  const slotsByDate = filteredSlots.reduce((acc: Record<string, Slot[]>, slot) => {
    const date = slot.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 w-full max-w-md mx-auto"
    >
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <IoCalendar className="text-green-400" size={24} />
        </div>
      </div>

      <h3 className="text-xl font-medium text-center mb-2">Schedule Your First Review</h3>
      <p className="text-[#a0a0a0] text-sm text-center mb-6">
        Book a time slot for your team's first project review
      </p>

      {success ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <IoCheckmark className="text-green-400 mr-2" size={18} />
            <p className="text-green-400 text-sm font-medium">
              Review scheduled successfully!
            </p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <IoAlertCircle className="text-red-400 mr-2" size={18} />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <IoSync className="animate-spin text-green-400 mr-2" size={24} />
              <p className="text-[#a0a0a0]">Loading available slots...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Selection */}
              <div>
                <label htmlFor="team" className="block text-sm font-medium mb-2">
                  Select Your Team
                </label>
                {teams.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-400 text-xs">
                      You need to join or create a team before scheduling a review
                    </p>
                  </div>
                ) : (
                  <select
                    id="team"
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    disabled={bookingLoading || teams.length === 0}
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} {team.classroom_name ? `(${team.classroom_name})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Review Stage Selection */}
              <div>
                <label htmlFor="reviewStage" className="block text-sm font-medium mb-2">
                  Review Stage
                </label>
                <select
                  id="reviewStage"
                  value={selectedReviewStage}
                  onChange={(e) => setSelectedReviewStage(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  disabled={bookingLoading || teams.length === 0}
                >
                  <option value="REVIEW_1">Review 1</option>
                  <option value="REVIEW_2">Review 2</option>
                  <option value="REVIEW_3">Review 3</option>
                </select>
              </div>

              {/* Available Slots */}
              <div>
                <h4 className="text-sm font-medium mb-2">Available Slots</h4>

                {Object.keys(slotsByDate).length === 0 ? (
                  <div className="bg-[#1a1a1a] border border-[#252525] rounded-lg p-4 text-center">
                    <p className="text-[#a0a0a0] text-sm mb-2">No slots available for {selectedReviewStage.replace('_', ' ')}</p>
                    <p className="text-xs text-[#a0a0a0]">Try selecting a different review stage</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(slotsByDate).map(([date, slots]) => (
                      <div key={date} className="bg-[#1a1a1a] border border-[#252525] rounded-lg p-4">
                        <h5 className="text-sm font-medium mb-3 flex items-center">
                          <IoCalendar size={14} className="text-green-400 mr-2" />
                          {formatDate(date)}
                        </h5>

                        <div className="space-y-2">
                          {slots.map((slot) => (
                            <div
                              key={slot.id}
                              onClick={() => !bookingLoading && setSelectedSlot(slot.id)}
                              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors duration-200 ${selectedSlot === slot.id
                                  ? 'bg-green-500/20 border border-green-500/30'
                                  : 'bg-[#252525] hover:bg-[#2a2a2a] border border-transparent'
                                }`}
                            >
                              <div className="flex items-center">
                                <IoTime size={14} className="text-[#a0a0a0] mr-2" />
                                <span className="text-sm">
                                  {formatTime(slot.time_start)} - {formatTime(slot.time_end)}
                                </span>
                              </div>

                              {selectedSlot === slot.id && (
                                <IoCheckmark size={14} className="text-green-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="button"
                  onClick={bookSlot}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  disabled={bookingLoading || !selectedTeam || !selectedSlot || teams.length === 0}
                >
                  {bookingLoading ? (
                    <IoSync className="animate-spin mr-2" size={16} />
                  ) : (
                    <IoCalendar className="mr-2" size={16} />
                  )}
                  Schedule Review
                </button>

                <button
                  type="button"
                  onClick={onSkip}
                  className="text-[#a0a0a0] text-sm hover:text-white transition-colors duration-200"
                  disabled={bookingLoading}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
