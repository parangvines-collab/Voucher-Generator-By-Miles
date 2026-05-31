import { ActivityLog } from '../types';
import { supabase } from '../supabaseClient';

export const ActivityLogger = {
  async getActivitiesFromSupabase(): Promise<ActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      if (!data) return [];
      
      return data.map((item: any) => ({
        id: item.id,
        type: item.type,
        user: item.username,
        description: item.description,
        details: item.details || {},
        timestamp: item.timestamp
      }));
    } catch (err) {
      console.error('Failed to fetch logs from Supabase:', err);
      return [];
    }
  },

  logActivity(type: string, description: string, details: Record<string, any> = {}): void {
    const user = sessionStorage.getItem('username') || 'anonymous';
    
    // Write to Supabase asynchronously
    supabase.auth.getSession().then(({ data }) => {
      const userId = data?.session?.user?.id || null;
      supabase.from('activity_logs').insert([{
        user_id: userId,
        username: user,
        type,
        description,
        details,
        timestamp: new Date().toISOString()
      }]).then(({ error }) => {
        if (error) {
          console.warn('Logging to Supabase omitted or table missing:', error.message);
        }
      });
    }).catch(() => {});
  },

  async clearActivities(): Promise<void> {
    try {
      // Clear Supabase activity_logs
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .neq('username', 'non_existent_username_placeholder');
      if (error) {
        console.warn('Could not clear Supabase logs:', error.message);
      }
    } catch (e) {
      console.error(e);
    }
  }
};
