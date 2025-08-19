'use client'

import { useState } from 'react'

export type TimeRange = '3d' | '5d' | '7d' | '10d' | '14d' | '21d' | '30d' | 'all'

interface FilterPresetsProps {
  selectedRange: TimeRange
  onRangeChange: (range: TimeRange) => void
}

const timeRanges = [
  { value: '3d', label: 'Past 3 Days' },
  { value: '5d', label: 'Past 5 Days' },
  { value: '7d', label: 'Past 7 Days' },
  { value: '10d', label: 'Past 10 Days' },
  { value: '14d', label: 'Past 2 Weeks' },
  { value: '21d', label: 'Past 3 Weeks' },
  { value: '30d', label: 'Past Month' },
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
