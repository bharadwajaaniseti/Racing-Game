import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export interface MarketItemForm {
  id?: string;
  name: string;
  type: 'food' | 'training' | 'boost' | 'cosmetic' | 'gold';
  description: string;
  price: number;
  effect_value?: number;
  duration_seconds?: number;
  cooldown_seconds?: number;
  level_required?: number;
  max_stock?: number;
  is_active?: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface Props {
  initial?: Partial<MarketItemForm>;
  onSave?: () => void;
  onCancel?: () => void;
  itemType?: 'food' | 'other' | 'gold';
}

export default function MarketItemForm({ initial, onSave, onCancel, itemType = 'other' }: Props) {
  const [form, setForm] = useState<MarketItemForm>({
    name: initial?.name ?? '',
    type: initial?.type ?? (
      itemType === 'food' ? 'food' : 
      itemType === 'gold' ? 'gold' : 'training'
    ),
    description: initial?.description ?? '',
    price: initial?.price ?? 100,
    effect_value: initial?.effect_value ?? 0,
    duration_seconds: initial?.duration_seconds ?? 0,
    cooldown_seconds: initial?.cooldown_seconds ?? 0,
    level_required: initial?.level_required ?? 1,
    max_stock: initial?.max_stock,
    is_active: initial?.is_active ?? true,
    rarity: initial?.rarity ?? 'common',
    id: initial?.id,
  })

  const [saving, setSaving] = useState(false)

  const onChange = (k: keyof MarketItemForm, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) {
        // Update existing item
        const { error } = await supabase
          .from('market_items')
          .update({
            name: form.name,
            type: form.type,
            description: form.description,
            price: form.price,
            effect_value: form.effect_value || null,
            duration_seconds: form.duration_seconds || null,
            cooldown_seconds: form.cooldown_seconds || null,
            level_required: form.level_required || null,
            max_stock: form.max_stock || null,
            is_active: form.is_active,
            rarity: form.rarity,
          })
          .eq('id', form.id)
        if (error) throw error
      } else {
        // Create new item
        const { error } = await supabase
          .from('market_items')
          .insert({
            name: form.name,
            type: form.type,
            description: form.description,
            price: form.price,
            effect_value: form.effect_value || null,
            duration_seconds: form.duration_seconds || null,
            cooldown_seconds: form.cooldown_seconds || null,
            level_required: form.level_required || null,
            max_stock: form.max_stock || null,
            is_active: form.is_active,
            rarity: form.rarity,
          })
        if (error) throw error
      }
      onSave?.()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">
          {form.id ? 'Edit Item' : 'Create New Item'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
          <h4 className="font-semibold text-gray-200 mb-4">Basic Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-300">Name</span>
              <input 
                value={form.name} 
                onChange={e => onChange('name', e.target.value)}
                required
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-300">Type</span>
              <select
                value={form.type}
                onChange={e => onChange('type', e.target.value)}
                required
                disabled={itemType === 'food' || itemType === 'gold'}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
              >
                {itemType === 'food' ? (
                  <option value="food">Food</option>
                ) : itemType === 'gold' ? (
                  <option value="gold">Gold Package</option>
                ) : (
                  <>
                    <option value="training">Training</option>
                    <option value="boost">Boost</option>
                    <option value="cosmetic">Cosmetic</option>
                  </>
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-300">
                {itemType === 'gold' ? 'Price ($USD)' : 'Price (Gold)'}
              </span>
              <input
                type="number"
                value={form.price}
                onChange={e => onChange('price', Number(e.target.value))}
                required
                min={0}
                step={itemType === 'gold' ? 0.01 : 1}
                placeholder={itemType === 'gold' ? "e.g., 4.99" : "e.g., 100"}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-300">Rarity</span>
              <select
                value={form.rarity}
                onChange={e => onChange('rarity', e.target.value)}
                required
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </label>

            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-300">Description</span>
              <textarea
                value={form.description}
                onChange={e => onChange('description', e.target.value)}
                required
                rows={3}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
              />
            </label>
          </div>
        </div>

        {/* Effects and Timers */}
        {itemType !== 'gold' && (
          <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-200 mb-4">Effects & Timers</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Effect Value</span>
                <input
                  type="number"
                  value={form.effect_value}
                  onChange={e => onChange('effect_value', Number(e.target.value))}
                  placeholder="e.g., 10 for +10 stat boost"
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Duration (seconds)</span>
                <input
                  type="number"
                  value={form.duration_seconds}
                  onChange={e => onChange('duration_seconds', Number(e.target.value))}
                  min={0}
                  placeholder="e.g., 300 for 5 minutes"
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Cooldown (seconds)</span>
                <input
                  type="number"
                  value={form.cooldown_seconds}
                  onChange={e => onChange('cooldown_seconds', Number(e.target.value))}
                  min={0}
                  placeholder="e.g., 3600 for 1 hour"
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Required Level</span>
                <input
                  type="number"
                  value={form.level_required}
                  onChange={e => onChange('level_required', Number(e.target.value))}
                  min={1}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                />
              </label>
            </div>
          </div>
        )}
        
        {/* Gold Amount (for gold packages) */}
        {itemType === 'gold' && (
          <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-200 mb-4">Gold Package Details</h4>
            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Gold Amount</span>
                <input
                  type="number"
                  value={form.effect_value}
                  onChange={e => onChange('effect_value', Number(e.target.value))}
                  placeholder="e.g., 1000 for 1000 gold"
                  required
                  min={1}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                />
              </label>
            </div>
          </div>
        )}

        {/* Market Settings */}
        <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
          <h4 className="font-semibold text-gray-200 mb-4">Market Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={e => onChange('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-gray-300">Active</span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-300">Max Stock (blank = unlimited)</span>
              <input
                type="number"
                value={form.max_stock ?? ''}
                onChange={e => onChange('max_stock', e.target.value === '' ? null : Number(e.target.value))}
                min={0}
                placeholder="Leave blank for unlimited"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
              />
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
