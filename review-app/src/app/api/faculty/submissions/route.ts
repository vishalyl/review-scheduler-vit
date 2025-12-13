import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', currentUser.id)
      .single();

    if (userError || userData.role !== 'faculty') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get faculty's classrooms
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('faculty_id', userData.id);

    if (classroomsError) {
      return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 });
    }

    // Get classroom IDs
    const classroomIds = classrooms.map(classroom => classroom.id);

    if (classroomIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get teams in these classrooms
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .in('classroom_id', classroomIds);

    if (teamsError) {
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    // Get team IDs
    const teamIds = teams.map(team => team.id);

    if (teamIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch submissions for faculty's teams
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        title,
        description,
        file_url,
        created_at,
        status,
        team:team_id(
          id, 
          name, 
          project_title,
          classroom:classroom_id(
            id,
            name
          )
        )
      `)
      .in('team_id', teamIds)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    // Format submissions data
    const formattedSubmissions = submissions.map((submission: any) => {
      // Safely access nested properties
      const team = submission.team || {};
      const classroom = team.classroom || {};
      
      return {
        id: submission.id,
        title: submission.title,
        description: submission.description,
        file_url: submission.file_url,
        created_at: submission.created_at,
        formatted_date: new Date(submission.created_at).toLocaleDateString(),
        team_name: team.name || 'Unknown',
        project_title: team.project_title || 'Unknown',
        classroom_id: classroom.id || null,
        classroom_name: classroom.name || 'Unknown',
        status: submission.status || 'Pending'
      };
    });

    return NextResponse.json({ data: formattedSubmissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
