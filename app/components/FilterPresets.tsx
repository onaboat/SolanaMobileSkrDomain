'use client'

import { useState } from 'react'

export type TimeRange = '7d' | '30d' | '90d' | 'all'

interface FilterPresetsProps {
  selectedRange: TimeRange
  onRangeChange: (range: TimeRange) => void
}

const timeRanges = [
  { value: '7d', label: 'Weekly Overview' },
  { value: '30d', label: 'Monthly Trends' },
  { value: '90d', label: 'Quarterly Analysis' },
  { value: 'all', label: 'All Time' }
] as const

export default function FilterPresets({ selectedRange, onRangeChange }: FilterPresetsProps) {
  return (
    <div className="filter-presets">
      <div className="filter-buttons">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value as TimeRange)}
            className={`filter-button ${selectedRange === range.value ? 'active' : ''}`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  )
}
