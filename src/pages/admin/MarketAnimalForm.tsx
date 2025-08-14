import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadAnimalModel, uploadThumbnail } from '../../lib/uploadModel';
import AnimalModelPreview from '../../components/AnimalModelPreview';
import * as THREE from 'three';

type MarketAnimal = {
  id?: string;
  name: string;
  type: string;
  description?: string;
  price: number;
  speed: number;
  acceleration: number;
  stamina: number;
  temper: number;
  model_url?: string;
  model_scale?: number;
  model_rotation?: number;
  idle_anim?: string;
  run_anim?: string;
  thumbnail_url?: string;
  is_active?: boolean;
  stock?: number | null;
};

export default function MarketAnimalForm({ initial }: { initial?: Partial<MarketAnimal> }) {
  const [form, setForm] = useState<MarketAnimal>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'stag',
    description: initial?.description ?? '',
    price: initial?.price ?? 100,
    speed: initial?.speed ?? 50,
    acceleration: initial?.acceleration ?? 50,
    stamina: initial?.stamina ?? 50,
    temper: initial?.temper ?? 50,
    model_url: initial?.model_url,
    model_scale: initial?.model_scale ?? 1,
    model_rotation: initial?.model_rotation ?? 0,
    idle_anim: initial?.idle_anim ?? '',
    run_anim: initial?.run_anim ?? '',
    thumbnail_url: initial?.thumbnail_url,
    is_active: initial?.is_active ?? true,
    stock: initial?.stock ?? null,
    id: initial?.id,
  });
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [animList, setAnimList] = useState<string[]>([]);
  const [currentAnim, setCurrentAnim] = useState<string | undefined>(initial?.idle_anim || undefined);
  const initDone = useRef(false);
  const lastModelUrl = useRef<string | undefined>(undefined);

  const onChange = (k: keyof MarketAnimal, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Upsert to get an ID first
      let id = form.id;
      if (!id) {
        const { data, error } = await supabase
          .from('market_animals')
          .insert([{
            name: form.name, type: form.type, description: form.description,
            price: form.price, speed: form.speed, acceleration: form.acceleration,
            stamina: form.stamina, temper: form.temper, is_active: form.is_active, stock: form.stock
          }])
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      // Upload files if provided
      let modelUrl = form.model_url;
      if (modelFile) {
        const up = await uploadAnimalModel(modelFile, id!);
        modelUrl = up.publicUrl;
      }
      let thumbUrl = form.thumbnail_url;
      if (thumbFile) {
        const up = await uploadThumbnail(thumbFile, id!);
        thumbUrl = up.publicUrl;
      }

      // Final update with model/thumbnail + tuning params
      const { error: upErr } = await supabase.from('market_animals').update({
        name: form.name, type: form.type, description: form.description,
        price: form.price, speed: form.speed, acceleration: form.acceleration,
        stamina: form.stamina, temper: form.temper,
        model_url: modelUrl, model_scale: form.model_scale, model_rotation: form.model_rotation,
        idle_anim: form.idle_anim, run_anim: form.run_anim,
        thumbnail_url: thumbUrl, is_active: form.is_active, stock: form.stock,
      }).eq('id', id!);
      if (upErr) throw upErr;

      alert('Saved!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const handleAnimationSelect = (name: string, animations: THREE.AnimationClip[]) => {
    // Only process animations once per model URL
    const currentModelUrl = modelFile ? URL.createObjectURL(modelFile) : form.model_url;
    if (lastModelUrl.current === currentModelUrl) return;
    lastModelUrl.current = currentModelUrl;

    // Produce a nice, deduped list (strip Armature prefixes)
    const names = Array.from(new Set(animations.map(a => a.name.replace(/^.*\|/, ''))));
    setAnimList(names);

    // Set current animation only once per model
    if (!initDone.current) {
      setCurrentAnim(name);
      initDone.current = true;

      // Set defaults for game animations
      const defaultIdle = animations.find(a => 
        /^idle(_\d+)?$/i.test(a.name.replace(/^.*\|/, '')) && 
        !/hit|react|death|attack/i.test(a.name)
      ) || animations.find(a => 
        /(idle|breath|stand)/i.test(a.name.replace(/^.*\|/, '')) &&
        !/hit|react|death|attack/i.test(a.name)
      ) || animations[0];

      const defaultRun = animations.find(a => 
        /run|walk|gallop/i.test(a.name.replace(/^.*\|/, '')) &&
        !/hit|react|death|attack/i.test(a.name)
      ) || animations[0];

      if (defaultIdle) onChange('idle_anim', defaultIdle.name);
      if (defaultRun) onChange('run_anim', defaultRun.name);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <form onSubmit={onSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-200 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Name</span>
                <input value={form.name} onChange={e=>onChange('name', e.target.value)} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Type</span>
                <input value={form.type} onChange={e=>onChange('type', e.target.value)} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Description</span>
                <textarea value={form.description} onChange={e=>onChange('description', e.target.value)} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow min-h-[80px]"/>
              </label>
            </div>
          </div>

          {/* Stats */}
          <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-200 mb-4">Animal Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Price</span>
                <input type="number" value={form.price} onChange={e=>onChange('price', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Speed</span>
                <input type="number" value={form.speed} onChange={e=>onChange('speed', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Acceleration</span>
                <input type="number" value={form.acceleration} onChange={e=>onChange('acceleration', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Stamina</span>
                <input type="number" value={form.stamina} onChange={e=>onChange('stamina', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Temper</span>
                <input type="number" value={form.temper} onChange={e=>onChange('temper', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
            </div>
          </div>

          {/* Model Settings */}
          <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-200 mb-4">3D Model Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Model (.glb)</span>
                <input type="file" accept=".glb" onChange={e=>setModelFile(e.target.files?.[0] || null)} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Thumbnail (png/jpg)</span>
                <input type="file" accept="image/*" onChange={e=>setThumbFile(e.target.files?.[0] || null)} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Model Scale</span>
                <input type="number" step="0.01" value={form.model_scale} onChange={e=>onChange('model_scale', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Model Rotation (Y°)</span>
                <input type="number" step="1" value={form.model_rotation} onChange={e=>onChange('model_rotation', Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
              
              {animList.length > 0 && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-300">Idle Animation</span>
                    <select 
                      value={form.idle_anim} 
                      onChange={(e) => onChange('idle_anim', e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                    >
                      <option value="">Select animation</option>
                      {animList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-300">Run Animation</span>
                    <select 
                      value={form.run_anim} 
                      onChange={(e) => onChange('run_anim', e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"
                    >
                      <option value="">Select animation</option>
                      {animList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Market Settings */}
          <div className="col-span-2 space-y-4 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-200 mb-4">Market Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.is_active} onChange={e=>onChange('is_active', e.target.checked)} 
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500"/>
                <span className="text-sm font-medium text-gray-300">Active</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-300">Stock (blank = unlimited)</span>
                <input type="number" value={form.stock ?? ''} onChange={e=>onChange('stock', e.target.value === '' ? null : Number(e.target.value))} 
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow"/>
              </label>
            </div>
          </div>
        </div>

        <button disabled={saving} className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="h-full space-y-4">
        <div className="sticky top-4 space-y-4">
          <h3 className="font-semibold text-gray-200">Model Preview</h3>
          <AnimalModelPreview 
            modelUrl={modelFile ? URL.createObjectURL(modelFile) : form.model_url} 
            scale={form.model_scale} 
            rotation={form.model_rotation}
            animName={currentAnim}
            onAnimationSelect={handleAnimationSelect}
          />
        </div>
      </div>
    </div>
  );
}
