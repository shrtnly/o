import { supabase } from '../lib/supabaseClient';

export const messageService = {
  // Get all unique conversations (people I've messaged or who messaged me)
  async getConversations(userId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          attachment_url,
          is_read,
          created_at,
          sender:profiles!messages_sender_id_fkey(id, full_name, display_name, avatar_url, last_seen),
          receiver:profiles!messages_receiver_id_fkey(id, full_name, display_name, avatar_url, last_seen)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by distinct partner
      const conversations = [];
      const seen = new Set();

      data.forEach(msg => {
        const partner = msg.sender_id === userId ? msg.receiver : msg.sender;
        if (!partner) return;
        
        if (!seen.has(partner.id)) {
          seen.add(partner.id);
          conversations.push({
            partner,
            lastMessage: msg.content,
            timestamp: msg.created_at,
            isNew: !msg.is_read && msg.receiver_id === userId
          });
        }
      });

      return conversations;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  },

  // Get messages for a specific partner
  async getMessages(userId, partnerId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  },

  // Send a message
  async sendMessage(senderId, receiverId, content, attachmentUrl = null) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ 
          sender_id: senderId, 
          receiver_id: receiverId, 
          content,
          attachment_url: attachmentUrl 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  },

  // Upload an attachment
  async uploadAttachment(file, userId) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading attachment:', err);
      throw err;
    }
  },

  // Mark all messages from a partner as read
  async markAsRead(userId, partnerId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', partnerId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }
};
