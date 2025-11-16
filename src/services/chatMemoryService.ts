import { supabase } from '@/integrations/supabase/client'

export type ChatRole = 'user' | 'assistant'

export interface StoredMessage {
  id?: string
  user_id: string
  conversation_id: string
  role: ChatRole
  content: string
}

export async function saveMessage(msg: StoredMessage) {
  try {
    const { error } = await supabase.from('chat_messages').insert({
      user_id: msg.user_id,
      conversation_id: msg.conversation_id,
      role: msg.role,
      content: msg.content
    })
    if (error) {
      console.error('Error saving message:', error)
      return { error }
    }
    return { error: null }
  } catch (error) {
    console.error('Exception saving message:', error)
    return { error }
  }
}

export async function loadMessages(userId: string, conversationId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)
    
    if (error) {
      console.error('Error loading messages:', error)
      return { messages: [], error }
    }
    
    const messages = (data || []).map(d => ({ role: d.role as ChatRole, content: d.content as string }))
    return { messages, error: null }
  } catch (error) {
    console.error('Exception loading messages:', error)
    return { messages: [], error }
  }
}

export async function clearMessages(userId: string, conversationId: string) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
    
    if (error) {
      console.error('Error clearing messages:', error)
      return { error }
    }
    
    return { error: null }
  } catch (error) {
    console.error('Exception clearing messages:', error)
    return { error }
  }
}