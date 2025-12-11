'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { CheckCircle, X, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CreateTeamFormProps {
  classroomId: number;
  onSuccess?: (teamId: number) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  projectTitle: string;
  maxMembers: number;
}

export default function CreateTeamForm({ classroomId, onSuccess, onCancel }: CreateTeamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      projectTitle: '',
      maxMembers: 4
    }
  });

  const onSubmit = async (data: FormData) => {
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

      // Check if user is already in a team in this classroom
      const { data: existingTeam, error: teamError } = await supabase
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

      // Create the team
      const { data: team, error: createError } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          project_title: data.projectTitle,
          max_members: data.maxMembers,
          classroom_id: classroomId
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Add the current user as team leader
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          student_id: userData.id,
          role: 'leader'
        });

      if (memberError) {
        throw memberError;
      }

      // Get the invitation code
      const { data: teamWithCode, error: codeError } = await supabase
        .from('teams')
        .select('invitation_code')
        .eq('id', team.id)
        .single();

      if (codeError) {
        throw codeError;
      }

      setTeamId(team.id);
      setInvitationCode(teamWithCode.invitation_code);
      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) onSuccess(team.id);
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to create team');
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
        <h3 className="text-xl font-medium">Create New Team</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[#a0a0a0] hover:text-white transition-colors duration-200"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h4 className="text-lg font-medium mb-2">Team created successfully!</h4>
          <p className="text-[#a0a0a0] text-center mb-6">Your team has been created and you've been added as the team leader</p>

          {invitationCode && (
            <div className="w-full bg-[#1a1a1a] border border-[#252525] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#a0a0a0] mb-2">Share this code with your teammates:</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono font-bold tracking-wider text-blue-400">{invitationCode}</p>
                <button
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200"
                  onClick={() => {
                    navigator.clipboard.writeText(invitationCode);
                    alert('Invitation code copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

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
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Team Name *
              </label>
              <input
                id="name"
                type="text"
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a name for your team"
                disabled={isSubmitting}
                {...register('name', {
                  required: 'Team name is required',
                  maxLength: {
                    value: 50,
                    message: 'Team name cannot exceed 50 characters'
                  }
                })}
              />
              {errors.name && (
                <p className="mt-2 text-red-400 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="projectTitle" className="block text-sm font-medium mb-1">
                Project Title
              </label>
              <input
                id="projectTitle"
                type="text"
                className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your project title (optional)"
                disabled={isSubmitting}
                {...register('projectTitle', {
                  maxLength: {
                    value: 100,
                    message: 'Project title cannot exceed 100 characters'
                  }
                })}
              />
              {errors.projectTitle && (
                <p className="mt-2 text-red-400 text-sm">{errors.projectTitle.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxMembers" className="block text-sm font-medium mb-1">
                Maximum Team Members
              </label>
              <div className="relative">
                <select
                  id="maxMembers"
                  className="w-full bg-[#1a1a1a] border border-[#252525] rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  disabled={isSubmitting}
                  {...register('maxMembers', {
                    required: 'Maximum members is required',
                    min: {
                      value: 1,
                      message: 'Team must have at least 1 member'
                    },
                    max: {
                      value: 4,
                      message: 'Team cannot have more than 4 members'
                    }
                  })}
                >
                  <option value="1">1 member</option>
                  <option value="2">2 members</option>
                  <option value="3">3 members</option>
                  <option value="4">4 members</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#a0a0a0]">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              {errors.maxMembers && (
                <p className="mt-2 text-red-400 text-sm">{errors.maxMembers.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
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
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
