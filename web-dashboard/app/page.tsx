'use client'

import { motion } from 'framer-motion'
import { Zap, Shield, Brain, Target, Check, ArrowRight, Users } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a1a3e]">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zenwork-blue to-zenwork-purple flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ZenWork</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
                Sign In
              </Link>
              <Link href="/login" className="bg-gradient-to-r from-zenwork-blue to-zenwork-purple text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Focus and <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenwork-blue to-zenwork-purple">Trust</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            ZenWork is your AI-powered productivity companion. We understand your work patterns, 
            not your keystrokes. No surveillance. No screenshots. Just pure focus.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" className="bg-gradient-to-r from-zenwork-blue to-zenwork-purple text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#pricing" className="border border-white/20 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/5 transition-colors">
              View Pricing
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-8"
          >
            <div className="w-12 h-12 rounded-xl bg-zenwork-blue/20 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-zenwork-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Smart Focus Sessions</h3>
            <p className="text-gray-400 text-sm">Pomodoro-style sprints with distraction blocking. 25, 50, or 90-minute deep work modes.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-8"
          >
            <div className="w-12 h-12 rounded-xl bg-zenwork-purple/20 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-zenwork-purple" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Insights</h3>
            <p className="text-gray-400 text-sm">Personalized productivity patterns. Know your peak hours, burnout risks, and improvement areas.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-8"
          >
            <div className="w-12 h-12 rounded-xl bg-zenwork-green/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-zenwork-green" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Privacy First</h3>
            <p className="text-gray-400 text-sm">Domain-only tracking. No keystrokes, no screenshots, no content. Your data, your control.</p>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Simple Pricing</h2>
          <p className="text-gray-400">For individuals and teams who value focus</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* B2C */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-zenwork-blue" />
              <span className="text-sm font-semibold text-zenwork-blue">For Individuals</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">ZenWork Pro</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold text-white">₹199</span>
              <span className="text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {['Unlimited focus sessions', '7-day productivity trends', 'AI insights & nudges', 'Custom site categories', 'GDPR data export'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-zenwork-green" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="block w-full text-center bg-zenwork-blue/20 border border-zenwork-blue/30 text-zenwork-blue py-3 rounded-xl font-semibold hover:bg-zenwork-blue/30 transition-colors">
              Get Pro
            </Link>
          </motion.div>

          {/* B2B */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="rounded-2xl bg-gradient-to-br from-zenwork-purple/20 to-zenwork-blue/10 border border-zenwork-purple/30 p-8 relative"
          >
            <div className="absolute top-4 right-4 bg-zenwork-purple/20 text-zenwork-purple text-xs font-semibold px-3 py-1 rounded-full">
              Popular
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-zenwork-purple" />
              <span className="text-sm font-semibold text-zenwork-purple">For Teams</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">ZenWork Team</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold text-white">₹999</span>
              <span className="text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {['Everything in Pro', 'Up to 25 team members', 'Anonymized team health', 'Burnout risk alerts', 'Manager dashboard', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-zenwork-green" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="block w-full text-center bg-gradient-to-r from-zenwork-purple to-zenwork-blue text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              Start Team Trial
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          ZenWork — Understand, don't surveil. Built with focus in India.
        </div>
      </footer>
    </div>
  )
}
