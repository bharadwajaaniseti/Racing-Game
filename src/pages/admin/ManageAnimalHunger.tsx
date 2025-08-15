import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Animal {
  id: string;
  name: string;
  hunger_rate: number | null;
  market_hunger_rate: number | null;
}

export default function ManageAnimalHunger() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from('animals_with_hunger')
        .select('id, name, hunger_rate, market_hunger_rate')
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
    try {
      const { error } = await supabase
        .from('animals')
        .update({ hunger_rate: newRate })
        .eq('id', animalId);

      if (error) throw error;
      
      // Update local state
      setAnimals(animals.map(animal => 
        animal.id === animalId 
          ? { ...animal, hunger_rate: newRate }
          : animal
      ));

      toast.success('Hunger rate updated successfully');
    } catch (error: any) {
      toast.error('Failed to update hunger rate');
      console.error('Error:', error);
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-bold text-white mb-8">Manage Animal Hunger Rates</h1>
        
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Animal Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Market Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Custom Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {animals.map((animal) => (
                <tr key={animal.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {animal.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {animal.market_hunger_rate?.toFixed(1) || 'N/A'} points/min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {animal.hunger_rate?.toFixed(1) || 'Using market rate'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => {
                        const newRate = prompt(
                          'Enter new hunger rate (points per minute), or leave blank to use market rate:', 
                          animal.hunger_rate?.toString() || ''
                        );
                        if (newRate === null) return; // User cancelled
                        const rate = newRate.trim() === '' ? null : Number(newRate);
                        if (newRate !== '' && (isNaN(rate!) || rate! <= 0)) {
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
                    {animal.hunger_rate && (
                      <button
                        onClick={() => updateHungerRate(animal.id, null)}
                        disabled={saving}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        Reset to Market Rate
                      </button>
                    )}
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
