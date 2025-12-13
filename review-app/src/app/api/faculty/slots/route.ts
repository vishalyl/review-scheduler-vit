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

    console.log('Current user:', currentUser.id);
    
    // First try to get classrooms using the database user ID
    let classroomIds: string[] = [];
    
    // Try to get user from database
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_user_id', currentUser.id)
      .single();
    
    if (userData?.id) {
      // Get classrooms using database user ID
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('faculty_id', userData.id);
      
      if (classrooms && classrooms.length > 0) {
        classroomIds = classrooms.map((c: any) => c.id);
      }
    }
    
    // If no classrooms found with database ID, try with Supabase ID
    if (classroomIds.length === 0) {
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('faculty_id', currentUser.id);
      
      if (classrooms && classrooms.length > 0) {
        classroomIds = classrooms.map((c: any) => c.id);
      }
    }
    
    // If still no classrooms, return empty array
    if (classroomIds.length === 0) {
      console.log('No classrooms found for faculty');
      return NextResponse.json({ data: [] });
    }
    
    console.log('Found classrooms:', classroomIds);
    
    // Fetch slots for these classrooms
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
        classroom_id,
        slot_date,
        created_by,
        classroom:classrooms!classroom_id(id, name),
        bookings:bookings(id, team_id, team:teams!team_id(id, name, project_title))
      `)
      .in('classroom_id', classroomIds)
      .order('day');
    
    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
      return NextResponse.json({ data: [] });
    }
    
    // Format slots for display
    const formattedSlots = (slots || []).map((slot: any) => ({
      id: slot.id,
      day: slot.day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      time: `${slot.start_time} - ${slot.end_time}`,
      duration: slot.duration,
      classroom_id: slot.classroom_id,
      classroom: slot.classroom?.name || 'Unknown',
      review_stage: slot.review_stage,
      booking_deadline: slot.booking_deadline,
      is_available: slot.is_available,
      slot_date: slot.slot_date,
      bookings: slot.bookings || [],
      bookings_count: slot.bookings?.length || 0,
      status: !slot.is_available ? 'Unavailable' : 
              (slot.bookings && slot.bookings.length > 0) ? 'Booked' : 
              'Available'
    }));
    
    return NextResponse.json({ data: formattedSlots });
  } catch (error) {
    console.error('Error in faculty slots API:', error);
    // Return empty array instead of error to prevent UI issues
    return NextResponse.json({ data: [] });
  }
}
