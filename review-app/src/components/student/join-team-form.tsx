'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { IoCheckmarkCircle, IoClose, IoRefresh } from 'react-icons/io5';

interface JoinTeamFormProps {
  classroomId: number;
  onSuccess?: (teamId: number) => void;
  onCancel?: () => void;
}

export default function JoinTeamForm({ classroomId, onSuccess, onCancel }: JoinTeamFormProps) {
  const [invitationCode, setInvitationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationCode.trim()) {
      setError('Please enter a team invitation code');
      return;
    }
    
    // Format the invitation code (uppercase, remove spaces)
    const formattedCode = invitationCode.trim().toUpperCase().replace(/\s+/g, '');

    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Get user details from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', currentUser.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if team exists
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, classroom_id, max_members, project_title')
        .eq('invitation_code', formattedCode)
        .single();

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          throw new Error('Team not found. Please check the invitation code and try again.');
        }
        throw teamError;
      }

      // Check if team is in the correct classroom
      if (team.classroom_id !== classroomId) {
        throw new Error('This team is not in the current classroom');
      }

      // Check if student is already in a team in this classroom
      const { data: existingTeam, error: existingTeamError } = await supabase
        .from('team_members')
        .select(`
          teams!inner(
            id,
            classroom_id
          )
        `)
        .eq('student_id', userData.id)
        .eq('teams.classroom_id', classroomId);

      if (existingTeam && existingTeam.length > 0) {
        throw new Error('You are already in a team in this classroom');
      }

      // Check if team is full
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id);

      if (membersError) {
        throw membersError;
      }

      if (teamMembers && teamMembers.length >= team.max_members) {
        throw new Error('This team is already full');
      }

      // Join the team
      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          student_id: userData.id,
          role: 'member'
        });

      if (joinError) {
        throw joinError;
      }

      setTeamId(team.id);
      setTeamName(team.name);
      setSuccess(true);
      
      setTimeout(() => {
        if (onSuccess) onSuccess(team.id);
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to join team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-medium">Join Team</h3>
          <p className="text-sm text-[#a0a0a0] mt-1">Enter the invitation code to join an existing team</p>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-[#a0a0a0] hover:text-white transition-colors duration-200"
          >
            <IoClose size={20} />
          </button>
        )}
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <IoCheckmarkCircle className="h-8 w-8 text-green-400" />
          </div>
          <h4 className="text-lg font-medium mb-2">Successfully joined team!</h4>
          <p className="text-[#a0a0a0] text-center mb-6">
            You have joined <span className="text-white font-medium">{teamName}</span>
            {teamId && (
              <span className="block mt-1 text-xs">You can now collaborate with your team members on your project</span>
            )}
          </p>
          
          <button
            onClick={() => {
              if (onSuccess && teamId) onSuccess(teamId);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            View Team
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="invitationCode" className="block text-sm font-medium mb-1">
              Team Invitation Code
            </label>
            <div className="relative">
              <input
                type="text"
                id="invitationCode"
                value={invitationCode}
                onChange={(e) => {
                  setInvitationCode(e.target.value);
                  if (error) setError(null); // Clear error when user types
                }}
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase"
                placeholder="Enter the invitation code (e.g., AB12CD)"
                disabled={isSubmitting}
                autoFocus
                maxLength={10}
              />
              {invitationCode && (
                <button 
                  type="button" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#a0a0a0] hover:text-white transition-colors duration-200"
                  onClick={() => setInvitationCode('')}
                >
                  <IoClose size={16} />
                </button>
              )}
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-md text-sm mt-4">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-[#252525] rounded-md text-[#a0a0a0] hover:bg-[#1a1a1a] transition-colors duration-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center min-w-[100px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <IoRefresh size={16} className="animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                'Join Team'
              )}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
