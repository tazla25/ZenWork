'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Target, Flame, TrendingUp, Clock, 
  Activity, Award, Brain, Coffee, Settings,
  LogOut, RefreshCw, Play, Square
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDuration, getScoreColor, getScoreLabel, cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import ProductivityChart from '../../components/productivity-chart'

interface TodayStats {
  score: number
  active_seconds: number
  productive_seconds: number
  distracting_seconds: number
  focus_sessions: number
  tab_switches: number
  domains: Record<string, number>
}

interface FocusSession {
  id: string
  session_type: string
  planned_duration: number
  actual_duration: number
  quality_score: number
  started_at: string
  completed: boolean
}

const MOCK_WEEKLY_DATA = [
  { day: 'Mon', score: 78, active: 6.2 },
  { day: 'Tue', score: 85, active: 6.8 },
  { day: 'Wed', score: 82, active: 6.5 },
  { day: 'Thu', score: 71, active: 5.9 },
  { day: 'Fri', score: 88, active: 7.1 },
  { day: 'Sat', score: 0, active: 0 },
  { day: 'Sun', score: 0, active: 0 },
]

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User')
      }

      // Fetch today's activity logs
      const today = new Date().toISOString().split('T')[0]
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('work_date', today)

      // Calculate stats from logs
      const stats: TodayStats = {
        score: 0,
        active_seconds: 0,
        productive_seconds: 0,
        distracting_seconds: 0,
        focus_sessions: 0,
        tab_switches: 0,
        domains: {}
      }

      if (logs && logs.length > 0) {
        logs.forEach((log: any) => {
          stats.active_seconds += log.duration_seconds
          if (log.category === 'productive') stats.productive_seconds += log.duration_seconds
          else if (log.category === 'distracting') stats.distracting_seconds += log.duration_seconds

          if (!stats.domains[log.domain]) stats.domains[log.domain] = 0
          stats.domains[log.domain] += log.duration_seconds
        })

        // Calculate score
        if (stats.active_seconds > 0) {
          const productiveRatio = stats.productive_seconds / stats.active_seconds
          const distractionPenalty = Math.min(stats.distracting_seconds / 3600, 1) * 20
          stats.score = Math.round((productiveRatio * 100) - distractionPenalty + 20)
          stats.score = Math.max(0, Math.min(100, stats.score))
        }
      }

      setTodayStats(stats)

      // Fetch focus sessions
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .gte('started_at', `${today}T00:00:00`)
        .order('started_at', { ascending: false })
        .limit(5)

      setFocusSessions(sessions || [])

      // Animate score
      const target = stats.score || 0
      const duration = 1500
      const start = performance.now()
      const animate = (currentTime: number) => {
        const elapsed = currentTime - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setAnimatedScore(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)

    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function simulateSync() {
    setIsSimulating(true)
    try {
      const token = localStorage.getItem('zw_session_token')
      if (!token) {
        alert('Please login first')
        return
      }

      const mockEvents = [
        {
          domain: 'github.com',
          category: 'productive',
          duration_seconds: 1800,
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date(Date.now() - 1800000).toISOString()
        },
        {
          domain: 'stackoverflow.com',
          category: 'productive',
          duration_seconds: 600,
          start_time: new Date(Date.now() - 1200000).toISOString(),
          end_time: new Date(Date.now() - 600000).toISOString()
        },
        {
          domain: 'youtube.com',
          category: 'distracting',
          duration_seconds: 300,
          start_time: new Date(Date.now() - 300000).toISOString(),
          end_time: new Date().toISOString()
        }
      ]

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const result = await res.json()
      if (result.success) {
        alert(`✅ Synced ${result.synced} events! Refreshing...`)
        await loadData()
      } else {
        alert('❌ Sync failed: ' + result.error)
      }
    } catch (e) {
      alert('❌ Sync error: ' + (e as Error).message)
    } finally {
      setIsSimulating(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('zw_session_token')
    router.push('/')
  }

  if (!mounted) return null

  const stats = todayStats || {
    score: 0,
    active_seconds: 0,
    productive_seconds: 0,
    distracting_seconds: 0,
    focus_sessions: 0,
    tab_switches: 0,
    domains: {}
  }

  const scoreColor = getScoreColor(stats.score)
  const scoreLabel = getScoreLabel(stats.score)
  const circumference = 2 * Math.PI * 52
  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a1a3e]">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zenwork-blue to-zenwork-purple flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ZenWork</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/settings" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zenwork-blue to-zenwork-purple ml-2" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            👋 Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userName}!
          </h1>
          <p className="text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • 
            {isLoading ? ' Loading your data...' : ' Your productivity at a glance'}
          </p>
        </motion.div>

        {/* Simulate Sync Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <button
            onClick={simulateSync}
            disabled={isSimulating}
            className="flex items-center gap-2 bg-zenwork-blue/20 border border-zenwork-blue/30 text-zenwork-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-zenwork-blue/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isSimulating && "animate-spin")} />
            {isSimulating ? 'Simulating...' : 'Simulate Sync from Extension'}
          </button>
        </motion.div>

        {/* Score Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zenwork-blue/20 via-zenwork-purple/10 to-transparent border border-white/10 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-zenwork-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center gap-8">
              <div className="relative w-40 h-40 flex-shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <motion.circle 
                    cx="60" cy="60" r="52" 
                    fill="none" 
                    stroke="#4A90D9" 
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white font-display">{animatedScore}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-zenwork-blue" />
                  <span className="text-lg font-semibold text-white">Focus Score</span>
                </div>
                <p className={`text-2xl font-bold mb-2 ${scoreColor}`}>{scoreLabel}</p>
                <p className="text-gray-400 text-sm mb-4">
                  {stats.active_seconds > 0 
                    ? `You're tracking well today. ${formatDuration(stats.productive_seconds)} of productive time.` 
                    : 'Start working to see your focus score! Install the ZenWork Chrome extension.'}
                </p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock className="w-4 h-4 text-zenwork-amber" />
                    <span>{formatDuration(stats.active_seconds)} active</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>{focusSessions.length} sessions today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-zenwork-green/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-zenwork-green" />
              </div>
              <span className="text-gray-400 text-sm">Productive Time</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatDuration(stats.productive_seconds)}</p>
            <p className="text-sm text-zenwork-green mt-1">
              {stats.active_seconds > 0 ? `${Math.round((stats.productive_seconds / stats.active_seconds) * 100)}% of active time` : 'No data yet'}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-zenwork-amber/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-zenwork-amber" />
              </div>
              <span className="text-gray-400 text-sm">Focus Sessions</span>
            </div>
            <p className="text-2xl font-bold text-white">{focusSessions.length}</p>
            <p className="text-sm text-zenwork-amber mt-1">
              {focusSessions.length > 0 
                ? `Avg ${Math.round(focusSessions.reduce((a, s) => a + s.actual_duration, 0) / focusSessions.length / 60)} min each`
                : 'Start a session from the extension'}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-zenwork-red/20 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-zenwork-red" />
              </div>
              <span className="text-gray-400 text-sm">Distraction Time</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatDuration(stats.distracting_seconds)}</p>
            <p className="text-sm text-zenwork-red mt-1">
              {stats.active_seconds > 0 
                ? `${Math.round((stats.distracting_seconds / stats.active_seconds) * 100)}% of active time`
                : 'No data yet'}
            </p>
          </motion.div>
        </div>

        {/* Charts + App Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-zenwork-blue" />
                7-Day Trend
              </h3>
            </div>
            <ProductivityChart data={MOCK_WEEKLY_DATA} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-zenwork-blue" />
              Today's App Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.domains).length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No activity tracked yet. Click "Simulate Sync" to test, or install the ZenWork extension.
                </p>
              ) : (
                Object.entries(stats.domains)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([domain, seconds], i) => {
                    const percentage = stats.active_seconds > 0 ? (seconds / stats.active_seconds) * 100 : 0
                    const isProductive = ['github', 'gitlab', 'stackoverflow', 'docs.google', 'notion', 'figma', 'vscode', 'linear', 'jira', 'slack'].some(p => domain.includes(p))
                    const isDistracting = ['youtube', 'netflix', 'twitter', 'x.com', 'instagram', 'facebook', 'reddit', 'tiktok'].some(d => domain.includes(d))
                    const color = isProductive ? 'bg-zenwork-green' : isDistracting ? 'bg-zenwork-red' : 'bg-zenwork-amber'
                    return (
                      <div key={domain} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-gray-300 truncate">{domain}</div>
                        <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(percentage, 4)}%` }}
                            transition={{ delay: 0.7 + i * 0.1, duration: 0.6 }}
                            className={cn("h-full rounded-lg", color)}
                          />
                        </div>
                        <div className="w-20 text-right text-sm text-gray-400">{formatDuration(seconds)}</div>
                        <div className="w-12 text-right text-sm text-gray-500">{percentage.toFixed(0)}%</div>
                      </div>
                    )
                  })
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Focus Sessions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-zenwork-purple" />
            Recent Focus Sessions
          </h3>
          {focusSessions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No focus sessions today. Start one from the ZenWork Chrome extension!
            </p>
          ) : (
            <div className="space-y-2">
              {focusSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    {session.completed ? <Target className="w-4 h-4 text-zenwork-green" /> : <Square className="w-4 h-4 text-zenwork-amber" />}
                    <div>
                      <p className="text-sm text-white font-medium capitalize">{session.session_type} Session</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{Math.round(session.actual_duration / 60)} min</p>
                    <p className={`text-xs ${session.quality_score >= 70 ? 'text-zenwork-green' : session.quality_score >= 50 ? 'text-zenwork-amber' : 'text-zenwork-red'}`}>
                      Quality: {session.quality_score}/100
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-zenwork-amber" />
              Your Badges
            </h3>
            <span className="text-sm text-gray-400">Level 1 • 0 XP</span>
          </div>
          <div className="flex gap-4">
            {[
              { icon: '🌅', name: 'Early Bird', earned: false },
              { icon: '🔥', name: 'Week Warrior', earned: false },
              { icon: '🧘', name: 'Zen Focus', earned: false },
              { icon: '💎', name: 'Diamond Streak', earned: false },
              { icon: '⚡', name: 'Lightning', earned: false },
            ].map((badge, i) => (
              <motion.div 
                key={badge.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                  badge.earned 
                    ? "bg-zenwork-amber/10 border-zenwork-amber/30" 
                    : "bg-white/5 border-white/5 opacity-40"
                )}
              >
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-xs text-gray-300 text-center">{badge.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
