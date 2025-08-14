export interface MarketItem {
  id: string;
  name: string;
  type: 'animal' | 'food' | 'training' | 'boost' | 'cosmetic' | 'gold';
  description?: string;
  price: number;
  effect_value?: number;
  duration_seconds?: number;
  cooldown_seconds?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level_required?: number;
  max_stock?: number;
  is_active: boolean;
}
