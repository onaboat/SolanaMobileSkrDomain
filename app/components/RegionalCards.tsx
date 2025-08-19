'use client'

import { useMemo } from 'react'
import type { DomainRegistration } from '../types'
import type { TimeRange } from './FilterPresets'

interface RegionalCardsProps {
  domains: DomainRegistration[]
  timeRange: TimeRange
}

interface RegionalData {
  region: string
  count: number
}

export default function RegionalCards({ domains, timeRange }: RegionalCardsProps) {
  const regionalData = useMemo(() => {
    const regionalGroups = domains.reduce((acc, domain) => {
      const utcHour = new Date(domain.timestamp).getUTCHours()
      
      let region: string
      if (utcHour >= 0 && utcHour < 6) region = 'Asia-Pacific'
      else if (utcHour >= 6 && utcHour < 12) region = 'Europe'
      else if (utcHour >= 12 && utcHour < 18) region = 'Americas'
      else region = 'Other'
      
      acc[region] = (acc[region] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(regionalGroups).map(([region, count]) => ({
      region,
      count
    })).sort((a, b) => b.count - a.count)
  }, [domains]) // Update whenever domains change

  return (
    <div className="regional-cards">
      <h3 className="chart-title">Regional Activity <span className="explanation-text">calculated based on the UTC timestamp of domain registrations</span></h3>
      <div className="cards-grid">
        {regionalData.map((data) => (
          <div key={data.region} className="regional-card">
            <div className="card-header">
              <h4 className="region-name">{data.region}</h4>
            </div>
            <div className="card-content">
              <div className="count">{data.count.toLocaleString()} domains</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



