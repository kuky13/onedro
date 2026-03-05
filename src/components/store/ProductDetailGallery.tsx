import React, { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface ProductDetailGalleryProps {
  media: MediaItem[];
  name: string;
  onClose: () => void;
}

// Fullscreen zoom viewer
const ZoomViewer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      lastDist.current = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    } else if (e.touches.length === 1) {
      const t = e.touches[0]!;
      lastTouch.current = { x: t.clientX, y: t.clientY };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current !== null) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const newScale = Math.min(5, Math.max(1, scale * (dist / lastDist.current)));
      setScale(newScale);
      lastDist.current = dist;
      if (newScale <= 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && lastTouch.current && scale > 1) {
      const t = e.touches[0]!;
      setTranslate(prev => ({ x: prev.x + (t.clientX - lastTouch.current!.x), y: prev.y + (t.clientY - lastTouch.current!.y) }));
      lastTouch.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = null;
    lastTouch.current = null;
    setIsDragging(false);
    if (scale <= 1.1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const newScale = Math.min(5, Math.max(1, scale - e.deltaY * 0.002));
    setScale(newScale);
    if (newScale <= 1) setTranslate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: "none" }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center"
      >
        <X className="h-5 w-5 text-white" />
      </button>
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs z-[110]">
        {scale > 1 ? "Toque duplo para resetar" : "Pinça para zoom · Toque duplo para ampliar"}
      </p>
      <img
        src={src}
        alt="Zoom"
        className="max-w-full max-h-full object-contain select-none"
        draggable={false}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      />
    </div>
  );
};

export const ProductDetailGallery: React.FC<ProductDetailGalleryProps> = ({
  media,
  name,
  onClose: _onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return; // ignore pinch
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]?.clientX ?? null);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    setTouchEnd(e.targetTouches[0]?.clientX ?? null);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && currentIndex < media.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goTo = useCallback(
    (dir: "prev" | "next") => {
      setCurrentIndex((prev) =>
        dir === "prev" ? Math.max(0, prev - 1) : Math.min(media.length - 1, prev + 1)
      );
    },
    [media.length]
  );

  const currentMedia = media[currentIndex];
  if (!currentMedia) return null;

  return (
    <>
      {zoomSrc && <ZoomViewer src={zoomSrc} onClose={() => setZoomSrc(null)} />}
      
      <div className="relative bg-black">
        {/* Main media area */}
        <div
          className="aspect-square relative overflow-hidden select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {currentMedia.type === "video" ? (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              className="w-full h-full object-contain bg-black"
              controls
              playsInline
              muted
            />
          ) : (
            <img
              src={currentMedia.url}
              alt={`${name} - ${currentIndex + 1}`}
              className="w-full h-full object-cover cursor-zoom-in"
              draggable={false}
              onClick={() => setZoomSrc(currentMedia.url)}
            />
          )}

          {/* Close button */}
          <DialogClose className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center transition-colors z-10">
            <X className="h-4 w-4 text-white" />
          </DialogClose>

          {/* Zoom hint for images */}
          {currentMedia.type === "image" && (
            <button
              onClick={() => setZoomSrc(currentMedia.url)}
              className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <ZoomIn className="h-4 w-4 text-white/80" />
            </button>
          )}

          {/* Arrow navigation (desktop) */}
          {media.length > 1 && currentIndex > 0 && (
            <button
              onClick={() => goTo("prev")}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm items-center justify-center transition-colors z-10 hidden sm:flex"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
          )}
          {media.length > 1 && currentIndex < media.length - 1 && (
            <button
              onClick={() => goTo("next")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm items-center justify-center transition-colors z-10 hidden sm:flex"
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
          )}

          {/* Counter badge */}
          {media.length > 1 && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full z-10">
              {currentIndex + 1} / {media.length}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {media.length > 1 && (
          <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide bg-black/80">
            {media.map((item, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 border-2",
                  index === currentIndex
                    ? "border-white/80 ring-1 ring-white/30"
                    : "border-transparent opacity-40 hover:opacity-70"
                )}
              >
                {item.type === "video" ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center relative">
                    <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
