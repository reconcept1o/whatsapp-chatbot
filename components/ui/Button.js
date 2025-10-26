// components/ui/Button.js
"use client"; // Tıklama olayı (onClick) olduğu için istemci bileşeni olmalı

import React from "react";

/**
 * Yeniden kullanılabilir Button bileşeni (Tailwind ile stilize edildi)
 * @param {object} props
 * @param {React.ReactNode} props.children - Butonun içindeki metin veya ikon
 * @param {function} props.onClick - Tıklama olayı
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - Butonun HTML tipi
 * @param {'primary' | 'secondary'} [props.variant='primary'] - Butonun görünüm varyantı
 * @param {string} [props.className] - Ekstra CSS sınıfları eklemek için
 */
export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  ...props
}) {
  // Varyantlara göre stil belirleme
  const baseStyle =
    "flex justify-center rounded-md px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600",
    secondary: "bg-gray-600 hover:bg-gray-500 focus-visible:outline-gray-600",
    danger: "bg-red-600 hover:bg-red-500 focus-visible:outline-red-600",
  };

  const style = `${baseStyle} ${
    variants[variant] || variants.primary
  } ${className}`;

  return (
    <button type={type} onClick={onClick} className={style} {...props}>
      {children}
    </button>
  );
}
