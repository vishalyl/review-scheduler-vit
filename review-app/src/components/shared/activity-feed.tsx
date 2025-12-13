'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { IoPeople, IoCalendar, IoDocument, IoSchool, IoTime } from 'react-icons/io5';

interface Activity {
  id: number;
  activity_type: string;
  entity_id: number;
  entity_name: string;
  details: any;
  created_at: string;
  users?: any;
}

interface ActivityFeedProps {
  userRole: 'faculty' | 'student';
  limit?: number;
}

export default function ActivityFeed({ userRole, limit = 5 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
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

        // Get activities
        let query = supabase
          .from('activities')
          .select(`
            id,
            activity_type,
            entity_id,
            entity_name,
            details,
            created_at,
            users:user_id(name)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (userRole === 'faculty') {
          // For faculty, get activities related to their classrooms
          query = query.or(`user_id.eq.${userData.id},activity_type.eq.classroom_created`);
        } else {
          // For students, get only their activities
          query = query.eq('user_id', userData.id);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Type assertion to ensure data matches the Activity interface
        setActivities((data || []) as unknown as Activity[]);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [supabase, userRole, limit]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'classroom_created':
      case 'classroom_joined':
        return <IoSchool size={16} className="text-indigo-400" />;
      case 'team_created':
      case 'team_joined':
        return <IoPeople size={16} className="text-purple-400" />;
      case 'slots_published':
        return <IoCalendar size={16} className="text-emerald-400" />;
      case 'submission_created':
        return <IoDocument size={16} className="text-amber-400" />;
      default:
        return <IoTime size={14} className="text-[#a0a0a0]" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const userName = activity.users?.name || 'You';
    const isCurrentUser = !activity.users; // If users is null, it's the current user's activity
    
    switch (activity.activity_type) {
      case 'classroom_created':
        return (
          <>
            {isCurrentUser ? 'You' : userName} created a new classroom{' '}
            <span className="text-blue-400">{activity.entity_name}</span>
          </>
        );
      case 'classroom_joined':
        return (
          <>
            {isCurrentUser ? 'You' : userName} joined classroom{' '}
            <span className="text-blue-400">{activity.entity_name}</span>
          </>
        );
      case 'team_created':
        return (
          <>
            {isCurrentUser ? 'You' : userName} created team{' '}
            <span className="text-purple-400">{activity.entity_name}</span>
            {activity.details?.classroom_name && (
              <> in {activity.details.classroom_name}</>
            )}
          </>
        );
      case 'team_joined':
        return (
          <>
            {isCurrentUser ? 'You' : userName} joined team{' '}
            <span className="text-purple-400">{activity.entity_name}</span>
            {activity.details?.classroom_name && (
              <> in {activity.details.classroom_name}</>
            )}
          </>
        );
      case 'slots_published':
        return (
          <>
            {isCurrentUser ? 'You' : userName} published{' '}
            <span className="text-emerald-400">{activity.details?.count || 0} review slots</span>
            {activity.entity_name && <> for {activity.entity_name}</>}
          </>
        );
      case 'submission_created':
        return (
          <>
            {isCurrentUser ? 'You' : userName} submitted{' '}
            {activity.details?.review_stage && (
              <span className="text-amber-400">{activity.details.review_stage}</span>
            )}
            {activity.entity_name && <> for team {activity.entity_name}</>}
          </>
        );
      default:
        return (
          <>
            {isCurrentUser ? 'You' : userName} performed an action
          </>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'some time ago';
      }
      
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (seconds < 0) {
        return 'just now';
      }
      
      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
      }
      
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
      }
      
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
      }
      
      interval = Math.floor(seconds / 3600);
      if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
      }
      
      interval = Math.floor(seconds / 60);
      if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
      }
      
      return seconds <= 5 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
    } catch (e) {
      return 'some time ago';
    }
  };

  if (loading) {
    return (
      <div className="p-5">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-[#1e1e1e] rounded-full flex items-center justify-center"></div>
              <div className="flex-1">
                <div className="h-3 bg-[#1e1e1e] rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-[#1e1e1e] rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-5">
        <div className="text-center py-6">
          <div className="w-10 h-10 bg-[#1e1e1e] rounded-full flex items-center justify-center mx-auto mb-3">
            <IoTime size={18} className="text-[#a0a0a0]" />
          </div>
          <p className="text-sm font-medium mb-1">No recent activity</p>
          <p className="text-[#a0a0a0] text-xs">Your activity will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="space-y-5">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center">
              {getActivityIcon(activity.activity_type)}
            </div>
            <div>
              <p className="text-xs">{getActivityText(activity)}</p>
              <p className="text-[#a0a0a0] text-[10px] mt-1">{formatTime(activity.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
