import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// User operations
export async function createUser(userData: {
  supabaseUserId: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  rollNumber?: string;
}) {
  return supabase.from('users').insert({
    supabase_user_id: userData.supabaseUserId,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    department: userData.department,
    roll_number: userData.rollNumber,
  } as any);
}

export async function getUserBySupabaseId(supabaseUserId: string) {
  return supabase
    .from('users')
    .select('*')
    .eq('supabase_user_id', supabaseUserId)
    .single();
}

export async function getUserRole(supabaseUserId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('supabase_user_id', supabaseUserId)
    .single();

  if (error) throw new Error('Failed to fetch user role');
  return (data as any)?.role;
}

// Classroom operations
export async function createClassroom(classroomData: {
  name: string;
  facultyId: string;
  linkCode: string;
  reviewDeadlines: any;
}) {
  return supabase.from('classrooms').insert({
    name: classroomData.name,
    faculty_id: classroomData.facultyId,
    link_code: classroomData.linkCode,
    review_deadlines: classroomData.reviewDeadlines,
  } as any);
}

export async function getClassroomsByFacultyId(facultyId: string) {
  return supabase
    .from('classrooms')
    .select(`
      *,
      teams:teams(*),
      slots:slots(*)
    `)
    .eq('faculty_id', facultyId);
}

export async function getClassroomByLinkCode(linkCode: string) {
  return supabase
    .from('classrooms')
    .select(`
      *,
      faculty:users!faculty_id(*),
      teams:teams(*),
      slots:slots(*)
    `)
    .eq('link_code', linkCode)
    .single();
}

// Timetable operations
export async function createTimetable(timetableData: {
  facultyId: string;
  data: any;
}) {
  return supabase.from('timetables').insert({
    faculty_id: timetableData.facultyId,
    data: timetableData.data,
  } as any);
}

export async function getTimetableByFacultyId(facultyId: string) {
  return supabase
    .from('timetables')
    .select('*')
    .eq('faculty_id', facultyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}

// Slot operations
export async function createSlot(slotData: {
  classroomId: number;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  maxTeams: number;
  reviewStage: string;
  status: string;
}) {
  return supabase.from('slots').insert({
    classroom_id: slotData.classroomId,
    day: slotData.day,
    start_time: slotData.startTime,
    end_time: slotData.endTime,
    duration: slotData.duration,
    max_teams: slotData.maxTeams,
    review_stage: slotData.reviewStage,
    status: slotData.status,
  } as any);
}

export async function getAvailableSlotsByClassroomId(classroomId: number) {
  return supabase
    .from('slots')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('status', 'available');
}

// Team operations
export async function createTeam(teamData: {
  name: string;
  members: any;
  classroomId: number;
}) {
  return supabase.from('teams').insert({
    name: teamData.name,
    classroom_id: teamData.classroomId,
  } as any);
}

export async function getTeamsByClassroomId(classroomId: number) {
  return supabase
    .from('teams')
    .select(`
      *,
      submissions:submissions(*),
      bookings:bookings(*, slot:slots(*))
    `)
    .eq('classroom_id', classroomId);
}

// Submission operations
export async function createSubmission(submissionData: {
  teamId: number;
  fileUrl: string;
  reviewStage: string;
}) {
  return supabase.from('submissions').insert({
    team_id: submissionData.teamId,
    file_url: submissionData.fileUrl,
    review_stage: submissionData.reviewStage,
  } as any);
}

export async function getSubmissionsByTeamId(teamId: number) {
  return supabase
    .from('submissions')
    .select('*')
    .eq('team_id', teamId);
}

// Booking operations
export async function createBooking(bookingData: {
  slotId: number;
  teamId: number;
}) {
  // Start a transaction using RPC
  return supabase.rpc('create_booking_and_update_slot', {
    p_slot_id: bookingData.slotId,
    p_team_id: bookingData.teamId
  } as any);
}

export async function getBookingsByTeamId(teamId: number) {
  return supabase
    .from('bookings')
    .select(`
      *,
      slot:slots(*)
    `)
    .eq('team_id', teamId);
}

export default supabase;
