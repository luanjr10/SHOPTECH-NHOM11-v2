import { useState } from "react";

interface StoreLogoProps {
  name: string;
  logo?: string | null;
  size?: number;
  className?: string;
}

export function StoreLogo({ name, logo, size = 40, className = "" }: StoreLogoProps) {
  const [errored, setErrored] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "S";

  const style = { width: size, height: size };

  if (!logo || errored) {
    return (
      <div
        style={style}
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary500 font-sans font-bold text-white ${className}`}
      >
        <span style={{ fontSize: size * 0.42 }}>{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={name}
      loading="lazy"
      style={style}
      onError={() => setErrored(true)}
      className={`shrink-0 rounded-full border border-gray-100 object-cover ${className}`}
    />
  );
}
