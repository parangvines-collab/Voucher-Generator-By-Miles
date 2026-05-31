import { ActivityLog } from '../types';
import { supabase } from '../supabaseClient';

const ACTIVITIES_KEY = 'voucherActivities';

export const ActivityLogger = {
  getActivities(): ActivityLog[] {
    try {
      return JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || '[]');
    } catch {
      return [];
    }
  },

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
      return this.getActivities();
    }
  },

  logActivity(type: string, description: string, details: Record<string, any> = {}): void {
    const activities = this.getActivities();
    const user = sessionStorage.getItem('username') || 'anonymous';
    
    const newLog: ActivityLog = {
      id: String(Date.now()) + Math.random().toString(36).substr(2, 5),
      type,
      user,
      description,
      details,
      timestamp: new Date().toISOString()
    };
    
    activities.push(newLog);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));

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
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify([]));
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

