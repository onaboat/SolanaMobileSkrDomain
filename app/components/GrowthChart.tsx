'use client'

import { useMemo, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DomainRegistration } from '../types'
import type { TimeRange } from './FilterPresets'

interface GrowthChartProps {
  domains: DomainRegistration[]
  timeRange: TimeRange
}

interface ChartDataPoint {
  date: string
  registrations: number
  cumulative: number
}

export default function GrowthChart({ domains, timeRange }: GrowthChartProps) {
  // Memoize the chart data calculation to prevent unnecessary recalculations
  const data: ChartDataPoint[] = useMemo(() => {
    
    if (domains.length === 0) {
      return []
    }
    
    // Group domains by date
    const grouped = domains.reduce((acc, domain) => {
      const date = new Date(domain.timestamp).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Create data points and sort by date
    const dataPoints = Object.entries(grouped)
      .map(([date, count]) => ({ date, registrations: count, cumulative: 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate cumulative values
    let cumulative = 0
    dataPoints.forEach(point => {
      cumulative += point.registrations
      point.cumulative = cumulative
    })
    
    return dataPoints
  }, [domains]) // Only recalculate when domains change

  // Calculate dynamic Y-axis domain based on actual data
  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return [0, 100]
    
    const maxRegistrations = Math.max(...data.map(d => d.registrations))
    const maxCumulative = Math.max(...data.map(d => d.cumulative))
    const maxValue = Math.max(maxRegistrations, maxCumulative)
    
    // Add some padding to the top (10% of max value)
    const paddedMax = Math.ceil(maxValue * 1.1)
    
    return [0, paddedMax]
  }, [data])

  // Memoize the tooltip content style to prevent object recreation
  const tooltipStyle = useMemo(() => ({
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#00ff00'
  }), [])

  return (
    <div className="growth-chart">
      <h3 className="chart-title">Domain Registration Growth</h3>
      {data.length === 0 ? (
        <div className="no-data">No data available for the selected time range</div>
      ) : (
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#00ff00', fontSize: 12 }}
                axisLine={{ stroke: '#333' }}
              />
              <YAxis 
                tick={{ fill: '#00ff00', fontSize: 12 }}
                axisLine={{ stroke: '#333' }}
                domain={yAxisDomain}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line 
                dataKey="registrations" 
                stroke="#00ff00" 
                strokeWidth={2}
                dot={{ fill: '#00ff00', strokeWidth: 2, r: 4 }}
              />
              <Line 
                dataKey="cumulative" 
                stroke="#00aa00" 
                strokeWidth={2}
                dot={{ fill: '#00aa00', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
