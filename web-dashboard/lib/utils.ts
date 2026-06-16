import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-zenwork-green'
  if (score >= 60) return 'text-zenwork-amber'
  return 'text-zenwork-red'
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-zenwork-green/20'
  if (score >= 60) return 'bg-zenwork-amber/20'
  return 'bg-zenwork-red/20'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional 🔥'
  if (score >= 80) return 'Great 🟢'
  if (score >= 70) return 'Good 🟡'
  if (score >= 60) return 'Fair 🟠'
  return 'Needs Work 🔴'
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'ZW-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
