-- ZenWork Database Schema
-- PostgreSQL + Row Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- USERS TABLE
-- ========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'developer',
  work_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}',
  work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  timezone TEXT DEFAULT 'Asia/Kolkata',
  plan_tier TEXT DEFAULT 'free',
  preferences JSONB DEFAULT '{
    "notifications": true,
    "focus_sound": "coffee_shop",
    "theme": "dark",
    "custom_categories": {}
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- TEAMS TABLE
-- ========================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT 'ZW-' || encode(gen_random_bytes(3), 'hex'),
  plan_tier TEXT DEFAULT 'team',
  max_members INTEGER DEFAULT 25,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- TEAM MEMBERS TABLE
-- ========================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  visibility_settings JSONB DEFAULT '{
    "share_score": false,
    "share_focus_sessions": true,
    "share_burnout_risk": true
  }',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ========================
-- ACTIVITY LOGS TABLE
-- ========================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  work_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, work_date);
CREATE INDEX idx_activity_logs_user_domain ON activity_logs(user_id, domain);

-- ========================
-- FOCUS SESSIONS TABLE
-- ========================
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'sprint',
  planned_duration INTEGER NOT NULL,
  actual_duration INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  distraction_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_focus_sessions_user_started ON focus_sessions(user_id, started_at);

-- ========================
-- DAILY SUMMARIES TABLE
-- ========================
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_active_seconds INTEGER DEFAULT 0,
  productive_seconds INTEGER DEFAULT 0,
  neutral_seconds INTEGER DEFAULT 0,
  distracting_seconds INTEGER DEFAULT 0,
  focus_sessions_count INTEGER DEFAULT 0,
  focus_sessions_total_duration INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0,
  tab_switches INTEGER DEFAULT 0,
  burnout_risk FLOAT DEFAULT 0,
  top_domains JSONB DEFAULT '[]',
  ai_insights JSONB DEFAULT '[]',
  UNIQUE(user_id, summary_date)
);

CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date);

-- ========================
-- ACHIEVEMENTS / BADGES TABLE
-- ========================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- ========================
-- STREAKS TABLE
-- ========================
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL DEFAULT 'focus',
  current_count INTEGER DEFAULT 0,
  best_count INTEGER DEFAULT 0,
  last_active_date DATE,
  UNIQUE(user_id, streak_type)
);

-- ========================
-- SUBSCRIPTIONS TABLE (for Razorpay)
-- ========================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  plan_tier TEXT NOT NULL,
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ROW LEVEL SECURITY (RLS)
-- ========================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sessions" ON focus_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own summaries" ON daily_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own achievements" ON achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own streaks" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can read own teams" ON teams
  FOR SELECT USING (auth.uid() = manager_id);

CREATE POLICY "Members can read their teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can read team members" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm2
      WHERE tm2.team_id = team_members.team_id
      AND tm2.user_id = auth.uid()
    )
  );

-- ========================
-- FUNCTIONS
-- ========================

