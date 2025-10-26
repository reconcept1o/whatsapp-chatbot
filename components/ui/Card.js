// components/ui/Card.js
import React from "react";

/**
 * İçerikleri sarmalamak için basit bir Card bileşeni (Tailwind ile)
 * @param {object} props
 * @param {React.ReactNode} props.children - Kartın içereceği HTML/React elemanları
 * @param {string} [props.className] - Ekstra CSS sınıfları eklemek için
 */
export function Card({ children, className = "" }) {
  const style = `bg-white p-6 shadow-md rounded-lg ${className}`;

  return <div className={style}>{children}</div>;
}
