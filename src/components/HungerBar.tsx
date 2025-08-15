import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

interface HungerBarProps {
  currentLevel: number
  hungerRate: number
  showLabel?: boolean
  showRate?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

export function HungerBar({ 
  currentLevel, 
  hungerRate, 
  showLabel = true,
  showRate = true,
  size = 'md',
  animated = true,
  className = ''
}: HungerBarProps) {
  const [displayLevel, setDisplayLevel] = useState(currentLevel)

  // Smooth animation for level changes
  useEffect(() => {
    if (animated) {
      const duration = 500 // 500ms animation
      const steps = 30
      const stepTime = duration / steps
      const startLevel = displayLevel
      const endLevel = currentLevel
      const difference = endLevel - startLevel
      
      let currentStep = 0
      const animate = () => {
        currentStep++
        const progress = currentStep / steps
        const easeOutQuad = 1 - (1 - progress) * (1 - progress) // Ease out animation
        const newLevel = startLevel + (difference * easeOutQuad)
        
        setDisplayLevel(newLevel)
        
        if (currentStep < steps) {
          setTimeout(animate, stepTime)
        } else {
          setDisplayLevel(currentLevel)
        }
      }
      
      if (Math.abs(difference) > 0.1) {
        animate()
      }
    } else {
      setDisplayLevel(currentLevel)
    }
  }, [currentLevel, animated])

  const getBarHeight = () => {
    switch (size) {
      case 'sm': return 'h-2'
      case 'md': return 'h-3'
      case 'lg': return 'h-4'
      default: return 'h-3'
    }
  }

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-xs'
      case 'md': return 'text-sm'
      case 'lg': return 'text-base'
      default: return 'text-sm'
    }
  }

  const getStatusColor = () => {
    if (displayLevel <= 0) return { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500' }
    if (displayLevel <= 20) return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-400' }
    if (displayLevel <= 40) return { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-400' }
    if (displayLevel <= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-400' }
    return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-400' }
  }

  const colors = getStatusColor()
  const barHeight = getBarHeight()
  const textSize = getTextSize()

  const getStatusMessage = () => {
    if (displayLevel <= 0) return "Too hungry to race!"
    if (displayLevel <= 20) return "Critically hungry - feed immediately!"
    if (displayLevel <= 40) return "Very hungry - feed soon"
    if (displayLevel <= 70) return "Getting hungry"
    return "Well fed"
  }

  return (
    <div className={`${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Heart className={`h-4 w-4 ${colors.text}`} />
            <span className="font-medium text-white">Hunger</span>
          </div>
          <span className={`${textSize} font-bold ${colors.text}`}>
            {Math.round(displayLevel)}%
          </span>
        </div>
      )}
      
      <div className="space-y-2">
        {/* Progress Bar */}
        <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${barHeight}`}>
          <div 
            className={`${colors.bg} ${barHeight} rounded-full transition-all duration-500 ease-out relative`}
            style={{ width: `${Math.max(0, Math.min(100, displayLevel))}%` }}
          >
            {animated && (
              <div className={`absolute inset-0 ${colors.bg} opacity-30 animate-pulse`} />
            )}
          </div>
        </div>

        {showRate && (
          <div className={`${textSize} text-gray-400 flex items-center justify-between`}>
            <span>
              Decreases {hungerRate}/min
            </span>
            <span className={`${colors.text} font-medium`}>
              {getStatusMessage()}
            </span>
          </div>
        )}

        {displayLevel <= 30 && (
          <div className={`${textSize} flex items-center text-red-400 bg-red-900/30 rounded-lg px-3 py-2 border ${colors.border}/30`}>
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">
              {displayLevel <= 0 ? 
                "Animal cannot race until fed!" : 
                "Low hunger affects racing performance"
              }
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
