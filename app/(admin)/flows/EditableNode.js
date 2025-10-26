// components/flow/EditableNode.js
"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
// 1. YENİ: Otomatik boyutlanan textarea kütüphanesini import et
import TextareaAutosize from "react-textarea-autosize";

// Stil objeleri (Değişiklik yok)
const nodeStyle = {
  /* ... */
};
const inputStyle = {
  /* ... */
};
// Textarea stili artık kütüphane tarafından yönetilecek, buradaki bazı stiller gereksiz olabilir
const textareaStyle = {
  width: "100%",
  padding: "4px",
  border: "1px solid #ccc",
  borderRadius: "3px",
  marginTop: "5px",
  fontFamily: "inherit",
  fontSize: "inherit",
  // resize: 'vertical', // Kütüphane kendi boyutunu ayarlar, bu gereksiz
  overflow: "hidden", // Kaydırma çubuklarını gizle (kütüphane kendi ayarlar)
  boxSizing: "border-box", // Padding'in boyutu etkilemesini sağla
};

function EditableNode({ id, data }) {
  const { setNodes } = useReactFlow();
  const [currentTitle, setCurrentTitle] = useState(
    data.title || "Başlık Girin"
  );
  const [currentMessage, setCurrentMessage] = useState(data.message || "");

  // ... (onChange, onBlur, useEffect handler'ları aynı) ...
  const onTitleChange = useCallback((evt) => {
    setCurrentTitle(evt.target.value);
  }, []);
  const onMessageChange = useCallback((evt) => {
    setCurrentMessage(evt.target.value);
  }, []);
  const onBlur = useCallback(() => {
    /* ... */
  }, [id, currentTitle, currentMessage, setNodes]);
  useEffect(() => {
    /* ... */
  }, [data.title, data.message]);

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Top} id="a" />
      <div>
        <input
          style={inputStyle}
          value={currentTitle}
          onChange={onTitleChange}
          onBlur={onBlur}
          className="nodrag"
        />
        {/* 2. YENİ: Standart textarea yerine TextareaAutosize kullan */}
        <TextareaAutosize
          style={textareaStyle}
          minRows={2} // Minimum satır sayısı
          maxRows={10} // Maksimum satır sayısı (opsiyonel)
          value={currentMessage}
          onChange={onMessageChange}
          onBlur={onBlur}
          className="nodrag"
          placeholder="Gönderilecek mesajı buraya yazın..."
        />
      </div>
      <Handle type="source" position={Position.Bottom} id="b" />
    </div>
  );
}

export default EditableNode;
