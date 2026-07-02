import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/Button';
import { getCroppedImage, type Area } from './crop-image';

interface Props {
  imageSrc: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (data: { imageData: string; mimeType: string }) => void;
}

/** Modal para recortar (cuadrado, con zoom) la foto de perfil antes de subirla. */
export function AvatarCropModal({ imageSrc, saving, onCancel, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onComplete = useCallback((_area: Area, pixels: Area) => setAreaPixels(pixels), []);

  const handleSave = async () => {
    if (!areaPixels) return;
    setError(null);
    try {
      const cropped = await getCroppedImage(imageSrc, areaPixels);
      onSave(cropped);
    } catch {
      setError('No se pudo recortar la imagen. Probá con otra.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-base font-semibold text-ink">Recortá tu foto</h3>
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-zinc-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] text-ink-soft">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} loading={saving}>Guardar foto</Button>
        </div>
      </div>
    </div>
  );
}
