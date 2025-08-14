import { Coins } from 'lucide-react'
import type { MarketItem } from '../types/market'

interface GoldPackagesProps {
  marketItems: MarketItem[]
}

export function GoldPackages({ marketItems }: GoldPackagesProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {marketItems
        .filter(item => item.type === 'gold' && item.is_active)
        .map((goldPackage) => (
          <div 
            key={goldPackage.id}
            className="relative bg-gradient-to-br from-yellow-900/30 to-yellow-600/30 rounded-xl p-6 border border-yellow-500/30 backdrop-blur-sm hover:border-yellow-400/50 transition-all group"
          >
            <div className="absolute -top-3 -right-3 bg-yellow-500 rounded-full p-2 shadow-lg">
              <Coins className="w-5 h-5 text-yellow-900" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {goldPackage.name}
            </h3>
            
            <p className="text-gray-300 text-sm mb-4">
              {goldPackage.description}
            </p>

            <div className="flex justify-between items-baseline mb-4">
              <span className="text-2xl font-bold text-yellow-400">
                {goldPackage.effect_value?.toLocaleString()} Gold
              </span>
              <span className="text-green-400 font-medium">
                ${goldPackage.price.toFixed(2)}
              </span>
            </div>

            <button
              className="w-full bg-gray-800/60 hover:bg-gray-800/80 text-gray-400 px-4 py-2 rounded-lg font-medium transition-all cursor-not-allowed"
              disabled
            >
              Coming Soon
            </button>
            
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-gray-500 italic">
                Payment gateway integration coming soon
              </span>
            </div>
          </div>
        ))}
    </div>
  )
}
