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
    const { name, faculty_id, link_code, review_deadlines } = requestData;
    
    // Validate required fields
    if (!name || !faculty_id || !link_code) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with the user's cookies for authentication
    const supabase = createRouteHandlerClient({ cookies });
    
    // We'll use the admin client for database operations to bypass RLS
    
    // Verify the user is authenticated and is a faculty
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's database ID to verify authorization
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('supabase_user_id', user.id)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json(
        { message: `Failed to get user data: ${userError?.message || 'User not found'}` },
        { status: 500 }
      );
    }
    
    // Verify the user is creating a classroom for themselves
    // Note: faculty_id is now the database ID (integer) sent from the frontend
    if (userData.id !== faculty_id) {
      return NextResponse.json(
        { message: 'You can only create classrooms for yourself' },
        { status: 403 }
      );
    }
    
    // Log the faculty_id type for debugging
    console.log('Received faculty_id:', faculty_id, 'Type:', typeof faculty_id);
    
    // Get the user's Supabase Auth ID for the insert
    const { data: authIdData, error: authIdError } = await supabaseAdmin
      .from('users')
      .select('supabase_user_id')
      .eq('id', faculty_id)
      .single();
      
    if (authIdError || !authIdData) {
      return NextResponse.json(
        { message: `Failed to get user auth ID: ${authIdError?.message || 'User not found'}` },
        { status: 500 }
      );
    }
    
    // Get the Supabase Auth UUID to use in the database
    const supabaseAuthId = authIdData.supabase_user_id;
    
    // Check if link code is already in use
    const { data: existingClassroom, error: checkError } = await supabaseAdmin
      .from('classrooms')
      .select('id')
      .eq('link_code', link_code)
      .maybeSingle(); // Use maybeSingle to avoid error if no results
      
    if (existingClassroom) {
      return NextResponse.json(
        { message: 'Link code is already in use. Please try a different code.' },
        { status: 400 }
      );
    }
    
    // Try to use the RPC function first
    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('create_classroom', {
        p_name: name,
        p_faculty_id: supabaseAuthId,
        p_link_code: link_code,
        p_review_deadlines: review_deadlines
      });
      
      if (!rpcError && rpcData) {
        return NextResponse.json(rpcData);
      }
      
      // Log RPC error and continue with direct insert
      console.log('RPC function failed, using direct insert:', rpcError);
    } catch (rpcException) {
      console.error('Exception in RPC call:', rpcException);
    }
    
    // Fall back to direct insert if RPC fails
    console.log('Using direct insert approach');
    
    // Insert the classroom with the correct UUID
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('classrooms')
      .insert({
        name: name,
        faculty_id: supabaseAuthId, // Use the Supabase Auth UUID
        link_code: link_code,
        review_deadlines: review_deadlines
      })
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json(
        { message: `Failed to create classroom: ${insertError.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(insertData);
  } catch (error: any) {
    console.error('Error in classroom creation API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
