import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { slotId, teamId } = requestData;
    
    // Validate required fields
    if (!slotId || !teamId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated and is a student
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify user is a student and is a team leader
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', user.id)
      .single();
      
    if (userError || userData?.role !== 'student') {
      return NextResponse.json(
        { message: 'Only students can book slots' },
        { status: 403 }
      );
    }
    
    // Verify user is a team leader
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('student_id', userData.id)
      .eq('team_id', teamId)
      .eq('role', 'leader')
      .single();
      
    if (teamMemberError || !teamMember) {
      return NextResponse.json(
        { message: 'Only team leaders can book slots' },
        { status: 403 }
      );
    }
    
    // Verify slot is available
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .eq('is_available', true)
      .single();
      
    if (slotError || !slot) {
      return NextResponse.json(
        { message: 'Slot not available' },
        { status: 400 }
      );
    }
    
    // Check if team already has a booking for this review stage
    const { data: existingBooking, error: existingBookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_confirmed', true)
      .single();
      
    if (existingBooking) {
      return NextResponse.json(
        { message: 'Team already has a booking for this review stage' },
        { status: 400 }
      );
    }
    
    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        slot_id: slotId,
        team_id: teamId,
        is_confirmed: true,
        created_by: user.id
      })
      .select()
      .single();
      
    if (bookingError) {
      return NextResponse.json(
        { message: `Failed to book slot: ${bookingError.message}` },
        { status: 500 }
      );
    }
    
    // Update slot availability
    const { error: updateError } = await supabase
      .from('slots')
      .update({ is_available: false })
      .eq('id', slotId);
      
    if (updateError) {
      // If we fail to update slot availability, still return success but log the error
      console.error('Failed to update slot availability:', updateError);
    }
    
    // Log activity
    try {
      await supabase.from('activities').insert({
        user_id: userData.id,
        activity_type: 'slot_booked',
        entity_id: slotId,
        entity_name: 'slot',
        details: {
          team_id: teamId,
          slot_day: slot.day,
          slot_time: `${slot.start_time} - ${slot.end_time}`,
          review_stage: slot.review_stage
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Slot booked successfully',
      booking
    });
  } catch (error: any) {
    console.error('Error in slot booking API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
