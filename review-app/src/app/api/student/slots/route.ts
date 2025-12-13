import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      console.error('No authenticated user found');
      return NextResponse.json({ data: [] });
    }
    
    // Get user details from the database
    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', currentUser.id)
      .single();
    
    if (!userData) {
      console.error('User data not found');
      return NextResponse.json({ data: [] });
    }
    
    // Get student's classrooms
    const { data: classroomStudents } = await supabase
      .from('classroom_students')
      .select('classroom_id')
      .eq('student_id', userData.id);
    
    if (!classroomStudents || classroomStudents.length === 0) {
      console.log('Student is not in any classrooms');
      return NextResponse.json({ data: [] });
    }
    
    const classroomIds = classroomStudents.map(cs => cs.classroom_id);
    
    // Get the student's team
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('student_id', userData.id);
    
    const teamIds = teamMembers ? teamMembers.map(tm => tm.team_id) : [];
    
    // Get available slots for the student's classrooms
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select(`
        id,
        day,
        start_time,
        end_time,
        duration,
        review_stage,
        is_available,
        booking_deadline,
        slot_date,
        classroom_id,
        classrooms(id, name),
        bookings(id, team_id)
      `)
      .in('classroom_id', classroomIds)
      .eq('is_available', true)
      .gte('booking_deadline', new Date().toISOString().split('T')[0])
      .order('day')
      .order('start_time');
    
    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
      return NextResponse.json({ data: [] });
    }
    
    // Get classroom details for the slots
    const classroomDetails: Record<string, string> = {};
    if (slots && slots.length > 0) {
      // Get unique classroom IDs
      const classroomIdSet = new Set<string>();
      slots.forEach((slot: any) => {
        if (slot.classroom_id) {
          classroomIdSet.add(slot.classroom_id);
        }
      });
      const classroomIds = Array.from(classroomIdSet);
      
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id, name')
        .in('id', classroomIds);
      
      if (classrooms) {
        classrooms.forEach((classroom: any) => {
          classroomDetails[classroom.id] = classroom.name;
        });
      }
    }
    
    // Get bookings for the slots
    const slotIds = slots ? slots.map((slot: any) => slot.id) : [];
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, slot_id, team_id')
      .in('slot_id', slotIds);
    
    // Create a map of slot_id to bookings
    const bookingsMap: Record<string, any[]> = {};
    if (bookings) {
      bookings.forEach((booking: any) => {
        if (!bookingsMap[booking.slot_id]) {
          bookingsMap[booking.slot_id] = [];
        }
        bookingsMap[booking.slot_id].push(booking);
      });
    }
    
    // Check if team has already booked a slot for each review stage
    const teamBookedStages: Record<string, boolean> = {};
    if (bookings && teamIds.length > 0) {
      // Get all slots for booked slots
      const bookedSlotIds = bookings
        .filter((booking: any) => teamIds.includes(booking.team_id))
        .map((booking: any) => booking.slot_id);
      
      if (bookedSlotIds.length > 0) {
        const { data: bookedSlots } = await supabase
          .from('slots')
          .select('id, review_stage')
          .in('id', bookedSlotIds);
        
        if (bookedSlots) {
          bookedSlots.forEach((slot: any) => {
            teamBookedStages[slot.review_stage] = true;
          });
        }
      }
    }
    
    // Format slots for display
    const formattedSlots = (slots || []).map((slot: any) => {
      const slotBookings = bookingsMap[slot.id] || [];
      
      // Check if this slot is already booked by the student's team
      const isBookedByTeam = slotBookings.some((booking: any) => 
        teamIds.includes(booking.team_id)
      );
      
      // Check if this slot is already booked by someone else
      const isBookedByOthers = slotBookings.length > 0 && !isBookedByTeam;
      
      // Check if team already has a booking for this review stage
      const hasBookingForStage = teamBookedStages[slot.review_stage] && !isBookedByTeam;
      
      return {
        id: slot.id,
        day: slot.day,
        start_time: slot.start_time,
        end_time: slot.end_time,
        time: `${slot.start_time} - ${slot.end_time}`,
        duration: slot.duration,
        classroom_id: slot.classroom_id,
        classroom: classroomDetails[slot.classroom_id] || 'Unknown',
        review_stage: slot.review_stage,
        booking_deadline: slot.booking_deadline,
        is_available: slot.is_available && !isBookedByOthers && !hasBookingForStage,
        slot_date: slot.slot_date,
        bookings: slotBookings,
        is_booked_by_team: isBookedByTeam,
        has_booking_for_stage: hasBookingForStage,
        status: isBookedByTeam ? 'Booked by You' : 
                isBookedByOthers ? 'Booked' : 
                hasBookingForStage ? 'Already Booked for This Stage' :
                'Available'
      };
    });
    
    return NextResponse.json({ data: formattedSlots });
  } catch (error) {
    console.error('Error in student slots API:', error);
    return NextResponse.json({ data: [] });
  }
}
