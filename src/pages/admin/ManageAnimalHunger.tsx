import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Animal {
  id: string;
  name: string;
  hunger_rate: number | null;
  type: string;
  description: string;
  price: number;
}

export default function ManageAnimalHunger() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from('market_animals')
        .select('id, name, hunger_rate, type, description, price')
        .order('name');

      if (error) throw error;
      setAnimals(data || []);
    } catch (error: any) {
      toast.error('Failed to load animals');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateHungerRate = async (animalId: string, newRate: number | null) => {
    setSaving(true);
    console.log('Updating hunger rate:', { animalId, newRate });
    try {
      const { error, data } = await supabase
        .from('market_animals')
        .update({ hunger_rate: newRate })
        .eq('id', animalId)
        .select('id, name, hunger_rate');

      console.log('Supabase response:', { error, data });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      // Update local state
      setAnimals(animals.map(animal => 
        animal.id === animalId 
          ? { ...animal, hunger_rate: newRate }
          : animal
      ));

      toast.success('Hunger rate updated successfully! All user animals of this type have been updated automatically.');
    } catch (error: any) {
      console.error('Full error object:', error);
      toast.error(`Failed to update hunger rate: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Manage Animal Hunger Rates</h1>
          <button
            onClick={syncAllAnimals}
            disabled={syncing || saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync All Animals</span>
              </>
            )}
          </button>
        </div>
        
        <div className="mb-4 bg-blue-900/50 border border-blue-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-blue-400 font-semibold">Auto-Sync Enabled</h3>
              <p className="text-blue-300 text-sm mt-1">
                When you update a hunger rate here, all existing user animals of that type will be automatically updated. 
                Use "Sync All Animals" to manually synchronize any animals that might be out of sync.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Animal Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Hunger Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {animals.map((animal) => (
                <tr key={animal.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">{animal.name}</div>
                      <div className="text-sm text-gray-400">{animal.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {animal.price} coins
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {animal.hunger_rate?.toFixed(1) || '1.0'} points/min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => {
                        const newRate = prompt(
                          'Enter new hunger rate (points per minute):', 
                          animal.hunger_rate?.toString() || '1.0'
                        );
                        if (newRate === null) return; // User cancelled
                        const rate = Number(newRate);
                        if (isNaN(rate) || rate <= 0) {
                          toast.error('Please enter a valid number greater than 0');
                          return;
                        }
                        updateHungerRate(animal.id, rate);
                      }}
                      disabled={saving}
                      className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors disabled:opacity-50"
                    >
                      Edit Rate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
