import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const classroomId = params.id;

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

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_user_id', user.id)
      .single();

    // Verify classroom exists and user has access
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('id', classroomId)
      .single();

    if (classroomError) {
      return NextResponse.json(
        { message: 'Classroom not found' },
        { status: 404 }
      );
    }

    // For faculty, verify they own the classroom
    if (userData?.role === 'faculty') {
      const { data: facultyClassroom } = await supabase
        .from('classrooms')
        .select('id')
        .eq('id', classroomId)
        .eq('faculty_id', user.id)
        .single();

      if (!facultyClassroom) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // For students, verify they are in the classroom
    if (userData?.role === 'student') {
      const { data: studentClassroom } = await supabase
        .from('classroom_students')
        .select('classroom_id')
        .eq('classroom_id', classroomId)
        .eq('student_id', user.id)
        .single();

      if (!studentClassroom) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Get all teams for the classroom using a direct query
    // This avoids the relationship error by not using nested queries
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, project_title')
      .eq('classroom_id', classroomId);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json(
        { message: 'Error fetching teams' },
        { status: 500 }
      );
    }

    // Get team members for these teams
    const teamIds = teams.map(team => team.id);

    // Skip if no teams exist
    if (teamIds.length === 0) {
      return NextResponse.json({ teams: [] });
    }

    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        student_id,
        role
      `)
      .in('team_id', teamIds);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return NextResponse.json(
        { message: 'Error fetching team members' },
        { status: 500 }
      );
    }

    // Get all student IDs from team members
    const studentIds = Array.from(new Set(teamMembers.map(tm => tm.student_id)));

    // Skip if no students exist
    if (studentIds.length === 0) {
      const formattedTeams = teams.map(team => ({
        ...team,
        members_count: 0,
        members: []
      }));

      return NextResponse.json({ teams: formattedTeams });
    }

    // Get student details
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, name, email, roll_number')
      .in('id', studentIds);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { message: 'Error fetching student details' },
        { status: 500 }
      );
    }

    // Create a map of student details for quick lookup
    const studentMap: Record<string, any> = {};
    students.forEach(student => {
      studentMap[student.id] = student;
    });

    // Format teams with their members
    const formattedTeams = teams.map(team => {
      const members = teamMembers
        .filter(tm => tm.team_id === team.id)
        .map(tm => {
          const student = studentMap[tm.student_id];
          return {
            id: tm.student_id,
            name: student?.name || 'Unknown',
            email: student?.email || '',
            roll_number: student?.roll_number || '',
            role: tm.role
          };
        });

      return {
        ...team,
        members_count: members.length,
        members
      };
    });

    return NextResponse.json({ teams: formattedTeams });
  } catch (error: any) {
    console.error('Error in teams API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
