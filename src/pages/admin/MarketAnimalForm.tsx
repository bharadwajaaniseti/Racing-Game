import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadAnimalModel, uploadThumbnail } from '../../lib/uploadModel';
import AnimalModelPreview from '../../components/AnimalModelPreview';

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

  return (
    <div className="grid grid-cols-2 gap-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">Name <input value={form.name} onChange={e=>onChange('name', e.target.value)} className="input"/></label>
          <label className="flex flex-col">Type <input value={form.type} onChange={e=>onChange('type', e.target.value)} className="input"/></label>
          <label className="col-span-2 flex flex-col">Description <textarea value={form.description} onChange={e=>onChange('description', e.target.value)} className="textarea"/></label>
          <label className="flex flex-col">Price <input type="number" value={form.price} onChange={e=>onChange('price', Number(e.target.value))} className="input"/></label>
          <label className="flex flex-col">Speed <input type="number" value={form.speed} onChange={e=>onChange('speed', Number(e.target.value))} className="input"/></label>
          <label className="flex flex-col">Acceleration <input type="number" value={form.acceleration} onChange={e=>onChange('acceleration', Number(e.target.value))} className="input"/></label>
          <label className="flex flex-col">Stamina <input type="number" value={form.stamina} onChange={e=>onChange('stamina', Number(e.target.value))} className="input"/></label>
          <label className="flex flex-col">Temper <input type="number" value={form.temper} onChange={e=>onChange('temper', Number(e.target.value))} className="input"/></label>

          <label className="flex flex-col">Model (.glb)
            <input type="file" accept=".glb" onChange={e=>setModelFile(e.target.files?.[0] || null)} />
          </label>
          <label className="flex flex-col">Thumbnail (png/jpg)
            <input type="file" accept="image/*" onChange={e=>setThumbFile(e.target.files?.[0] || null)} />
          </label>

          <label className="flex flex-col">Model Scale
            <input type="number" step="0.01" value={form.model_scale} onChange={e=>onChange('model_scale', Number(e.target.value))} className="input" />
          </label>
          <label className="flex flex-col">Model Rotation (Y°)
            <input type="number" step="1" value={form.model_rotation} onChange={e=>onChange('model_rotation', Number(e.target.value))} className="input" />
          </label>
          <label className="flex flex-col">Idle Anim <input value={form.idle_anim} onChange={e=>onChange('idle_anim', e.target.value)} className="input" /></label>
          <label className="flex flex-col">Run Anim <input value={form.run_anim} onChange={e=>onChange('run_anim', e.target.value)} className="input" /></label>

          <label className="flex items-center gap-2">Active
            <input type="checkbox" checked={!!form.is_active} onChange={e=>onChange('is_active', e.target.checked)} />
          </label>
          <label className="flex flex-col">Stock (blank = unlimited)
            <input type="number" value={form.stock ?? ''} onChange={e=>onChange('stock', e.target.value === '' ? null : Number(e.target.value))} className="input" />
          </label>
        </div>

        <button disabled={saving} className="btn btn-primary w-full">{saving ? 'Saving...' : 'Save'}</button>
      </form>

      <div className="h-full">
        <div className="sticky top-4">
          <h3 className="font-semibold mb-2">Model Preview</h3>
          <div className="h-[400px] border rounded-lg overflow-hidden">
            <AnimalModelPreview 
              modelUrl={modelFile ? URL.createObjectURL(modelFile) : form.model_url} 
              scale={form.model_scale} 
              rotation={form.model_rotation}
              animName={form.idle_anim}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
