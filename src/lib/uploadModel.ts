import { supabase } from './supabase';

export async function uploadAnimalModel(file: File, marketId: string) {
  if (!file || file.type !== 'model/gltf-binary') {
    // allow .glb even if some browsers don't set exact mime
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb') throw new Error('Please upload a .glb file');
  }

  const path = `market/${marketId}/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  const { data, error } = await supabase.storage.from('animals').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;

  // Public URL (if bucket is public)
  const { data: pub } = supabase.storage.from('animals').getPublicUrl(path);
  return { path, publicUrl: pub.publicUrl };
}

export async function uploadThumbnail(file: File, marketId: string) {
  const path = `market/${marketId}/thumb_${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  const { data, error } = await supabase.storage.from('animals').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from('animals').getPublicUrl(path);
  return { path, publicUrl: pub.publicUrl };
}
