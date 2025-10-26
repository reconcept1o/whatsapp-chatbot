// components/ui/Input.js
"use client"; // Değer değişikliği (onChange) olduğu için istemci bileşeni

import React from "react";

/**
 * Yeniden kullanılabilir Input bileşeni (Tailwind ile stilize edildi)
 * @param {object} props
 * @param {string} props.id - Label ile input'u bağlamak için
 * @param {string} props.label - Input'un üstündeki etiket
 * @param {'text' | 'email' | 'password' | 'date'} [props.type='text'] - Input tipi
 * @param {string} props.value - Input'un değeri (kontrollü bileşen için)
 * @param {function} props.onChange - Değer değiştiğinde tetiklenen fonksiyon
 * @param {string} [props.className] - Ekstra CSS sınıfları eklemek için
 */
export function Input({
  id,
  label,
  type = "text",
  value,
  onChange,
  className = "",
  ...props
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {label}
      </label>
      <div className="mt-2">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          className={`block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
