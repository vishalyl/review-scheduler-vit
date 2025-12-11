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

    // Verify the user is authenticated and is a faculty
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is faculty and owns this classroom
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_user_id', user.id)
      .single();

    if (userData?.role !== 'faculty') {
      return NextResponse.json(
        { message: 'Only faculty can access classroom data' },
        { status: 403 }
      );
    }

    // Check if classroom exists and belongs to this faculty
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .eq('faculty_id', user.id)
      .single();

    if (classroomError) {
      return NextResponse.json(
        { message: 'Classroom not found or access denied' },
        { status: 404 }
      );
    }

    // Get all students in the classroom using the stored procedure
    const { data: classroomStudentsData, error: studentsRpcError } = await supabase.rpc(
      'get_classroom_students_direct',
      { p_classroom_id: parseInt(classroomId) }
    );

    if (studentsRpcError) {
      console.error('Error fetching students with RPC:', studentsRpcError);

      // Fallback to direct query if RPC fails
      const { data: classroomStudents, error: studentsError } = await supabase
        .from('classroom_students')
        .select(`
          student_id,
          student:student_id(
            id,
            name,
            email,
            roll_number
          )
        `)
        .eq('classroom_id', classroomId);

      if (studentsError) {
        console.error('Error fetching students with direct query:', studentsError);
        return NextResponse.json(
          { message: 'Error fetching students' },
          { status: 500 }
        );
      }

      // Format the students data from direct query
      const formattedStudents = (classroomStudents || [])
        .filter(cs => cs.student) // Filter out any null students
        .map(cs => {
          const student: any = cs.student || {};
          return {
            id: student.id,
            name: student.name,
            email: student.email,
            roll_number: student.roll_number,
            team: null as any // Allow re-assignment later
          };
        });

      // Log for debugging
      console.log('Formatted students from direct query:', formattedStudents);

      // Continue with the rest of the function using formattedStudents

      // Get all teams in the classroom
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          project_title
        `)
        .eq('classroom_id', classroomId);

      if (teamsError) {
        return NextResponse.json(
          { message: 'Error fetching teams' },
          { status: 500 }
        );
      }

      // Get team members using direct SQL query to bypass RLS
      const { data: teamMembersResult, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          student_id,
          role,
          student:student_id(
            id,
            name,
            email,
            roll_number
          )
        `)
        .in('team_id', teams.map(t => t.id) || []);

      if (teamMembersError) {
        return NextResponse.json(
          { message: `Error fetching team members: ${teamMembersError.message}` },
          { status: 500 }
        );
      }

      // Ensure we have valid data
      const teamMembers = teamMembersResult || [];

      // Format the data
      const formattedTeams = teams.map(team => {
        const members = teamMembers
          .filter(tm => tm.team_id === team.id && tm.student)
          .map(tm => {
            const student: any = tm.student || {};
            return {
              id: student.id,
              name: student.name,
              email: student.email,
              roll_number: student.roll_number,
              role: tm.role
            };
          });

        return {
          ...team,
          members_count: members.length,
          members
        };
      });

      // Update students with team info
      for (const student of formattedStudents) {
        for (const team of formattedTeams) {
          const memberInfo = team.members.find(m => m.id === student.id);
          if (memberInfo) {
            student.team = {
              id: team.id,
              name: team.name,
              project_title: team.project_title,
              role: memberInfo.role
            };
            break;
          }
        }
      }

      return NextResponse.json({
        classroom,
        students: formattedStudents,
        teams: formattedTeams
      });
    }

    // If RPC was successful, format the students data
    const formattedStudents = (classroomStudentsData || []).map((student: any) => ({
      id: student.student_id,
      name: student.student_name,
      email: student.student_email,
      roll_number: student.student_roll_number,
      team: null as any // Will be populated later
    }));

    // Log for debugging
    console.log('Formatted students from RPC:', formattedStudents);

    // We'll skip fetching teams here and let the dedicated teams endpoint handle it
    // This avoids any relationship issues

    // Get team memberships for students to know which team they belong to
    const { data: teamMemberships, error: teamMembershipsError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        student_id,
        role,
        team:team_id(id, name, project_title)
      `)
      .in('student_id', formattedStudents.map((student: any) => student.id));

    if (!teamMembershipsError && teamMemberships) {
      // Update students with team info
      for (const student of formattedStudents) {
        const membership = teamMemberships.find(tm => tm.student_id === student.id && tm.team);
        if (membership) {
          student.team = {
            id: membership.team.id,
            name: membership.team.name,
            project_title: membership.team.project_title,
            role: membership.role
          };
        }
      }
    }

    return NextResponse.json({
      classroom,
      students: formattedStudents
    });
  } catch (error: any) {
    console.error('Error in classroom data API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
