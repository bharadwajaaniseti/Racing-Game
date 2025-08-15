import React from 'react';
import { ModelViewer2 as ModelViewer } from './ModelViewer2';

type PreviewProps = {
  modelUrl?: string;
  scale?: number;
  rotation?: number;
};

export default function AnimalModelPreview({
  modelUrl,
  scale = 1,
  rotation = 0,
}: PreviewProps) {
  return (
    <div className="space-y-4">
      <ModelViewer 
        modelUrl={modelUrl}
        scale={scale}
        rotation={rotation}
        className="h-[400px]"
      />
    </div>
  );
}
