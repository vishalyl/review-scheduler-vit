import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Create a Supabase client with admin privileges to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { facultyId } = await request.json();
    
    if (!facultyId) {
      return NextResponse.json(
        { error: 'Missing faculty ID' },
        { status: 400 }
      );
    }
    
    // Query the users table to get the faculty name
    const { data: facultyData, error } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('supabase_user_id', facultyId)
      .single();
    
    if (error) {
      console.error('Error fetching faculty name:', error);
      return NextResponse.json(
        { error: 'Failed to fetch faculty name' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      name: facultyData?.name || 'Unknown Faculty'
    });
  } catch (error: any) {
    console.error('Error in get-faculty-name API:', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
