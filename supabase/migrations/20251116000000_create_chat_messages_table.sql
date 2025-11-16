-- Create chat_messages table for storing conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by user and conversation
CREATE INDEX idx_chat_messages_user_conversation ON chat_messages(user_id, conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own messages
CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages (though this shouldn't be needed in normal operation)
CREATE POLICY "Users can update own messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON chat_messages TO anon;
GRANT INSERT ON chat_messages TO anon;
GRANT UPDATE ON chat_messages TO anon;
GRANT DELETE ON chat_messages TO anon;

GRANT SELECT ON chat_messages TO authenticated;
GRANT INSERT ON chat_messages TO authenticated;
GRANT UPDATE ON chat_messages TO authenticated;
GRANT DELETE ON chat_messages TO authenticated;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at_trigger
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_messages_updated_at();