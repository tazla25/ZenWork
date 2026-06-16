'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface TrendPoint {
  summary_date: string
  productivity_score: number
}

interface TeamHealthChartProps {
  data: TrendPoint[]
}

export default function TeamHealthChart({ data }: TeamHealthChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
    )
  }

  const formatted = data.map(d => ({
    date: new Date(d.summary_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: d.productivity_score
  }))

  return (
    <ResponsiveContainer width="100%" height={192}>
      <LineChart data={formatted} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="date" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#718096', fontSize: 11 }}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#718096', fontSize: 12 }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px'
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '12px', color: '#718096' }}
        />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="#4A90D9" 
          strokeWidth={2}
          dot={{ fill: '#4A90D9', r: 3 }}
          activeDot={{ r: 5, fill: '#8E44AD' }}
          name="Avg Productivity Score"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
