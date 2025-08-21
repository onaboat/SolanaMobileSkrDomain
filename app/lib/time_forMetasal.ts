
export function getGeographicRegion(timestamp: string | Date): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const utcHour = date.getUTCHours()
    
    if (utcHour >= 0 && utcHour < 6) return 'Asia-Pacific'
    if (utcHour >= 6 && utcHour < 12) return 'Europe'
    if (utcHour >= 12 && utcHour < 18) return 'Americas'
    return 'Other'
  }
  

  export function groupByGeographicRegion<T extends Record<string, any>>(
    items: T[],
    timestampKey: keyof T = 'timestamp' as keyof T
  ): Record<string, T[]> {
    return items.reduce((acc, item) => {
      const region = getGeographicRegion(item[timestampKey])
      if (!acc[region]) {
        acc[region] = []
      }
      acc[region].push(item)
      return acc
    }, {} as Record<string, T[]>)
  }
  

  export function getGeographicRegionStats<T extends Record<string, any>>(
    items: T[],
    timestampKey: keyof T = 'timestamp' as keyof T
  ): Array<{ region: string; count: number }> {
    const grouped = groupByGeographicRegion(items, timestampKey)
    
    return Object.entries(grouped)
      .map(([region, regionItems]) => ({
        region,
        count: regionItems.length
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
  }

// Example usage and dummy data for testing
if (require.main === module) {
  const dummyData = [
    { name: 'example1.skr', timestamp: '2025-01-29 09:15:13.000 UTC' },
    { name: 'example2.skr', timestamp: '2025-01-29 15:30:00.000 UTC' },
    { name: 'example3.skr', timestamp: '2025-01-29 02:45:00.000 UTC' },
    { name: 'example4.skr', timestamp: '2025-01-29 20:10:00.000 UTC' },
    { name: 'example5.skr', timestamp: '2025-01-29 07:30:00.000 UTC' },
    { name: 'example6.skr', timestamp: '2025-01-29 14:20:00.000 UTC' },
    { name: 'example7.skr', timestamp: '2025-01-29 03:15:00.000 UTC' },
    { name: 'example8.skr', timestamp: '2025-01-29 18:45:00.000 UTC' },
    { name: 'example9.skr', timestamp: '2025-01-29 11:00:00.000 UTC' },
    { name: 'example10.skr', timestamp: '2025-01-29 01:30:00.000 UTC' }
  ]



  console.log(' testing individual timestamps:')
  console.log('===============================================')
  dummyData.forEach(item => {
    const region = getGeographicRegion(item.timestamp)
    const utcHour = new Date(item.timestamp).getUTCHours()
    console.log(`${item.timestamp} (${utcHour.toString().padStart(2, '0')}:00 UTC) → ${region}`)
  })


  console.log('\n Testing groupByGeographicRegion:')
  console.log('==================================')
  const grouped = groupByGeographicRegion(dummyData)
  Object.entries(grouped).forEach(([region, items]) => {
    console.log(`\n${region}: ${items.length} domains`)
    items.forEach(item => console.log(` ${item.name}`))
  })


  console.log('\n Testing getGeographicRegionStats:')
  console.log('=====================================')
  const stats = getGeographicRegionStats(dummyData)
  stats.forEach(stat => {
    console.log(`${stat.region}: ${stat.count} domains`)
  })


  console.log('\n Testing with custom timestamp key:')
  console.log('=====================================')
  const customData = [
    { id: 1, created_at: '2025-01-29 09:15:13.000 UTC' },
    { id: 2, created_at: '2025-01-29 15:30:00.000 UTC' },
    { id: 3, created_at: '2025-01-29 02:45:00.000 UTC' }
  ]

  const customStats = getGeographicRegionStats(customData, 'created_at')
  customStats.forEach(stat => {
    console.log(`${stat.region}: ${stat.count} items`)
  })

  console.log('\nAll tests completed!')
}