// components/flow/QuestionNode.js
"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import TextareaAutosize from "react-textarea-autosize"; // Otomatik boyutlama için

// Stil objeleri (EditableNode'a benzer)
const nodeStyle = {
  padding: "10px 15px",
  border: "1px solid #1E90FF", // Farklı bir kenarlık rengi (mavi)
  borderRadius: "5px",
  background: "white",
  fontSize: "12px",
  minWidth: "200px",
};

const inputStyle = {
  // Başlık için
  width: "100%",
  padding: "4px",
  border: "1px solid #ccc",
  borderRadius: "3px",
  marginBottom: "5px",
  fontWeight: "bold",
};

const textareaStyle = {
  // Soru metni için
  width: "100%",
  padding: "4px",
  border: "1px solid #ccc",
  borderRadius: "3px",
  marginTop: "5px",
  fontFamily: "inherit",
  fontSize: "inherit",
  overflow: "hidden",
  boxSizing: "border-box",
};

// Soru Sor Düğümü Bileşeni
function QuestionNode({ id, data }) {
  const { setNodes } = useReactFlow();

  // State'ler: Biri başlık, diğeri soru metni için
  const [currentTitle, setCurrentTitle] = useState(data.title || "Soru Sor");
  const [currentQuestion, setCurrentQuestion] = useState(data.question || "");

  // --- Input Değişiklik Handler'ları ---
  const onTitleChange = useCallback((evt) => {
    setCurrentTitle(evt.target.value);
  }, []);
  const onQuestionChange = useCallback((evt) => {
    setCurrentQuestion(evt.target.value);
  }, []);

  // --- Odak Kaybı (Blur) Handler ---
  const onBlur = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Hem title hem de question'ı güncelle
          node.data = {
            ...node.data,
            title: currentTitle,
            question: currentQuestion,
          };
        }
        return node;
      })
    );
    console.log(
      `Node ${id} updated: Title=${currentTitle}, Question=${currentQuestion.substring(
        0,
        20
      )}...`
    );
  }, [id, currentTitle, currentQuestion, setNodes]);

  // --- Prop Değişikliği Handler ---
  useEffect(() => {
    setCurrentTitle(data.title || "Soru Sor");
    setCurrentQuestion(data.question || "");
  }, [data.title, data.question]);

  return (
    <div style={nodeStyle}>
      {/* Gelen Bağlantı Noktası */}
      <Handle type="target" position={Position.Top} id="a" />
      <div>
        {/* Başlık Input'u */}
        <input
          style={inputStyle}
          value={currentTitle}
          onChange={onTitleChange}
          onBlur={onBlur}
          className="nodrag"
        />
        {/* Soru Metni Textarea'sı */}
        <TextareaAutosize
          style={textareaStyle}
          minRows={2}
          value={currentQuestion}
          onChange={onQuestionChange}
          onBlur={onBlur}
          className="nodrag"
          placeholder="Kullanıcıya sorulacak soruyu buraya yazın..."
        />
      </div>
      {/* Giden Bağlantı Noktası (Cevaba göre dallanma için ileride kullanılabilir) */}
      <Handle type="source" position={Position.Bottom} id="b" />
    </div>
  );
}

export default QuestionNode;