CREATE OR REPLACE FUNCTION get_team_health_stats(team_uuid UUID)
RETURNS TABLE (
  avg_score FLOAT,
  avg_active_hours FLOAT,
  total_focus_sessions INTEGER,
  burnout_alerts INTEGER,
  most_productive_day TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(ds.productivity_score)::numeric, 1)::float,
    ROUND((AVG(ds.total_active_seconds) / 3600.0)::numeric, 1)::float,
    COALESCE(SUM(ds.focus_sessions_count), 0)::integer,
    COUNT(*) FILTER (WHERE ds.burnout_risk > 0.6)::integer,
    TO_CHAR(MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM ds.summary_date)), 'Day')
  FROM daily_summaries ds
  JOIN team_members tm ON ds.user_id = tm.user_id
  WHERE tm.team_id = team_uuid
  AND ds.summary_date >= CURRENT_DATE - 7;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_productivity_score(
  p_user_id UUID,
  p_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_total_active INTEGER;
  v_productive INTEGER;
  v_distracting INTEGER;
  v_focus_sessions INTEGER;
  v_score INTEGER;
BEGIN
  SELECT COALESCE(SUM(duration_seconds), 0)
  INTO v_total_active
  FROM activity_logs
  WHERE user_id = p_user_id AND work_date = p_date;

  SELECT COALESCE(SUM(duration_seconds), 0)
  INTO v_productive
  FROM activity_logs
  WHERE user_id = p_user_id AND work_date = p_date AND category = 'productive';

  SELECT COALESCE(SUM(duration_seconds), 0)
  INTO v_distracting
  FROM activity_logs
  WHERE user_id = p_user_id AND work_date = p_date AND category = 'distracting';

  SELECT COUNT(*)
  INTO v_focus_sessions
  FROM focus_sessions
  WHERE user_id = p_user_id AND DATE(started_at) = p_date AND completed = true;

  v_score := GREATEST(0, LEAST(100,
    (v_productive::float / NULLIF(v_total_active, 0) * 100 * 0.4)::int +
    (v_focus_sessions * 5 * 0.25)::int +
    (100 - (v_distracting::float / NULLIF(v_total_active, 0) * 100) * 0.2)::int +
    20
  ));

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_burnout_risk(
  p_user_id UUID
)
RETURNS FLOAT AS $$
DECLARE
  v_avg_hours FLOAT;
  v_weekend_work INTEGER;
  v_score_trend FLOAT;
  v_risk FLOAT := 0.0;
BEGIN
  SELECT AVG(total_active_seconds) / 3600.0
  INTO v_avg_hours
  FROM daily_summaries
  WHERE user_id = p_user_id AND summary_date >= CURRENT_DATE - 7;

  SELECT COUNT(*)
  INTO v_weekend_work
  FROM daily_summaries
  WHERE user_id = p_user_id AND summary_date >= CURRENT_DATE - 28
  AND EXTRACT(DOW FROM summary_date) IN (0, 6);

  SELECT 
    (AVG(CASE WHEN summary_date >= CURRENT_DATE - 7 THEN productivity_score END) -
     AVG(CASE WHEN summary_date BETWEEN CURRENT_DATE - 21 AND CURRENT_DATE - 8 THEN productivity_score END))::float
  INTO v_score_trend
  FROM daily_summaries
  WHERE user_id = p_user_id AND summary_date >= CURRENT_DATE - 21;

  IF v_avg_hours > 10 THEN v_risk := v_risk + 0.25; END IF;
  IF v_weekend_work > 4 THEN v_risk := v_risk + 0.20; END IF;
  IF v_score_trend IS NOT NULL AND v_score_trend < -10 THEN v_risk := v_risk + 0.15; END IF;
  IF v_avg_hours > 9 THEN v_risk := v_risk + 0.10; END IF;

  RETURN LEAST(v_risk, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ========================
-- TRIGGERS
-- ========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================
-- DAILY AGGREGATION CRON
-- ========================
CREATE OR REPLACE FUNCTION aggregate_daily_summary()
RETURNS void AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - 1;
  v_user_record RECORD;
BEGIN
  FOR v_user_record IN SELECT id FROM users LOOP
    INSERT INTO daily_summaries (
      user_id, summary_date, total_active_seconds,
      productive_seconds, neutral_seconds, distracting_seconds,
      focus_sessions_count, focus_sessions_total_duration,
      productivity_score, tab_switches, burnout_risk, top_domains
    )
    SELECT
      v_user_record.id,
      v_yesterday,
      COALESCE(SUM(al.duration_seconds), 0),
      COALESCE(SUM(CASE WHEN al.category = 'productive' THEN al.duration_seconds ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN al.category = 'neutral' THEN al.duration_seconds ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN al.category = 'distracting' THEN al.duration_seconds ELSE 0 END), 0),
      COALESCE((SELECT COUNT(*) FROM focus_sessions WHERE user_id = v_user_record.id AND DATE(started_at) = v_yesterday AND completed = true), 0),
      COALESCE((SELECT SUM(actual_duration) FROM focus_sessions WHERE user_id = v_user_record.id AND DATE(started_at) = v_yesterday AND completed = true), 0),
      calculate_productivity_score(v_user_record.id, v_yesterday),
      0,
      calculate_burnout_risk(v_user_record.id),
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('domain', domain, 'seconds', total_seconds) ORDER BY total_seconds DESC)
         FROM (
           SELECT domain, SUM(duration_seconds) as total_seconds
           FROM activity_logs
           WHERE user_id = v_user_record.id AND work_date = v_yesterday
           GROUP BY domain
           ORDER BY total_seconds DESC
           LIMIT 5
         ) top_sites),
        '[]'::jsonb
      )
    FROM activity_logs al
    WHERE al.user_id = v_user_record.id AND al.work_date = v_yesterday
    ON CONFLICT (user_id, summary_date) DO UPDATE SET
      total_active_seconds = EXCLUDED.total_active_seconds,
      productive_seconds = EXCLUDED.productive_seconds,
      neutral_seconds = EXCLUDED.neutral_seconds,
      distracting_seconds = EXCLUDED.distracting_seconds,
      focus_sessions_count = EXCLUDED.focus_sessions_count,
      focus_sessions_total_duration = EXCLUDED.focus_sessions_total_duration,
      productivity_score = EXCLUDED.productivity_score,
      tab_switches = EXCLUDED.tab_switches,
      burnout_risk = EXCLUDED.burnout_risk,
      top_domains = EXCLUDED.top_domains;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
