import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get request body
    const userData = await request.json();
    
    // Validate required fields
    if (!userData.supabase_user_id || !userData.email || !userData.name || !userData.role) {
      return NextResponse.json(
        { error: 'Missing required user data' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Insert user data with admin privileges
    const { error } = await supabaseAdmin.from('users').insert({
      supabase_user_id: userData.supabase_user_id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      department: userData.department,
      roll_number: userData.roll_number,
    });
    
    if (error) {
      console.error('Error creating user in database:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Server error in create-user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
