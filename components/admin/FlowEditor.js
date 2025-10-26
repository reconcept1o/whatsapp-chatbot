// components/admin/FlowEditor.js
"use client"; // React Flow kütüphanesi 'client-side' çalışır

import React from "react";

// TODO: Henüz kurmadık, ama kurunca böyle import edeceğiz:
// import ReactFlow, { Background, Controls } from 'react-flow-renderer';

export default function FlowEditor() {
  // TODO: Buraya 'react-flow-renderer' kütüphanesinin
  // nodes (düğümler), edges (bağlantılar) ve
  // onNodesChange, onEdgesChange gibi state'leri gelecek.

  return (
    <div
      style={{
        height: "70vh",
        border: "1px solid #ccc",
        background: "#f9f9f9",
      }}
    >
      <h2 className="p-4 text-xl font-bold">Akış Tasarımcısı Alanı</h2>
      <p className="p-4">
        (Buraya <code>npm install react-flow-renderer</code> kurduktan sonra
        React Flow bileşeni gelecek)
      </p>

      {/* <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      */}
    </div>
  );
}
