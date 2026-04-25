import { useMemo, useState } from "react";
import {
  getProfileInitial,
  sanitizeProfileAvatarSrc,
  sanitizeProfileText,
} from "../../lib/profile-security";

type SafeProfileAvatarProps = {
  src?: string | null;
  name?: string | null;
  accentColor?: string;
  containerStyle?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  fallbackStyle?: React.CSSProperties;
  fallback?: React.ReactNode;
};

export function SafeProfileAvatar({
  src,
  name,
  accentColor = "#FF6600",
  containerStyle,
  imageStyle,
  fallbackStyle,
  fallback,
}: SafeProfileAvatarProps) {
  const safeSrc = useMemo(() => sanitizeProfileAvatarSrc(src), [src]);
  const safeAlt = useMemo(
    () => sanitizeProfileText(name, 80) || "Avatar",
    [name]
  );
  const [imageFailed, setImageFailed] = useState(false);

  const showImage = !!safeSrc && !imageFailed;

  return (
    <div style={containerStyle}>
      {showImage ? (
        <img
          src={safeSrc}
          alt={safeAlt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setImageFailed(true)}
          style={imageStyle}
        />
      ) : fallback ? (
        fallback
      ) : (
        <span style={{ color: accentColor, ...fallbackStyle }}>
          {getProfileInitial(name)}
        </span>
      )}
    </div>
  );
}
