import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IoPeople, IoCheckmark, IoAlertCircle, IoSync } from 'react-icons/io5';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useOnboarding } from './onboarding-context';

interface JoinTeamStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function JoinTeamStep({ onComplete, onSkip }: JoinTeamStepProps) {
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCreateTeamOption, setShowCreateTeamOption] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  
  const { markTeamJoined } = useOnboarding();
  const supabase = createClientComponentClient();
  
  // Fetch classrooms when component mounts
  React.useEffect(() => {
    async function fetchClassrooms() {
      try {
        setLoadingClassrooms(true);
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('User not found');
        }
        
        // Get user details from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('supabase_user_id', currentUser.id)
          .single();
          
        if (userError) {
          throw userError;
        }
        
        // Get student's classrooms
        const { data: classroomStudents, error: classroomStudentsError } = await supabase
          .from('classroom_students')
          .select('classroom_id')
          .eq('student_id', userData.id);
          
        if (classroomStudentsError) {
          throw classroomStudentsError;
        }
        
        if (classroomStudents && classroomStudents.length > 0) {
          const classroomIds = classroomStudents.map(cs => cs.classroom_id);
          
          // Get classroom details
          const { data: classroomData, error: classroomError } = await supabase
            .from('classrooms')
            .select(`
              id,
              name,
              faculty_id
            `)
            .in('id', classroomIds);
            
          if (classroomError) {
            throw classroomError;
          }
          
          setClassrooms(classroomData || []);
          
          // If there's only one classroom, select it by default
          if (classroomData && classroomData.length === 1) {
            setClassroomId(classroomData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching classrooms:', error);
      } finally {
        setLoadingClassrooms(false);
      }
    }
    
    fetchClassrooms();
  }, [supabase]);
  
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Get user details from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_user_id', currentUser.id)
        .single();
        
      if (userError) {
        throw userError;
      }
      
      // Find team by invitation code
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('invitation_code', invitationCode.trim())
        .single();
        
      if (teamError) {
        if (teamError.code === 'PGRST116') {
          setError('Invalid invitation code. Please check and try again.');
        } else {
          setError('Error finding team. Please try again.');
          console.error('Team error:', teamError);
        }
        return;
      }
      
      // Check if user is already a member of this team
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('student_id', userData.id)
        .single();
        
      if (existingMember) {
        setError('You are already a member of this team');
        return;
      }
      
      // Add user to team
      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          student_id: userData.id,
          role: 'member',
          joined_at: new Date().toISOString()
        });
        
      if (joinError) {
        setError('Error joining team. Please try again.');
        console.error('Join error:', joinError);
        return;
      }
      
      // Update onboarding status
      markTeamJoined();
      
      // Show success message
      setSuccess(true);
      
      // Complete the step after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);
      
    } catch (error) {
      console.error('Error joining team:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }
    
    if (!classroomId) {
      setError('Please select a classroom');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Get user details from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_user_id', currentUser.id)
        .single();
        
      if (userError) {
        throw userError;
      }
      
      // Generate a random invitation code
      const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Create the team
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          project_title: projectTitle.trim() || teamName.trim(),
          classroom_id: classroomId,
          created_at: new Date().toISOString(),
          invitation_code: invitationCode
        })
        .select()
        .single();
        
      if (createError) {
        setError('Error creating team. Please try again.');
        console.error('Create team error:', createError);
        return;
      }
      
      // Add user to team as owner
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          student_id: userData.id,
          role: 'owner',
          joined_at: new Date().toISOString()
        });
        
      if (memberError) {
        setError('Error adding you to the team. Please try again.');
        console.error('Add member error:', memberError);
        return;
      }
      
      // Update onboarding status
      markTeamJoined();
      
      // Show success message
      setSuccess(true);
      
      // Complete the step after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);
      
    } catch (error) {
      console.error('Error creating team:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6 w-full max-w-md mx-auto"
    >
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
          <IoPeople className="text-purple-400" size={24} />
        </div>
      </div>
      
      <h3 className="text-xl font-medium text-center mb-2">Join or Create a Team</h3>
      <p className="text-[#a0a0a0] text-sm text-center mb-6">
        Teams allow you to collaborate with other students on projects and schedule reviews together
      </p>
      
      {success ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <IoCheckmark className="text-green-400 mr-2" size={18} />
            <p className="text-green-400 text-sm font-medium">
              {showCreateTeamOption ? 'Team created successfully!' : 'Joined team successfully!'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <IoAlertCircle className="text-red-400 mr-2" size={18} />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {showCreateTeamOption ? (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="teamName" className="block text-sm font-medium mb-1">
                  Team Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  disabled={loading}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="projectTitle" className="block text-sm font-medium mb-1">
                  Project Title (Optional)
                </label>
                <input
                  type="text"
                  id="projectTitle"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Enter project title"
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="classroom" className="block text-sm font-medium mb-1">
                  Classroom <span className="text-red-400">*</span>
                </label>
                {loadingClassrooms ? (
                  <div className="flex items-center justify-center p-4">
                    <IoSync className="animate-spin text-purple-400" size={20} />
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-400 text-xs">
                      You need to join a classroom before creating a team
                    </p>
                  </div>
                ) : (
                  <select
                    id="classroom"
                    value={classroomId || ''}
                    onChange={(e) => setClassroomId(Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    disabled={loading || classrooms.length === 0}
                    required
                  >
                    <option value="">Select a classroom</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  disabled={loading || classrooms.length === 0}
                >
                  {loading ? (
                    <IoSync className="animate-spin mr-2" size={16} />
                  ) : (
                    <IoPeople className="mr-2" size={16} />
                  )}
                  Create Team
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowCreateTeamOption(false)}
                  className="w-full bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0] py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  disabled={loading}
                >
                  Back to Join Team
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label htmlFor="invitationCode" className="block text-sm font-medium mb-1">
                  Team Invitation Code
                </label>
                <input
                  type="text"
                  id="invitationCode"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="Enter invitation code"
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  disabled={loading}
                />
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <IoSync className="animate-spin mr-2" size={16} />
                  ) : (
                    <IoPeople className="mr-2" size={16} />
                  )}
                  Join Team
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowCreateTeamOption(true)}
                  className="w-full bg-[#1a1a1a] hover:bg-[#252525] text-white py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  disabled={loading}
                >
                  Create a New Team
                </button>
                
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-[#a0a0a0] text-sm hover:text-white transition-colors duration-200"
                  disabled={loading}
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </motion.div>
  );
}
