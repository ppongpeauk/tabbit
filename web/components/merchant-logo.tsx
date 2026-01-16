"use client";

import { useState } from "react";
import { Image } from "expo-image";

interface MerchantLogoProps {
  logo: string;
  alt?: string;
  className?: string;
}

export function MerchantLogo({
  logo,
  alt = "Merchant logo",
  className,
}: MerchantLogoProps) {
  const [error, setError] = useState(false);

  if (error || !logo) {
    return null;
  }

  return (
    <div className="mb-4 flex justify-center">
      <img
        src={logo}
        alt={alt}
        className={
          className || "h-20 w-20 rounded-xl bg-black/5 object-contain"
        }
        onError={() => setError(true)}
      />
    </div>
  );
}
