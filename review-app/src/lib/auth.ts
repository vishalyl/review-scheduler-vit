import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/types/supabase';

// Get the current user session on the server
export async function getSession() {
  const supabase = createServerComponentClient<Database>({ cookies });
  return await supabase.auth.getSession();
}

// Get the current user on the server
export async function getUser() {
  const { data: { session } } = await getSession();

  if (!session) {
    return null;
  }

  return session.user;
}

// Get the current user's role on the server
export async function getUserRole() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const supabase = createServerComponentClient<Database>({ cookies });
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('supabase_user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return (data as any)?.role;
}

// Check if the current user is authenticated and has a specific role
export async function checkUserRole(role: string) {
  const userRole = await getUserRole();

  if (!userRole) {
    redirect('/login');
  }

  if (userRole !== role) {
    if (userRole === 'faculty') {
      redirect('/faculty/dashboard');
    } else if (userRole === 'student') {
      redirect('/student/dashboard');
    } else {
      redirect('/login');
    }
  }

  return true;
}

// Check if the current user is a faculty member
export async function checkFaculty() {
  return checkUserRole('faculty');
}

// Check if the current user is a student
export async function checkStudent() {
  return checkUserRole('student');
}
