import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Create a Supabase client with admin privileges to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { linkCode } = requestData;

    // Validate required fields
    if (!linkCode) {
      return NextResponse.json(
        { message: 'Missing link code' },
        { status: 400 }
      );
    }

    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Log the received link code for debugging
    console.log('Received link code:', linkCode);

    // Verify the user is authenticated and is a student
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', user.id)
      .single();

    if (userError) {
      console.error('Error getting user details:', userError);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (userData.role !== 'student') {
      return NextResponse.json(
        { message: 'Only students can join classrooms' },
        { status: 403 }
      );
    }

    // Format the link code to ensure it matches the database format
    // The link code in the database includes the hyphen (e.g., 'XXX-XXX')
    let formattedLinkCode = linkCode;

    // Add hyphen if missing (XXX-XXX format)
    if (formattedLinkCode.length === 6 && !formattedLinkCode.includes('-')) {
      formattedLinkCode = `${formattedLinkCode.slice(0, 3)}-${formattedLinkCode.slice(3, 6)}`;
    }

    console.log('Searching for classroom with link code:', formattedLinkCode);

    // First, let's get all classrooms to debug
    const { data: allClassrooms } = await supabaseAdmin
      .from('classrooms')
      .select('id, name, link_code');

    console.log('All classrooms in database:', allClassrooms);

    // Find the classroom by link code using admin client to bypass RLS
    // eslint-disable-next-line prefer-const
    let { data: classroom, error: classroomError } = await supabaseAdmin
      .from('classrooms')
      .select('id, name, link_code')
      .eq('link_code', formattedLinkCode)
      .single();

    if (classroomError || !classroom) {
      console.error('Error finding classroom:', classroomError);
      console.log('Attempted to find classroom with link code:', formattedLinkCode);

      // Try alternative formats as a fallback
      const alternativeCode = formattedLinkCode.replace(/-/g, '');
      console.log('Trying alternative format without hyphen:', alternativeCode);

      const { data: altClassroom, error: altError } = await supabaseAdmin
        .from('classrooms')
        .select('id, name, link_code')
        .or(`link_code.eq.${formattedLinkCode},link_code.eq.${alternativeCode}`)
        .maybeSingle();

      if (altClassroom) {
        console.log('Found classroom with alternative format:', altClassroom);
        // Use this classroom instead
        classroom = altClassroom;
      } else {
        return NextResponse.json(
          { message: 'Classroom not found. Please check the link code and try again.' },
          { status: 404 }
        );
      }
    }

    console.log('Found classroom:', classroom);

    // Check if student is already in the classroom using admin client
    const { data: existingMembership, error: membershipError } = await supabaseAdmin
      .from('classroom_students')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', userData.id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json(
        {
          success: false,
          alreadyJoined: true,
          message: 'You are already a member of this classroom'
        }
      );
    }

    // Join the classroom - use RPC for security but also direct insert as fallback
    try {
      const { data: joinResult, error: joinError } = await supabase.rpc('join_classroom', {
        p_link_code: formattedLinkCode,
        p_user_id: user.id
      });

      if (joinError) {
        throw joinError;
      }

      return NextResponse.json(joinResult);
    } catch (rpcError: any) {
      console.error('RPC error, trying direct insert:', rpcError);

      // Check if the error is because the function doesn't exist
      if (rpcError.message && rpcError.message.includes('function "join_classroom" does not exist')) {
        console.log('RPC function not found, falling back to direct insert');
      } else if (rpcError.message) {
        // If it's another type of error from the RPC function, return it
        return NextResponse.json(
          { message: rpcError.message },
          { status: 400 }
        );
      }

      // Fallback to direct insert if RPC fails - use admin client to bypass RLS
      const { error: insertError } = await supabaseAdmin
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: userData.id
        });

      if (insertError) {
        console.error('Error joining classroom:', insertError);
        return NextResponse.json(
          { message: `Failed to join classroom: ${insertError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyJoined: false,
        classroom_id: classroom.id,
        message: 'Successfully joined classroom'
      });
    }
  } catch (error: any) {
    console.error('Error in classroom joining API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
