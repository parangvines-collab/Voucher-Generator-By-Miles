import { supabase } from '../supabaseClient';

export interface ChatMessage {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: string;
  is_read: boolean;
}

export const chatService = {
  /**
   * Send a new chat message. Autodetects and writes to 'chat_messages' or falls back to 'activity_logs'.
   */
  async sendMessage(sender: string, receiver: string, text: string): Promise<boolean> {
    const now = new Date().toISOString();
    
    // Attempt 1: dedicated table
    try {
      const { error } = await supabase.from('chat_messages').insert([{
        sender,
        receiver,
        text,
        timestamp: now,
        is_read: false
      }]);
      if (!error) return true;
    } catch (e) {
      // Table doesn't exist or RLS issues, fall through to fallback
    }

    // Attempt 2: fallback table 'activity_logs'
    try {
      const { error } = await supabase.from('activity_logs').insert([{
        username: sender,
        type: 'chat_message',
        description: text,
        details: { sender, receiver, is_read: false },
        timestamp: now
      }]);
      return !error;
    } catch (err) {
      console.error('Chat write failed entirely:', err);
      return false;
    }
  },

  /**
   * Fetch chat history for user.
   * If current user is 'admin', returns all messages so they can manage multiple operator chats.
   * If current user is an operator, returns messages between them and 'admin'.
   */
  async fetchMessages(currentUser: string): Promise<ChatMessage[]> {
    // Attempt 1: dedicated table
    try {
      const query = supabase.from('chat_messages').select('*');
      if (currentUser !== 'admin') {
        query.or(`and(sender.eq.${currentUser},receiver.eq.admin),and(sender.eq.admin,receiver.eq.${currentUser})`);
      }
      const { data, error } = await query.order('timestamp', { ascending: true });
      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          sender: item.sender,
          receiver: item.receiver,
          text: item.text,
          timestamp: item.timestamp,
          is_read: !!item.is_read
        }));
      }
    } catch (e) {
      // Fall through to activity_logs query
    }

    // Attempt 2: fallback to activity_logs
    try {
      let query = supabase.from('activity_logs').select('*').eq('type', 'chat_message');
      const { data, error } = await query.order('timestamp', { ascending: true });
      if (error || !data) return [];

      const mappedList: ChatMessage[] = data.map((item: any) => {
        const details = item.details || {};
        return {
          id: item.id?.toString() || Math.random().toString(),
          sender: details.sender || item.username || 'unknown',
          receiver: details.receiver || 'admin',
          text: item.description || '',
          timestamp: item.timestamp,
          is_read: !!details.is_read
        };
      });

      // Filter on client-side if not admin
      if (currentUser !== 'admin') {
        return mappedList.filter(msg => 
          (msg.sender === currentUser && msg.receiver === 'admin') || 
          (msg.sender === 'admin' && msg.receiver === currentUser)
        );
      }

      return mappedList;
    } catch (err) {
      console.error('Chat fetch failed entirely:', err);
      return [];
    }
  },

  /**
   * Marks unread messages sent by 'sender' to 'receiver' as read.
   */
  async markAsRead(sender: string, receiver: string): Promise<void> {
    // Attempt 1: dedicated table
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender', sender)
        .eq('receiver', receiver);
      if (!error) return;
    } catch (e) {}

    // Attempt 2: fallback table 'activity_logs'
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('type', 'chat_message');
      
      if (data) {
        const matches = data.filter((item: any) => {
          const det = item.details || {};
          return det.sender === sender && det.receiver === receiver && !det.is_read;
        });

        for (const msg of matches) {
          await supabase.from('activity_logs').update({
            details: { ...msg.details, is_read: true }
          }).eq('id', msg.id);
        }
      }
    } catch (err) {
      console.error('Chat status update failed:', err);
    }
  }
};
