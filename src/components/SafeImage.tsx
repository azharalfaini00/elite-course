import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  eager?: boolean;
}

export function SafeImage({ src, alt, className = '', fallbackLabel, eager = false }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0D213F] via-[#15325C] to-[#0F766E] text-white/90 p-6 text-center ${className}`}
      >
        <BookOpen className="w-8 h-8 mb-2 text-[#F59E0B]" />
        <span className="text-xs font-medium tracking-wide text-white/85">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
