// app/(admin)/flows/page.js
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/lib/supabaseClient";

// --- UPDATED IMPORT PATHS ---
// Import custom node components from the same directory
import EditableNode from "@/app/(admin)/flows/EditableNode";
import QuestionNode from "@/app/(admin)/flows/QuestionNode";
// --- END UPDATED IMPORT PATHS ---

const initialNodes = [];
const initialEdges = [];

let id = 0;
const getNodeId = () => `dndnode_${id++}`;

export default function FlowsPage() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}

function FlowBuilder() {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedIntent, setSelectedIntent] = useState("");
  const [availableIntents, setAvailableIntents] = useState([]);

  // Define custom node types using the imported components
  const nodeTypes = useMemo(
    () => ({
      editableNode: EditableNode,
      questionNode: QuestionNode,
    }),
    []
  );

  // --- 1. DATA LOADING ---
  useEffect(() => {
    async function fetchIntents() {
      setMessage("");
      const { data, error } = await supabase
        .from("intents")
        .select("intent_name");

      if (error) {
        console.error("Error fetching intents:", error);
        setMessage("Error: Could not load intents.");
        setLoading(false);
      } else if (data) {
        setAvailableIntents(data.map((i) => i.intent_name));
        if (data.length > 0) {
          if (!selectedIntent) {
            setSelectedIntent(data[0].intent_name);
          } else {
            setLoading(false);
          }
        } else {
          setMessage(
            'Please create at least one intent on the "Intents" page first.'
          );
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    fetchIntents();
  }, []); // Run only on initial mount

  useEffect(() => {
    async function loadFlow() {
      if (!selectedIntent) {
        setNodes([]);
        setEdges([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage("");
      console.log(`Loading flow for intent: ${selectedIntent}`);

      const { data, error } = await supabase
        .from("bot_flows")
        .select("flow_data")
        .eq("trigger_intent_name", selectedIntent)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = No rows found (expected if no flow saved yet)
        console.error("Error loading flow:", error);
        setMessage("Error: Could not load flow.");
        setNodes([]);
        setEdges([]);
      } else if (data && data.flow_data) {
        const flow = data.flow_data;
        // Sanitize node data to ensure 'title' and 'message'/'question' exist
        const sanitizedNodes = (flow.nodes || []).map((node) => ({
          ...node,
          data: {
            title:
              node.data?.title ||
              (node.type === "input"
                ? node.data?.label
                : node.type === "questionNode"
                ? "Soru Sor"
                : "Başlık Yok"),
            message:
              node.data?.message ||
              (node.type === "editableNode" ? node.data?.label : ""),
            question:
              node.data?.question ||
              (node.type === "questionNode" ? node.data?.label : ""),
            ...node.data, // Keep other data properties
          },
        }));
        setNodes(sanitizedNodes);
        setEdges(flow.edges || []);
        console.log("Flow loaded:", flow);
      } else {
        console.log(
          "No saved flow for this intent, creating default trigger node."
        );
        setNodes([
          {
            id: "1",
            type: "input", // This is a standard React Flow type, no custom component needed
            data: { label: `Trigger: "${selectedIntent}"` },
            position: { x: 250, y: 5 },
            draggable: false,
            selectable: false,
          },
        ]);
        setEdges([]);
      }
      setLoading(false);
    }
    loadFlow();
  }, [selectedIntent]); // Re-run when selectedIntent changes

  // --- 2. REACT FLOW EVENT HANDLERS ---
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // --- 3. DRAG & DROP ---
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (typeof type === "undefined" || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNodeData = {};
      let newNodeType = "default";

      if (type === "editableNode") {
        newNodeType = "editableNode";
        newNodeData = { title: "Send Message", message: "" }; // Default data
      } else if (type === "questionNode") {
        newNodeType = "questionNode";
        newNodeData = { title: "Ask Question", question: "" }; // Default data
      }
      // Add 'else if' for other node types here

      const newNode = {
        id: getNodeId(),
        type: newNodeType,
        position,
        data: newNodeData,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  // --- 4. SAVING ---
  const handleSaveFlow = async () => {
    if (!selectedIntent) {
      setMessage("Please select an Intent to save the flow for.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // Get tenant ID (crucial for saving data associated with the correct user)
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .single();
      if (tenantError || !tenantData)
        throw new Error("Could not find customer (tenant) information.");
      const tenantId = tenantData.id;

      // Prepare flow data (ensure input node data is just label)
      const nodesToSave = nodes.map((node) => {
        if (node.type === "input") {
          return {
            ...node,
            data: {
              label:
                node.data?.label ||
                node.data?.title ||
                `Trigger: ${selectedIntent}`,
            },
          };
        }
        // Ensure other nodes have both title and message/question
        return {
          ...node,
          data: {
            title:
              node.data?.title ||
              (node.type === "questionNode" ? "Ask Question" : "Send Message"),
            message: node.data?.message || "",
            question: node.data?.question || "",
            ...node.data,
          },
        };
      });
      const flowData = { nodes: nodesToSave, edges };

      const { error: upsertError } = await supabase.from("bot_flows").upsert(
        {
          tenant_id: tenantId,
          trigger_intent_name: selectedIntent,
          flow_data: flowData,
        },
        { onConflict: "tenant_id, trigger_intent_name" }
      ); // Upsert based on tenant and intent name

      if (upsertError) throw upsertError;

      setMessage(`Flow ("${selectedIntent}") saved successfully!`);
      console.log("Flow Saved (JSON):", JSON.stringify(flowData));
    } catch (error) {
      console.error("Error saving flow:", error);
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. DELETING ---
  const onNodesDelete = useCallback(
    (deletedNodes) => {
      const isTriggerDeleted = deletedNodes.some(
        (node) => node.type === "input"
      );
      if (isTriggerDeleted) {
        console.warn("Trigger node cannot be deleted.");
        setMessage("Warning: The trigger node cannot be deleted.");
        // To actually prevent deletion, you might need more complex state management
        // For now, we just warn the user.
      }
    },
    [] // No dependencies needed for this basic check
  );

  // --- Sidebar Drag Start ---
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // --- 6. RENDER ---
  return (
    <div className="w-full h-[85vh] flex flex-col">
      {/* Top Control Panel */}
      <div className="flex justify-between items-center mb-4 px-4 py-2 bg-white shadow-sm rounded-t-lg border-b">
        <div className="flex items-center gap-4">
          <label
            htmlFor="intent-select"
            className="text-sm font-medium text-gray-700"
          >
            Intent to Edit:
          </label>
          <select
            id="intent-select"
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            disabled={loading || availableIntents.length === 0}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
          >
            <option value="" disabled>
              {availableIntents.length === 0
                ? "Create an Intent first"
                : "-- Select Intent --"}
            </option>
            {availableIntents.map((intent) => (
              <option key={intent} value={intent}>
                {intent}
              </option>
            ))}
          </select>
          {loading && selectedIntent && (
            <span className="text-sm text-gray-500">Loading...</span>
          )}
        </div>
        <button
          onClick={handleSaveFlow}
          disabled={loading || !selectedIntent}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          {loading
            ? "Saving..."
            : `Save Flow (${selectedIntent || "No Intent"})`}
        </button>
      </div>
      {message && (
        <div className="text-center text-sm py-1 px-4 text-gray-700">
          {message}
        </div>
      )}

      {/* Main Flow Area */}
      <div className="flex-grow flex border rounded-b-lg overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-60 p-4 border-r bg-gray-50 flex-shrink-0">
          <h3 className="text-md font-semibold mb-2">Add New Node</h3>
          <p className="text-xs text-gray-500 mb-4">
            Drag and drop onto the canvas.
          </p>
          <div
            className="p-3 border rounded bg-white cursor-grab mb-2 text-center text-sm hover:shadow-md"
            onDragStart={(event) => onDragStart(event, "editableNode")}
            draggable
          >
            Send Message
          </div>
          <div
            className="p-3 border rounded bg-blue-50 cursor-grab mb-2 text-center text-sm hover:shadow-md"
            onDragStart={(event) => onDragStart(event, "questionNode")}
            draggable
          >
            Ask Question
          </div>
          {/* Add other node types for dragging here */}
        </aside>

        {/* Right Canvas */}
        <div
          className="flex-grow h-full"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes} // Pass custom node types
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
