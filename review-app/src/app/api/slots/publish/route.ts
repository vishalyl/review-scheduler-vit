import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { classroomId, slots, duration, reviewStage, bookingDeadline } = requestData;

    // Validate required fields
    if (!classroomId || !slots || !duration || !reviewStage || !bookingDeadline) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Verify the user is authenticated and is a faculty
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is faculty
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_user_id', user.id)
      .single();

    if (userError || userData?.role !== 'faculty') {
      return NextResponse.json(
        { message: 'Only faculty can publish slots' },
        { status: 403 }
      );
    }

    // Add debug logging
    console.log('Publishing slots with data:', {
      classroomId,
      slotsCount: slots.length,
      slotsExample: slots[0],
      duration,
      bookingDeadline
    });


    // The publish_review_slots RPC function handles the booking deadline update
    // No need to update it separately here

    // Use the publish_review_slots function to insert slots
    const { data: result, error: publishError } = await supabase.rpc(
      'publish_review_slots',
      {
        p_classroom_id: parseInt(classroomId),
        p_slots: slots, // Pass the array directly, not as JSON string
        p_duration: parseInt(duration),
        p_review_stage: reviewStage,
        p_booking_deadline: bookingDeadline,
        p_created_by: user.id
      }
    );

    if (publishError) {
      console.error('Error publishing slots:', publishError);
      return NextResponse.json(
        { message: `Failed to publish slots: ${publishError.message}` },
        { status: 500 }
      );
    }

    // Log activity
    try {
      // Get user ID from database
      const { data: userIdData } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', user.id)
        .single();

      if (userIdData) {
        await supabase.from('activities').insert({
          user_id: userIdData.id,
          activity_type: 'slots_published',
          entity_id: parseInt(classroomId),
          entity_name: reviewStage,
          details: {
            count: slots.length,
            review_stage: reviewStage,
            duration: duration
          }
        });
      }
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in slots publishing API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
