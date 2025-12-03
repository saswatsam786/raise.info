-- =====================================================
-- Comprehensive Salary Data Schema for Supabase
-- =====================================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  industry TEXT,
  headquarters TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  employee_count INTEGER,
  founded_year INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salary data table (main table for all salary records)
CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,

  -- Job details
  designation TEXT NOT NULL,
  level TEXT,
  role_category TEXT, -- e.g., "Software Engineer", "Product Manager"

  -- Location information
  location TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  location_type TEXT, -- 'onsite', 'remote', 'hybrid'

  -- Experience and education
  years_of_experience INTEGER,
  years_of_experience_min INTEGER,
  years_of_experience_max INTEGER,
  education_level TEXT, -- 'Bachelors', 'Masters', 'PhD'

  -- Compensation breakdown (in INR)
  base_salary DECIMAL(12, 2),
  bonus DECIMAL(12, 2) DEFAULT 0,
  stock_compensation DECIMAL(12, 2) DEFAULT 0,
  signing_bonus DECIMAL(12, 2) DEFAULT 0,
  other_compensation DECIMAL(12, 2) DEFAULT 0,

  -- Calculated totals
  total_compensation DECIMAL(12, 2),
  min_salary DECIMAL(12, 2),
  max_salary DECIMAL(12, 2),
  avg_salary DECIMAL(12, 2),
  median_salary DECIMAL(12, 2),

  -- Data quality
  data_points_count INTEGER DEFAULT 1, -- Number of reports this average is based on
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00

  -- Source tracking
  source_platform TEXT NOT NULL, -- 'levels_fyi', 'weekday', 'ambitionbox', 'glassdoor', 'manual'
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Additional metadata
  currency TEXT DEFAULT 'INR',
  job_type TEXT CHECK (job_type IN ('full-time', 'internship')), -- 'full-time' or 'internship'
  benefits JSONB DEFAULT '[]'::jsonb, -- Array of benefits
  skills_required TEXT[], -- Array of required skills
  additional_data JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  data_date DATE, -- When this salary data was relevant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_salary CHECK (total_compensation > 0),
  CONSTRAINT valid_yoe CHECK (years_of_experience >= 0)
);

-- Scrape history table (track scraping operations)
CREATE TABLE IF NOT EXISTS scrape_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  records_scraped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Data sources table (track where data comes from)
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  scrape_frequency_hours INTEGER DEFAULT 168, -- Weekly by default
  reliability_score DECIMAL(3, 2) DEFAULT 0.80,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salary trends table (for historical tracking)
CREATE TABLE IF NOT EXISTS salary_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  level TEXT,
  location TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER, -- 1-4
  avg_total_compensation DECIMAL(12, 2),
  median_total_compensation DECIMAL(12, 2),
  sample_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(company_id, designation, level, location, year, quarter)
);

-- =====================================================
-- Indexes for performance
-- =====================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active) WHERE is_active = TRUE;

-- Salaries indexes
CREATE INDEX IF NOT EXISTS idx_salaries_company_id ON salaries(company_id);
CREATE INDEX IF NOT EXISTS idx_salaries_company_name ON salaries(company_name);
CREATE INDEX IF NOT EXISTS idx_salaries_designation ON salaries(designation);
CREATE INDEX IF NOT EXISTS idx_salaries_location ON salaries(location);
CREATE INDEX IF NOT EXISTS idx_salaries_yoe ON salaries(years_of_experience);
CREATE INDEX IF NOT EXISTS idx_salaries_source ON salaries(source_platform);
CREATE INDEX IF NOT EXISTS idx_salaries_total_comp ON salaries(total_compensation DESC);
CREATE INDEX IF NOT EXISTS idx_salaries_created_at ON salaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_salaries_company_designation ON salaries(company_name, designation);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_salaries_search ON salaries(company_name, designation, location);
CREATE INDEX IF NOT EXISTS idx_salaries_filter ON salaries(company_name, years_of_experience, total_compensation DESC);

-- Scrape history indexes
CREATE INDEX IF NOT EXISTS idx_scrape_history_company ON scrape_history(company_id);
CREATE INDEX IF NOT EXISTS idx_scrape_history_status ON scrape_history(status);
CREATE INDEX IF NOT EXISTS idx_scrape_history_started ON scrape_history(started_at DESC);

-- Trends indexes
CREATE INDEX IF NOT EXISTS idx_trends_company ON salary_trends(company_id, year DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_trends ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Anyone can read companies" ON companies
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read salaries" ON salaries
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read trends" ON salary_trends
  FOR SELECT USING (true);

-- Authenticated users can read data sources and history
CREATE POLICY "Authenticated users can read sources" ON data_sources
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read scrape history" ON scrape_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can do everything (for the scraper)
CREATE POLICY "Service role full access companies" ON companies
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access salaries" ON salaries
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access sources" ON data_sources
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access history" ON scrape_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access trends" ON salary_trends
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salaries_updated_at
  BEFORE UPDATE ON salaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create company slug
CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(text_input, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Insert default data sources
-- =====================================================

INSERT INTO data_sources (name, base_url, scrape_frequency_hours, reliability_score) VALUES
  ('levels_fyi', 'https://www.levels.fyi', 168, 0.95),
  ('weekday', 'https://www.weekday.works', 168, 0.85),
  ('ambitionbox', 'https://www.ambitionbox.com', 168, 0.80),
  ('glassdoor', 'https://www.glassdoor.co.in', 168, 0.75)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Useful views for querying
-- =====================================================

-- View: Latest salaries per company-designation combination
CREATE OR REPLACE VIEW latest_salaries AS
SELECT DISTINCT ON (company_name, designation, location)
  id,
  company_id,
  company_name,
  designation,
  level,
  location,
  years_of_experience,
  base_salary,
  total_compensation,
  min_salary,
  max_salary,
  avg_salary,
  source_platform,
  data_points_count,
  created_at
FROM salaries
ORDER BY company_name, designation, location, created_at DESC;

-- View: Company salary statistics
CREATE OR REPLACE VIEW company_salary_stats AS
SELECT
  company_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT designation) as unique_roles,
  AVG(total_compensation) as avg_compensation,
  MIN(total_compensation) as min_compensation,
  MAX(total_compensation) as max_compensation,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_compensation) as median_compensation,
  MAX(created_at) as last_updated
FROM salaries
GROUP BY company_name;

-- View: Salary by experience level
CREATE OR REPLACE VIEW salary_by_experience AS
SELECT
  company_name,
  CASE
    WHEN years_of_experience <= 2 THEN '0-2 years'
    WHEN years_of_experience <= 5 THEN '3-5 years'
    WHEN years_of_experience <= 8 THEN '6-8 years'
    ELSE '9+ years'
  END as experience_bracket,
  COUNT(*) as count,
  AVG(total_compensation) as avg_compensation,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_compensation) as median_compensation
FROM salaries
WHERE years_of_experience IS NOT NULL
GROUP BY company_name, experience_bracket
ORDER BY company_name, experience_bracket;
