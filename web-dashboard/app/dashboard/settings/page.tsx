'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Settings, Clock, Globe, Tag, Download, Trash2, 
  AlertTriangle, ChevronLeft, Save
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

interface UserSettings {
  work_hours_start: string
  work_hours_end: string
  work_days: number[]
  notifications: boolean
  focus_sound: string
  custom_categories: Record<string, string>
}

const DEFAULT_CATEGORIES = {
  productive: ['github.com', 'gitlab.com', 'stackoverflow.com', 'notion.so', 'figma.com', 'vscode.dev', 'linear.app', 'jira.com', 'slack.com'],
  distracting: ['youtube.com', 'netflix.com', 'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'reddit.com', 'tiktok.com'],
  neutral: ['google.com', 'gmail.com', 'linkedin.com', 'wikipedia.org']
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    work_hours_start: '09:00',
    work_hours_end: '18:00',
    work_days: [1, 2, 3, 4, 5],
    notifications: true,
    focus_sound: 'coffee_shop',
    custom_categories: {}
  })
  const [newDomain, setNewDomain] = useState('')
  const [newCategory, setNewCategory] = useState('productive')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const { data } = await supabase
      .from('users')
      .select('work_hours, preferences')
      .eq('id', user.id)
      .single()

    if (data) {
      const wh = data.work_hours || { start: '09:00', end: '18:00' }
      const prefs = data.preferences || {}
      setSettings({
        work_hours_start: wh.start,
        work_hours_end: wh.end,
        work_days: data.work_days || [1, 2, 3, 4, 5],
        notifications: prefs.notifications ?? true,
        focus_sound: prefs.focus_sound || 'coffee_shop',
        custom_categories: prefs.custom_categories || {}
      })
    }
  }

  async function saveSettings() {
    setIsSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('users')
        .update({
          work_hours: { start: settings.work_hours_start, end: settings.work_hours_end },
          work_days: settings.work_days,
          preferences: {
            notifications: settings.notifications,
            focus_sound: settings.focus_sound,
            custom_categories: settings.custom_categories
          }
        })
        .eq('id', userId)

      if (error) throw error
      setMessage('✅ Settings saved successfully!')
    } catch (e: any) {
      setMessage('❌ Error: ' + e.message)
    } finally {
      setIsSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  function addCustomCategory() {
    if (!newDomain.trim()) return
    const domain = newDomain.trim().toLowerCase()
    setSettings(prev => ({
      ...prev,
      custom_categories: {
        ...prev.custom_categories,
        [domain]: newCategory
      }
    }))
    setNewDomain('')
  }

  function removeCustomCategory(domain: string) {
    const updated = { ...settings.custom_categories }
    delete updated[domain]
    setSettings(prev => ({ ...prev, custom_categories: updated }))
  }

  async function exportData() {
    try {
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      const { data: summaries } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('summary_date', { ascending: false })

      const exportPayload = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        activity_logs: logs || [],
        focus_sessions: sessions || [],
        daily_summaries: summaries || []
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zenwork-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('✅ Data exported successfully!')
    } catch (e: any) {
      setMessage('❌ Export failed: ' + e.message)
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function deleteAccount() {
    setIsDeleting(true)
    try {
      // Delete all user data (RLS handles ownership)
      await supabase.from('activity_logs').delete().eq('user_id', userId)
      await supabase.from('focus_sessions').delete().eq('user_id', userId)
      await supabase.from('daily_summaries').delete().eq('user_id', userId)
      await supabase.from('achievements').delete().eq('user_id', userId)
      await supabase.from('streaks').delete().eq('user_id', userId)
      await supabase.from('subscriptions').delete().eq('user_id', userId)
      await supabase.from('team_members').delete().eq('user_id', userId)
      await supabase.from('users').delete().eq('id', userId)

      await supabase.auth.signOut()
      localStorage.removeItem('zw_session_token')
      router.push('/')
    } catch (e: any) {
      setMessage('❌ Deletion failed: ' + e.message)
      setIsDeleting(false)
    }
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a1a3e]">
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zenwork-blue to-zenwork-purple flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ZenWork</span>
            </div>
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
          <p className="text-gray-400 mb-8">Customize your ZenWork experience</p>

          {message && (
            <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white">
              {message}
            </div>
          )}

          {/* Work Hours */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-zenwork-blue" />
              <h2 className="text-lg font-semibold text-white">Work Hours</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={settings.work_hours_start}
                  onChange={(e) => setSettings(prev => ({ ...prev, work_hours_start: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-zenwork-blue/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={settings.work_hours_end}
                  onChange={(e) => setSettings(prev => ({ ...prev, work_hours_end: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-zenwork-blue/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Work Days</label>
              <div className="flex gap-2">
                {weekDays.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => {
                      const days = settings.work_days.includes(i)
                        ? settings.work_days.filter(d => d !== i)
                        : [...settings.work_days, i]
                      setSettings(prev => ({ ...prev, work_days: days.sort() }))
                    }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      settings.work_days.includes(i)
                        ? 'bg-zenwork-blue/20 text-zenwork-blue border border-zenwork-blue/30'
                        : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Site Categories */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-zenwork-purple" />
              <h2 className="text-lg font-semibold text-white">Custom Site Categories</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Override default categorizations for specific domains.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. example.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-zenwork-blue/50"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-zenwork-blue/50"
              >
                <option value="productive">Productive</option>
                <option value="neutral">Neutral</option>
                <option value="distracting">Distracting</option>
              </select>
              <button
                onClick={addCustomCategory}
                className="bg-zenwork-blue/20 border border-zenwork-blue/30 text-zenwork-blue px-4 py-2.5 rounded-xl font-medium hover:bg-zenwork-blue/30 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(settings.custom_categories).map(([domain, category]) => (
                <div key={domain} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      category === 'productive' ? 'bg-zenwork-green' :
                      category === 'distracting' ? 'bg-zenwork-red' : 'bg-zenwork-amber'
                    }`} />
                    <span className="text-sm text-white">{domain}</span>
                    <span className="text-xs text-gray-500 capitalize">{category}</span>
                  </div>
                  <button
                    onClick={() => removeCustomCategory(domain)}
                    className="text-gray-500 hover:text-zenwork-red transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {Object.keys(settings.custom_categories).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No custom categories yet.</p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-zenwork-amber" />
              <h2 className="text-lg font-semibold text-white">Preferences</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Smart Nudges</p>
                <p className="text-xs text-gray-500">Gentle productivity reminders</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.notifications ? 'bg-zenwork-blue' : 'bg-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          {/* GDPR Export */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-zenwork-green" />
              <h2 className="text-lg font-semibold text-white">Data Export (GDPR)</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Download all your data as a JSON file. This includes your activity logs, focus sessions, and daily summaries.
            </p>
            <button
              onClick={exportData}
              className="flex items-center gap-2 bg-zenwork-green/20 border border-zenwork-green/30 text-zenwork-green px-4 py-2.5 rounded-xl font-medium hover:bg-zenwork-green/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export My Data
            </button>
          </div>

          {/* Delete Account */}
          <div className="rounded-xl bg-zenwork-red/5 border border-zenwork-red/20 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-zenwork-red" />
              <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 bg-zenwork-red/20 border border-zenwork-red/30 text-zenwork-red px-4 py-2.5 rounded-xl font-medium hover:bg-zenwork-red/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zenwork-red font-medium">
                  Are you sure? All your data will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={deleteAccount}
                    disabled={isDeleting}
                    className="bg-zenwork-red text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-white/5 border border-white/10 text-gray-400 px-4 py-2.5 rounded-xl font-medium hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-zenwork-blue to-zenwork-purple text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
