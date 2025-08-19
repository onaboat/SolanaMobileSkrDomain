'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { DomainRegistration } from './types'
import FilterPresets, { type TimeRange } from './components/FilterPresets'
import GrowthChart from './components/GrowthChart'
import RegionalCards from './components/RegionalCards'

export default function Home() {
  const [domains, setDomains] = useState<DomainRegistration[]>([])
  const [isWatching, setIsWatching] = useState(false)
  const [watcherStats, setWatcherStats] = useState({
    totalProcessed: 0,
    domainsFound: 0,
    isConnected: false
  })
  const [newDomains, setNewDomains] = useState<DomainRegistration[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [flashTrigger, setFlashTrigger] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('7d')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true) // Add loading state

  // Use refs to track connections and prevent multiple setups
  const eventSourceRef = useRef<EventSource | null>(null)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // Apply search filter to all domains
  const filteredDomains = useMemo(() => {
    return domains.filter(domain =>
      domain.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [domains, searchTerm])

  // Load domains from API
  const loadDomains = async () => {
    try {
      setIsLoading(true) // Set loading to true
      console.log('🔄 Loading domains for timeRange:', selectedTimeRange)
      
      // Load more data for charts (up to 10,000 domains)
      const response = await fetch(`/api/domains?timeRange=${selectedTimeRange}&limit=10000&forChart=true`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 API Response:', { 
        domainsCount: data.domains?.length || 0, 
        pagination: data.pagination,
        error: data.error 
      })
      
      if (data.error) {
        console.error('❌ API Error:', data.error)
        return
      }
      
      setDomains(data.domains || [])
      setPagination(data.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 })
    } catch (error) {
      console.error('❌ Failed to load domains:', error)
    } finally {
      setIsLoading(false) // Set loading to false
    }
  }

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    // Update time every second
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString())
    }
    updateTime()
    timeIntervalRef.current = setInterval(updateTime, 1000)

    // Load initial domains
    loadDomains()

    // Start the watcher first, then establish WebSocket connection
    const initializeWatcher = async () => {
      try {
        console.log('🚀 Starting domain watcher...')
        const response = await fetch('/api/websocket?action=start')
        const result = await response.json()
        if (result.success) {
          setIsWatching(true)
          setWatcherStats(prev => ({ ...prev, isConnected: true }))
          console.log('✅ Domain watcher started successfully')
          
          // Now establish WebSocket connection after watcher is started
          const eventSource = new EventSource('/api/websocket')
          eventSourceRef.current = eventSource
          
          eventSource.onopen = () => {
            console.log('🔌 WebSocket connection opened successfully')
          }
          
          eventSource.onmessage = (event) => {
            console.log('📨 Raw WebSocket message received:', event.data)
            try {
              const data = JSON.parse(event.data)
              console.log('📨 Parsed WebSocket message:', data)
              
              if (data.type === 'newDomain') {
                console.log('🎯 Received new domain:', data.domain.name)
                console.log('🎯 Current domains count before update:', domains.length)
                
                // Force a state update by creating a new array
                setDomains(prev => {
                  const exists = prev.some(d => d.signature === data.domain.signature)
                  if (exists) {
                    console.log('⚠️ Domain already exists in state, skipping:', data.domain.name)
                    return prev
                  }
                  console.log('✅ Adding new domain to state:', data.domain.name)
                  console.log('✅ New domains count will be:', prev.length + 1)
                  
                  // Create a new array to ensure React detects the change
                  const newDomains = [data.domain, ...prev]
                  console.log('✅ New domains array length:', newDomains.length)
                  return newDomains
                })
                
                // Force a re-render by updating a separate state
                setFlashTrigger(prev => !prev)
                
                // Add to new domains list for green indicator (only if it matches current time filter)
                const domainDate = new Date(data.domain.timestamp)
                const now = new Date()
                let shouldShow = false

                switch (selectedTimeRange) {
                  case '3d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 3 * 24 * 60 * 60 * 1000
                    break
                  case '5d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 5 * 24 * 60 * 60 * 1000
                    break
                  case '7d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 7 * 24 * 60 * 60 * 1000
                    break
                  case '10d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 10 * 24 * 60 * 60 * 1000
                    break
                  case '14d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 14 * 24 * 60 * 60 * 1000
                    break
                  case '21d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 21 * 24 * 60 * 60 * 1000
                    break
                  case '30d':
                    shouldShow = now.getTime() - domainDate.getTime() <= 30 * 24 * 60 * 60 * 1000
                    break
                  case 'all':
                    shouldShow = true
                    break
                }

                if (shouldShow) {
                  setNewDomains(prev => {
                    const exists = prev.some(d => d.signature === data.domain.signature)
                    if (exists) return prev
                    return [data.domain, ...prev.slice(0, 9)] // Keep last 10
                  })
                }
                
                // Add flash animation class to the new domain
                setTimeout(() => {
                  const domainElement = document.querySelector(`[data-signature="${data.domain.signature}"]`)
                  if (domainElement) {
                    domainElement.classList.add('flash-animation')
                    setTimeout(() => {
                      domainElement.classList.remove('flash-animation')
                    }, 2500)
                  }
                }, 100)
                
                // Trigger flash animation for status indicators
                setFlashTrigger(true)
                setTimeout(() => setFlashTrigger(false), 2500)
                
                // Keep the new domain highlighted for 30 seconds
                setTimeout(() => {
                  setNewDomains(prev => prev.filter(d => d.signature !== data.domain.signature))
                }, 50000)
              } else if (data.type === 'reload') {
                console.log('🔄 Reloading domains from database...')
                loadDomains()
              } else if (data.type === 'stats') {
                setWatcherStats(data.stats)
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }

          eventSource.onerror = (error) => {
            console.error('❌ WebSocket connection error:', error)
            setWatcherStats(prev => ({ ...prev, isConnected: false }))
            
            // Try to reconnect after 5 seconds
            setTimeout(() => {
              console.log('🔄 Attempting to reconnect WebSocket...')
              if (eventSourceRef.current) {
                eventSourceRef.current.close()
              }
              const newEventSource = new EventSource('/api/websocket')
              eventSourceRef.current = newEventSource
            }, 5000)
          }
        } else {
          console.error('❌ Failed to start watcher:', result)
        }
      } catch (error) {
        console.error('❌ Failed to start watcher:', error)
      }
    }

    initializeWatcher()

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      // Stop watcher on unmount
      fetch('/api/websocket?action=stop').catch(console.error)
    }
  }, []) // Remove selectedTimeRange from dependencies

  // Reload domains when time range changes
  useEffect(() => {
    loadDomains()
  }, [selectedTimeRange])

  useEffect(() => {
    if (domains.length > 0) {
      // Test chart data calculation
      const testData = domains.reduce((acc, domain) => {
        const date = new Date(domain.timestamp).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log('📊 Test chart data:', testData)
      console.log('🧪 Test chart data entries:', Object.entries(testData))
    }
  }, [domains])

  // Add this useEffect to monitor state changes
  useEffect(() => {
    console.log('🔄 Domains state updated:', {
      totalDomains: domains.length,
      newDomainsCount: newDomains.length,
      filteredDomainsCount: filteredDomains.length,
      firstFewDomains: domains.slice(0, 3).map(d => d.name)
    })
  }, [domains, newDomains, filteredDomains])

  return (
    <div className="domains-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="flex items-center gap-3 md:gap-6">
              <svg width="108" height="18" viewBox="0 0 108 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M37.2422 0.951172H40.4613V14.2839H48.6236V17.1739H37.2422V0.951172Z"></path>
                <path d="M57.2898 0.951172H63.0684L68.4676 17.1739H65.1466L63.8034 13.143H56.4781L55.1349 17.1739H51.8906L57.2898 0.951172ZM62.8662 10.3562L60.7879 4.12012H59.4699L57.3916 10.3562H62.8662Z"></path>
                <path d="M72.3867 0.951172H77.9128L83.743 13.5991H84.1489V0.951172H87.3179V17.1739H81.7917L75.9364 4.526H75.5557V17.1739H72.3867V0.951172Z"></path>
                <path d="M96.618 0.950928H102.397L107.796 17.1736H104.475L103.132 13.1427H95.8062L94.463 17.1736H91.2188L96.618 0.950928ZM102.194 10.3559L100.116 4.11987H98.798L96.7198 10.3559H102.194Z"></path>
                <path d="M0.00139478 12.1803H3.29587C3.47301 13.6002 4.21084 14.6644 6.78143 14.6644H7.19986C9.6491 14.6644 10.3298 13.8024 10.3298 12.6364C10.3298 11.5722 9.48033 10.812 8.28918 10.6851L4.84129 10.1648C1.39757 9.6934 0.430987 7.46873 0.430987 5.47558C0.430987 2.30664 2.46458 0.571533 6.66705 0.571533C10.8695 0.571533 12.8766 2.3708 13.0287 5.91912H9.75928C9.53472 4.42671 8.94892 3.46012 6.67961 3.46012H6.40065C4.38659 3.46012 3.46045 4.19518 3.46045 5.38632C3.46045 6.57746 4.34753 7.2874 5.46336 7.41433L9.04934 7.93458C12.2964 8.33767 13.3843 10.2946 13.3843 12.5987C13.3843 15.7928 11.6102 17.5544 6.71727 17.5544C2.25536 17.5544 0.076713 15.73 0 12.1803H0.00139478Z"></path>
                <path d="M18.7972 2.84224C20.2869 1.32053 22.2981 0.571533 24.852 0.571533C27.4058 0.571533 29.4171 1.34285 30.883 2.86455C32.3726 4.38626 33.1063 6.45193 33.1063 9.08528C33.1063 11.7186 32.3726 13.7857 30.9067 15.306C29.4408 16.804 27.4295 17.5544 24.852 17.5544C22.2744 17.5544 20.2631 16.8054 18.7972 15.306C17.3313 13.7843 16.5977 11.7186 16.5977 9.08528C16.5977 6.45193 17.3313 4.36255 18.7972 2.84224ZM20.0721 10.1718C20.0721 13.02 21.9522 14.6728 24.8506 14.6728C27.7489 14.6728 29.6068 12.9335 29.6068 10.1718V7.93179C29.6068 5.08365 27.7489 3.45315 24.8506 3.45315C21.9522 3.45315 20.0721 5.21476 20.0721 7.93179V10.1718Z"></path>
              </svg>
              <svg width="29" height="24" viewBox="0 0 29 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.00191 24C0.59453 24 0.383573 23.4555 0.667283 23.1318L5.14844 18.2833C5.33031 18.092 5.56309 17.9963 5.81043 17.9963H28.5363C28.9437 17.9963 29.1547 18.5408 28.8709 18.8645L24.3898 23.7131C24.2079 23.9044 23.9751 24 23.7278 24H1.00191Z"></path>
                <path d="M1.00191 6.00368C0.59453 6.00368 0.383573 5.45923 0.667283 5.1355L5.14844 0.286941C5.33031 0.0956468 5.56309 0 5.81043 0H28.5363C28.9437 0 29.1547 0.544451 28.8709 0.868179L24.3898 5.71674C24.2079 5.90803 23.9751 6.00368 23.7278 6.00368H1.00191Z"></path>
                <path d="M23.706 8.94666C23.9606 8.94666 24.1861 9.04231 24.368 9.2336L28.8709 14.0822C29.1547 14.4132 28.9364 14.9503 28.529 14.9503H5.72313C5.46852 14.9503 5.24301 14.8547 5.06114 14.6634L0.558157 9.81484C0.274447 9.48375 0.492686 8.94666 0.900064 8.94666H23.706Z"></path>
              </svg>
              <svg width="101" height="18" viewBox="0 0 101 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M59.2852 14.3348H62.4792V3.79028H59.2852V0.951904H68.8924V3.79028H65.6733V14.3348H68.8924V17.1732H59.2852V14.3348Z"></path>
                <path d="M73.5117 0.951172H76.7309V14.2839H84.8931V17.1739H73.5117V0.951172Z"></path>
                <path d="M88.9922 0.951172H100.88V3.68913H92.1862V7.51641H100.247V10.2028H92.1862V14.4359H101.007V17.1739H88.9922V0.951172Z"></path>
                <path d="M12.2484 0.951172L9.38356 13.3968H9.17434H8.96652L6.10164 0.951172H0.144531V17.1739H3.31207L3.15865 4.50089H3.89788L6.81298 17.1739H9.17434H11.5371L14.4522 4.50089H15.1914L15.038 17.1739H18.2056V0.951172H12.2484Z"></path>
                <path d="M52.6604 8.4537V8.35328C54.1807 7.69355 54.9409 6.42569 54.9409 4.93048C54.9409 2.59841 53.2183 0.951172 50.0243 0.951172H42.5469V17.1739H50.4037C53.8767 17.1739 55.6508 15.0692 55.6508 12.5097C55.6508 10.5584 54.5615 9.13854 52.6604 8.4537ZM45.7409 3.48549H50.1596C51.0509 3.48549 51.7733 4.20799 51.7733 5.09925V5.85243C51.7733 6.7437 51.0509 7.4648 50.1596 7.4648H45.7409V3.48549ZM52.4568 12.8724C52.4568 13.8641 51.6534 14.6688 50.6617 14.6688H45.7409V9.9238H50.6617C51.6534 9.9238 52.4568 10.7286 52.4568 11.7203V12.8724Z"></path>
                <path d="M24.1019 2.84224C25.5915 1.32053 27.6028 0.571533 30.1567 0.571533C32.7105 0.571533 34.7218 1.34285 36.1877 2.86455C37.6773 4.38626 38.411 6.45193 38.411 9.08528C38.411 11.7186 37.6773 13.7857 36.2114 15.306C34.7455 16.804 32.7342 17.5544 30.1567 17.5544C27.5791 17.5544 25.5678 16.8054 24.1019 15.306C22.636 13.7843 21.9023 11.7186 21.9023 9.08528C21.9023 6.45193 22.636 4.36255 24.1019 2.84224ZM25.3781 10.1718C25.3781 13.02 27.2583 14.6728 30.1567 14.6728C33.055 14.6728 34.9129 12.9335 34.9129 10.1718V7.93179C34.9129 5.08365 33.055 3.45315 30.1567 3.45315C27.2583 3.45315 25.3781 5.21476 25.3781 7.93179V10.1718Z"></path>
              </svg>
            </span>
          </div>
          <div className="header-status">
            <span>SYSTEM STATUS: OPERATIONAL</span>
            <span>LAST UPDATE: {currentTime}</span>
            <span>VERSION: 2.1.0</span>
            <span className={`status-indicator ${watcherStats.isConnected ? 'connected' : 'disconnected'} ${flashTrigger ? 'flash-animation' : ''}`}>
              {watcherStats.isConnected ? '●' : '○'}
            </span>
            <span className={flashTrigger ? 'flash-animation' : ''}>{watcherStats.isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </div>

      {/* Filter Presets */}
      <FilterPresets 
        selectedRange={selectedTimeRange}
        onRangeChange={setSelectedTimeRange}
      />
      <div className="filter-status">
        {isLoading ? (
          <span>Loading domains...</span>
        ) : (
          `Showing ${domains.length} domains from ${
            selectedTimeRange === '3d' ? 'past 3 days' :
            selectedTimeRange === '5d' ? 'past 5 days' :
            selectedTimeRange === '7d' ? 'past 7 days' : 
            selectedTimeRange === '10d' ? 'past 10 days' : 
            selectedTimeRange === '14d' ? 'past 14 days' : 
            selectedTimeRange === '21d' ? 'past 21 days' : 
            selectedTimeRange === '30d' ? 'past 30 days' : 
            'all time'
          }`
        )}
      </div>

      {/* Charts Container */}
      <div className="charts-container">
        {isLoading ? (
          <div className="loading-charts">
            <div className="loading-spinner">Loading charts...</div>
          </div>
        ) : (
          <>
            <GrowthChart domains={domains} timeRange={selectedTimeRange} />
            <RegionalCards domains={domains} timeRange={selectedTimeRange} />
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search domain names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
        </div>
        {searchTerm && !isLoading && (
          <div className="search-results">
            Found {filteredDomains.length} of {domains.length} domains
          </div>
        )}
      </div>

      {/* Domain List */}
      {!isLoading && filteredDomains.length > 0 && (
        <div className="domain-list-container">
          <h3 className="section-title">All Domains</h3>
          <div className="domain-grid">
            {filteredDomains.slice(0, 50).map((domain, index) => (
              <a 
                key={domain.signature} 
                href={domain.owner 
                  ? `https://solscan.io/account/${domain.owner}` 
                  : `https://solscan.io/tx/${domain.signature}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={`domain-card ${newDomains.some(d => d.signature === domain.signature) ? 'new' : ''}`}
                data-signature={domain.signature}
              >
                <div className="domain-name">{domain.name}</div>
                <div className="domain-meta">
                  {domain.blockTime 
                    ? new Date(domain.blockTime * 1000).toLocaleString()
                    : new Date(domain.timestamp).toLocaleString()
                  }
                </div>
                <div className="domain-signature">
                  {domain.owner 
                    ? `${domain.owner.slice(0, 8)}...${domain.owner.slice(-8)}`
                    : `${domain.signature.slice(0, 8)}...${domain.signature.slice(-8)}`
                  }
                </div>
                {newDomains.some(d => d.signature === domain.signature) && (
                  <div className="new-badge">NEW</div>
                )}
              </a>
            ))}
          </div>
          {filteredDomains.length > 50 && (
            <div className="more-domains-indicator">
              Showing first 50 of {filteredDomains.length} domains
            </div>
          )}
        </div>
      )}
    </div>
  )
}
