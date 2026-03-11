-- Create quick_tests table
CREATE TABLE IF NOT EXISTS quick_tests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create index for faster queries by user and expiration
CREATE INDEX IF NOT EXISTS idx_quick_tests_user_id ON quick_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_tests_expires_at ON quick_tests(expires_at);

-- Enable Row Level Security
ALTER TABLE quick_tests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their own tests
CREATE POLICY "Users can view their own quick tests" ON quick_tests
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own tests
CREATE POLICY "Users can insert their own quick tests" ON quick_tests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own tests
CREATE POLICY "Users can delete their own quick tests" ON quick_tests
  FOR DELETE USING (auth.uid() = user_id);
