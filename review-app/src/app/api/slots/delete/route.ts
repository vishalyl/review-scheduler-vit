import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { slotId } = await request.json();
    
    if (!slotId) {
      return NextResponse.json(
        { error: 'Slot ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Attempting to delete slot with ID: ${slotId}`);
    
    // First, check if the slot has any bookings
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('slot_id', slotId);
      
    if (bookingsError) {
      console.error('API: Error checking for bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to check for bookings', details: bookingsError },
        { status: 500 }
      );
    }
    
    // If there are bookings, delete them first
    if (bookings && bookings.length > 0) {
      console.log(`API: Deleting ${bookings.length} bookings for slot ${slotId}`);
      
      const { error: deleteBookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('slot_id', slotId);
        
      if (deleteBookingsError) {
        console.error('API: Error deleting bookings:', deleteBookingsError);
        return NextResponse.json(
          { error: 'Failed to delete bookings', details: deleteBookingsError },
          { status: 500 }
        );
      }
      
      console.log('API: Successfully deleted bookings');
    }
    
    // Now delete the slot
    const { error: deleteSlotError } = await supabaseAdmin
      .from('slots')
      .delete()
      .eq('id', slotId);
      
    if (deleteSlotError) {
      console.error('API: Error deleting slot:', deleteSlotError);
      return NextResponse.json(
        { error: 'Failed to delete slot', details: deleteSlotError },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully deleted slot with ID: ${slotId}`);
    
    return NextResponse.json({ success: true, message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    );
  }
}
