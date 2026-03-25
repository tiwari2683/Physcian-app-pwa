import React, { useCallback, useRef, useEffect, useState } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { X, ZoomIn, ZoomOut, ImageOff } from 'lucide-react';

interface ImageZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Fullscreen image viewer with pinch-to-zoom and drag-to-pan.
 * Uses react-quick-pinch-zoom for unified mouse+touch support —
 * works on Desktop (scroll-wheel + drag) AND iPad/iPhone (pinch + swipe).
 */
export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, onClose }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const pinchZoomRef = useRef<any>(null);
  const [imgError, setImgError] = useState(false);

  // Reset error state when a different image is opened
  useEffect(() => { setImgError(false); }, [imageUrl]);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── react-quick-pinch-zoom update callback ───────────────────────────────
  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    const img = imgRef.current;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty('transform', value);
    }
  }, []);

  // ── Center the image once it has loaded ──────────────────────────────────
  // react-quick-pinch-zoom initialises at (0,0) before it knows the image
  // dimensions, so we call alignCenter() after load to snap it to the middle.
  const handleImageLoad = useCallback(() => {
    if (pinchZoomRef.current?.alignCenter) {
      pinchZoomRef.current.alignCenter({ x: 0.5, y: 0.5 });
    }
  }, []);

  // ── Manual zoom buttons (scale from viewport center) ─────────────────────
  const zoom = (factor: number) => {
    const pz = pinchZoomRef.current;
    if (!pz) return;
    const container = pz.inner?.parentElement as HTMLElement | null;
    const cx = (container?.clientWidth  ?? window.innerWidth)  / 2;
    const cy = (container?.clientHeight ?? window.innerHeight) / 2;
    const nextScale = Math.min(Math.max((pz.getCurrentScale?.() ?? 1) + factor, 0.5), 5);
    pz.scaleTo?.({ x: cx, y: cy, scale: nextScale });
  };

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 flex-shrink-0">
        <span className="text-white/70 text-sm font-medium tracking-wide">
          {imgError ? 'Preview unavailable' : 'Pinch or scroll to zoom · Drag to pan'}
        </span>
        <div className="flex items-center gap-2">
          {!imgError && (
            <>
              <button onClick={() => zoom(-0.5)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Zoom out">
                <ZoomOut size={20} />
              </button>
              <button onClick={() => zoom(0.5)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Zoom in">
                <ZoomIn size={20} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-red-500/80 transition-colors ml-2"
            aria-label="Close image viewer"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* ── Zoom/Pan Canvas or Error State ──────────────────────── */}
      <div className="flex-1 overflow-hidden flex items-center justify-center">
        {imgError ? (
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <ImageOff size={36} className="text-white/40" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Preview Unavailable</p>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                This image was uploaded in a previous session and the<br />local preview has expired. Re-upload to view it here.
              </p>
            </div>
            <button onClick={onClose} className="mt-2 px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors">
              Close
            </button>
          </div>
        ) : (
          <QuickPinchZoom
            ref={pinchZoomRef}
            onUpdate={onUpdate}
            maxZoom={5}
            minZoom={0.5}
            tapZoomFactor={1}
            wheelScaleFactor={300}
            draggableUnZoomed={false}
            containerProps={{ style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Report"
              onLoad={handleImageLoad}
              onError={() => setImgError(true)}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                willChange: 'transform',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
              }}
            />
          </QuickPinchZoom>
        )}
      </div>

      {/* ── Tap-outside to close (backdrop) ─────────────────────── */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />
    </div>
  );
};
