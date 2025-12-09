-- =====================================================
-- Complete Database Setup for Salary Platform
-- =====================================================
-- This file contains all necessary tables and setup
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. COMMENTS AND REPLIES TABLES
-- =====================================================

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_display_name TEXT NOT NULL,
  user_photo_url TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  attachments JSONB,
  mentions TEXT[],
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  voted_by JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replies table
CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_display_name TEXT NOT NULL,
  user_photo_url TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  attachments JSONB,
  mentions TEXT[],
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  voted_by JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SALARY VOTES TABLE
-- =====================================================

-- Add upvote and downvote columns to salaries table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='salaries' AND column_name='upvotes') THEN
    ALTER TABLE salaries ADD COLUMN upvotes INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='salaries' AND column_name='downvotes') THEN
    ALTER TABLE salaries ADD COLUMN downvotes INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create salary_votes table
CREATE TABLE IF NOT EXISTS salary_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_id UUID NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(salary_id, user_id)
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_salary_id ON comments(salary_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_upvotes ON comments(upvotes DESC);

-- Replies indexes
CREATE INDEX IF NOT EXISTS idx_replies_comment_id ON replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at ASC);

-- Salary votes indexes
CREATE INDEX IF NOT EXISTS idx_salary_votes_salary_id ON salary_votes(salary_id);
CREATE INDEX IF NOT EXISTS idx_salary_votes_user_id ON salary_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_votes_type ON salary_votes(vote_type);

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update salary vote counts
CREATE OR REPLACE FUNCTION update_salary_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE salaries SET upvotes = upvotes + 1 WHERE id = NEW.salary_id;
    ELSE
      UPDATE salaries SET downvotes = downvotes + 1 WHERE id = NEW.salary_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Remove old vote
    IF OLD.vote_type = 'up' THEN
      UPDATE salaries SET upvotes = upvotes - 1 WHERE id = OLD.salary_id;
    ELSE
      UPDATE salaries SET downvotes = downvotes - 1 WHERE id = OLD.salary_id;
    END IF;
    -- Add new vote
    IF NEW.vote_type = 'up' THEN
      UPDATE salaries SET upvotes = upvotes + 1 WHERE id = NEW.salary_id;
    ELSE
      UPDATE salaries SET downvotes = downvotes + 1 WHERE id = NEW.salary_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE salaries SET upvotes = upvotes - 1 WHERE id = OLD.salary_id;
    ELSE
      UPDATE salaries SET downvotes = downvotes - 1 WHERE id = OLD.salary_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update salary_votes updated_at
CREATE OR REPLACE FUNCTION update_salary_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_replies_updated_at ON replies;
CREATE TRIGGER update_replies_updated_at
  BEFORE UPDATE ON replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for salary vote counts
DROP TRIGGER IF EXISTS update_salary_vote_counts_trigger ON salary_votes;
CREATE TRIGGER update_salary_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON salary_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_vote_counts();

-- Trigger for salary_votes updated_at
DROP TRIGGER IF EXISTS update_salary_votes_updated_at_trigger ON salary_votes;
CREATE TRIGGER update_salary_votes_updated_at_trigger
  BEFORE UPDATE ON salary_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_votes_updated_at();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_votes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES FOR COMMENTS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
CREATE POLICY "Anyone can read comments" ON comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Service role full access comments
DROP POLICY IF EXISTS "Service role full access comments" ON comments;
CREATE POLICY "Service role full access comments" ON comments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 8. RLS POLICIES FOR REPLIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read replies" ON replies;
CREATE POLICY "Anyone can read replies" ON replies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert replies" ON replies;
CREATE POLICY "Authenticated users can insert replies" ON replies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own replies" ON replies;
CREATE POLICY "Users can update their own replies" ON replies
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own replies" ON replies;
CREATE POLICY "Users can delete their own replies" ON replies
  FOR DELETE USING (auth.uid() = user_id);

-- Service role full access replies
DROP POLICY IF EXISTS "Service role full access replies" ON replies;
CREATE POLICY "Service role full access replies" ON replies
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 9. RLS POLICIES FOR SALARY_VOTES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read salary votes" ON salary_votes;
CREATE POLICY "Anyone can read salary votes" ON salary_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert votes" ON salary_votes;
CREATE POLICY "Authenticated users can insert votes" ON salary_votes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own votes" ON salary_votes;
CREATE POLICY "Users can update their own votes" ON salary_votes
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own votes" ON salary_votes;
CREATE POLICY "Users can delete their own votes" ON salary_votes
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role full access salary_votes
DROP POLICY IF EXISTS "Service role full access salary_votes" ON salary_votes;
CREATE POLICY "Service role full access salary_votes" ON salary_votes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 10. INITIALIZE EXISTING DATA
-- =====================================================

-- Set default upvotes/downvotes for existing salaries
UPDATE salaries 
SET upvotes = 0, downvotes = 0 
WHERE upvotes IS NULL OR downvotes IS NULL;

-- =====================================================
-- DONE!
-- =====================================================
-- All tables, indexes, triggers, and policies are now set up.
-- The application should now work correctly.
-- =====================================================


