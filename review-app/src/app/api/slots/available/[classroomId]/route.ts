import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { classroomId: string } }
) {
  try {
    const classroomId = params.classroomId;

    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the classroom
    if (userData.role === 'student') {
      const { data: classroomStudent, error: classroomStudentError } = await supabase
        .from('classroom_students')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('student_id', userData.id)
        .single();

      if (classroomStudentError || !classroomStudent) {
        return NextResponse.json(
          { message: 'You are not a member of this classroom' },
          { status: 403 }
        );
      }
    } else if (userData.role === 'faculty') {
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .eq('faculty_id', user.id)
        .single();

      if (classroomError || !classroom) {
        return NextResponse.json(
          { message: 'You do not own this classroom' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { message: 'Invalid user role' },
        { status: 403 }
      );
    }

    // Get available slots for the classroom
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('is_available', true)
      .order('day')
      .order('start_time');

    if (slotsError) {
      return NextResponse.json(
        { message: 'Error fetching slots' },
        { status: 500 }
      );
    }

    // Get teams for the student
    let teams: any[] = [];
    if (userData.role === 'student') {
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          team:team_id(
            id,
            name,
            classroom_id,
            project_title
          ),
          role
        `)
        .eq('student_id', userData.id);

      if (!teamMembersError && teamMembers) {
        teams = teamMembers
          .filter(tm => {
            if (!tm.team) return false;
            const teamData: any = Array.isArray(tm.team) ? tm.team[0] : tm.team;
            return teamData && teamData.classroom_id === parseInt(classroomId);
          })
          .map(tm => {
            const teamData: any = Array.isArray(tm.team) ? tm.team[0] : tm.team;
            return {
              ...teamData,
              isLeader: tm.role === 'leader'
            };
          });
      }
    }

    // Group slots by day
    const slotsByDay: Record<string, any[]> = {};
    slots.forEach(slot => {
      if (!slotsByDay[slot.day]) {
        slotsByDay[slot.day] = [];
      }
      slotsByDay[slot.day].push(slot);
    });

    return NextResponse.json({
      slots,
      slotsByDay,
      teams,
      userRole: userData.role
    });
  } catch (error: any) {
    console.error('Error in available slots API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
