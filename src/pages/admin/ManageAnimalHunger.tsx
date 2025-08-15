import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AnimalRow {
  id: string;                     // animals.id
  name: string;                   // animals.name
  hunger_rate: number | null;     // animals.hunger_rate (override)
  market_hunger_rate: number | null; // market_animals.hunger_rate (global)
  market_animal_id: string;       // animals.market_animal_id
}


export default function ManageAnimalHunger() {
  const [rows, setRows] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { fetchRows(); }, []);

  async function fetchRows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('market_animals')
        .select('id, name, hunger_rate')
        .order('name');

      if (error) throw error;
      // Map to AnimalRow format (no overrides, only market rates)
      const rows = (data ?? []).map((ma: any) => ({
        id: ma.id,
        name: ma.name,
        hunger_rate: null, // no override in market_animals
        market_hunger_rate: ma.hunger_rate,
        market_animal_id: ma.id,
      }));
      setRows(rows);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load animals');
    } finally {
      setLoading(false);
    }
  }

  // GLOBAL: edit the market animal's hunger_rate (fires triggers)
  async function updateMarketRate(marketAnimalId: string, newRate: number) {
    setSavingId(marketAnimalId);
    try {
      const { error } = await supabase
        .from('market_animals')
        .update({ hunger_rate: newRate })
        .eq('id', marketAnimalId);

      if (error) throw error;

      // Optimistically update local UI: update market_hunger_rate,
      // and any animal that wasn't overriding will reflect the new rate too.
      setRows(prev => prev.map(r => {
        const usingMarket = r.hunger_rate === null || r.hunger_rate === undefined;
        if (r.market_animal_id === marketAnimalId) {
          return {
            ...r,
            market_hunger_rate: newRate,
            hunger_rate: usingMarket ? null : r.hunger_rate, // keep overrides
          };
        }
        return r;
      }));

      toast.success('Market hunger rate updated for all linked animals.');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to update market hunger rate');
    } finally {
      setSavingId(null);
    }
  }

  // LOCAL: override a single animal's rate (does not fire sync; by design)
  async function overrideAnimalRate(animalId: string, newRate: number | null) {
    setSavingId(animalId);
    try {
      const { error, data } = await supabase
        .from('market_animals')
        .update({ hunger_rate: newRate })
        .eq('id', animalId)
        .select('id, name, hunger_rate');

      if (error) throw error;

      setRows(prev => prev.map(r => r.id === animalId ? { ...r, hunger_rate: newRate } : r));
      toast.success(newRate === null ? 'Reset to market rate.' : 'Custom rate saved for this animal.');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to update this animal’s rate');
    } finally {
      setSavingId(null);
    }
  }

  function askNumber(initial?: number | null) {
    const input = prompt(
      'Enter hunger rate (points per minute). Leave blank to cancel.',
      initial != null ? String(initial) : ''
    );
    if (input === null) return null;      // cancel
    const trimmed = input.trim();
    if (trimmed === '') return null;      // treat blank as cancel
    const n = Number(trimmed);
    if (!isFinite(n) || n <= 0) {
      toast.error('Please enter a valid number greater than 0.');
      return undefined;                   // invalid
    }
    return n;
  }

  const syncAllAnimals = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc('sync_all_animals_to_market_rates');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const updates = data.map((update: any) => 
          `${update.market_animal_name}: ${update.animals_updated} animals updated to ${update.new_hunger_rate} points/min`
        ).join('\n');
        
        toast.success(`Synchronization complete!\n${updates}`, { duration: 6000 });
      } else {
        toast.success('All animals are already synchronized with market rates');
      }
    } catch (error: any) {
      toast.error('Failed to sync animals');
      console.error('Error:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Manage Animal Hunger Rates</h1>

        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="text-amber-300 text-sm">
            <p><strong>Tip:</strong> Use <em>Edit Market Rate</em> to set the global rate for a species (fires DB triggers and syncs every linked animal).  
            Use <em>Override</em> to set a one-off rate for a specific animal. <em>Reset</em> clears the override to use the market rate again.</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Animal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Market Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Override</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rows.map((r) => {
                const isSaving = savingId === r.id || savingId === r.market_animal_id;
                return (
                  <tr key={r.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{r.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {r.market_hunger_rate != null ? `${r.market_hunger_rate.toFixed(1)} pts/min` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {r.hunger_rate != null ? `${r.hunger_rate.toFixed(1)} pts/min` : <span className="text-gray-400">Using market</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => {
                          const val = askNumber(r.market_hunger_rate);
                          if (val === null) return;        // cancel
                          if (val === undefined) return;    // invalid already toasted
                          updateMarketRate(r.market_animal_id, val);
                        }}
                        disabled={isSaving}
                        className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors disabled:opacity-50"
                      >
                        Edit Market Rate
                      </button>
                      <button
                        onClick={() => {
                          const val = askNumber(r.hunger_rate ?? r.market_hunger_rate);
                          if (val === null) return;
                          if (val === undefined) return;
                          overrideAnimalRate(r.id, val);
                        }}
                        disabled={isSaving}
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        Override
                      </button>
                      {r.hunger_rate != null && (
                        <button
                          onClick={() => overrideAnimalRate(r.id, null)}
                          disabled={isSaving}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
