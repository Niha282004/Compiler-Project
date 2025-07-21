import React, { useState } from "react";
import "../styles/components/ASTVisualizer.css";

const ASTVisualizer = ({ ast }) => {
  const [expandedNodes, setExpandedNodes] = useState({});

  if (!ast) {
    return <div className="ast-container">No AST data available</div>;
  }

  const toggleNode = (nodeId) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Generate a unique ID for each node
  const getNodeId = (node, path = "") => {
    return `${path}_${node.type}_${JSON.stringify(node.location || {})}`;
  };

  // Recursively render AST node
  const renderNode = (node, depth = 0, path = "") => {
    if (!node || typeof node !== "object") return null;

    const nodeId = getNodeId(node, path);
    const isExpanded = expandedNodes[nodeId] !== false; // Default to expanded

    // Check if this is an AST node (has a type property)
    if (node.type) {
      // Calculate the padding based on depth
      const paddingLeft = `${depth * 20}px`;

      // Determine if node has children to expand/collapse
      const hasChildren = Object.keys(node).some((key) => {
        return (
          key !== "type" &&
          key !== "location" &&
          typeof node[key] === "object" &&
          node[key] !== null
        );
      });

      return (
        <div key={nodeId} className="ast-node" style={{ paddingLeft }}>
          <div
            className={`ast-node-header ${hasChildren ? "expandable" : ""}`}
            onClick={() => hasChildren && toggleNode(nodeId)}
          >
            {hasChildren && (
              <span className="expander">{isExpanded ? "▼" : "►"}</span>
            )}
            <span className="node-type">{node.type}</span>
            {renderNodePreview(node)}
          </div>

          {isExpanded && (
            <div className="ast-node-content">
              {/* Render child properties */}
              {Object.entries(node).map(([key, value]) => {
                // Skip type, location, and null values
                if (key === "type" || key === "location" || value === null) {
                  return null;
                }

                // Handle different property types
                if (Array.isArray(value)) {
                  return (
                    <div key={key} className="ast-property">
                      <div className="property-name">{key}: </div>
                      <div className="property-value array">
                        {value.length === 0 ? (
                          <span className="empty-array">[]</span>
                        ) : (
                          value.map((item, idx) =>
                            renderNode(item, depth + 1, `${path}_${key}_${idx}`)
                          )
                        )}
                      </div>
                    </div>
                  );
                } else if (typeof value === "object") {
                  return (
                    <div key={key} className="ast-property">
                      <div className="property-name">{key}: </div>
                      <div className="property-value">
                        {renderNode(value, depth + 1, `${path}_${key}`)}
                      </div>
                    </div>
                  );
                } else {
                  // Primitive values
                  return (
                    <div key={key} className="ast-property primitive">
                      <span className="property-name">{key}: </span>
                      <span className="property-value primitive">
                        {typeof value === "string"
                          ? `"${value}"`
                          : String(value)}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      );
    }

    // Render non-AST objects (like properties that are objects but not nodes)
    return (
      <div
        key={nodeId}
        className="ast-object"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {Object.entries(node).map(([key, value]) => {
          if (value === null) return null;

          if (Array.isArray(value)) {
            return (
              <div key={key} className="ast-property">
                <div className="property-name">{key}: </div>
                <div className="property-value array">
                  {value.map((item, idx) =>
                    renderNode(item, depth + 1, `${path}_${key}_${idx}`)
                  )}
                </div>
              </div>
            );
          } else if (typeof value === "object") {
            return (
              <div key={key} className="ast-property">
                <div className="property-name">{key}: </div>
                <div className="property-value">
                  {renderNode(value, depth + 1, `${path}_${key}`)}
                </div>
              </div>
            );
          } else {
            return (
              <div key={key} className="ast-property primitive">
                <span className="property-name">{key}: </span>
                <span className="property-value primitive">
                  {typeof value === "string" ? `"${value}"` : String(value)}
                </span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // Generate a preview of the node to display next to the type
  const renderNodePreview = (node) => {
    // Different preview formats based on node type
    switch (node.type) {
      case "Identifier":
        return <span className="node-preview">{node.name}</span>;
      case "Literal":
        return (
          <span className="node-preview">
            {typeof node.value === "string" ? `"${node.value}"` : node.value}
          </span>
        );
      case "BinaryExpression":
        return <span className="node-preview">{node.operator}</span>;
      case "VariableDeclaration":
        return <span className="node-preview">{node.type}</span>;
      case "FunctionDeclaration":
        return node.id && <span className="node-preview">{node.id.name}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="ast-container">
      <div className="ast-tree">{renderNode(ast)}</div>
    </div>
  );
};

export default ASTVisualizer;
