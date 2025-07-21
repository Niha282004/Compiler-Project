import React, { useState, useEffect } from "react";
import "../styles/components/SymbolTable.css";

/**
 * Enhanced component to display the symbol table generated during semantic analysis
 * with improved handling of C code symbols
 * Built-in functions are now filtered out from the display
 */
const SymbolTable = ({ symbolTable, sourceCode }) => {
  const [activeScope, setActiveScope] = useState("all");
  const [showParams, setShowParams] = useState(false);
  const [processedSymbolTable, setProcessedSymbolTable] = useState({});

  // Debug output to help diagnose issues
  console.log("SymbolTable received props:", {
    symbolTableEntries: symbolTable ? Object.keys(symbolTable).length : 0,
    sourceCodeLength: sourceCode ? sourceCode.length : 0,
  });

  // Process symbol table when it changes
  useEffect(() => {
    let mergedSymbols = {};

    if (symbolTable && typeof symbolTable === "object") {
      // Process and merge semantic analyzer symbols, filtering out built-ins
      Object.entries(symbolTable).forEach(([key, value]) => {
        // Skip any built-in functions (they typically have "builtin." prefix)
        if (key.startsWith("builtin.") || value?.scope === "builtin") {
          return;
        }

        // Make sure this is a properly formed symbol entry
        if (value && typeof value === "object") {
          mergedSymbols[key] = {
            ...value,
            // Ensure required fields exist
            type: value.type || "unknown",
            scope: value.scope || "global",
            line: value.line || 0,
            initialized:
              value.initialized !== undefined ? value.initialized : true,
          };
        }
      });
    }

    // Extract symbols from source code if needed
    if (sourceCode) {
      const extractedSymbols = extractSymbolsFromCode(sourceCode);

      // Filter out any built-in functions from extracted symbols too
      const filteredSymbols = {};
      Object.entries(extractedSymbols).forEach(([key, value]) => {
        if (!key.startsWith("builtin.") && value.scope !== "builtin") {
          filteredSymbols[key] = value;
        }
      });

      // Merge with existing symbols, giving priority to already parsed symbols
      mergedSymbols = { ...filteredSymbols, ...mergedSymbols };
    }

    setProcessedSymbolTable(mergedSymbols);
  }, [symbolTable, sourceCode]);

  // If no symbol table data is available
  if (!processedSymbolTable || Object.keys(processedSymbolTable).length === 0) {
    return (
      <div className="symbol-table-container">
        <h3>Symbol Table</h3>
        <p className="no-data-message">
          No symbol table data available. Run semantic analysis to generate
          symbols.
        </p>
      </div>
    );
  }

  // Get unique scopes for the filter
  const scopes = [
    "all",
    ...new Set(Object.values(processedSymbolTable).map((item) => item.scope)),
  ];

  // Filter symbols based on selected scope
  const filteredSymbols =
    activeScope === "all"
      ? Object.entries(processedSymbolTable)
      : Object.entries(processedSymbolTable).filter(
          ([_, details]) => details.scope === activeScope
        );

  return (
    <div className="symbol-table-container">
      <h3>Symbol Table</h3>
      <div className="symbol-table-controls">
        <div className="scope-filter">
          <label>Filter by scope:</label>
          <select
            value={activeScope}
            onChange={(e) => setActiveScope(e.target.value)}
            className="scope-select"
          >
            {scopes.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </div>

        <div className="show-params">
          <label>
            <input
              type="checkbox"
              checked={showParams}
              onChange={() => setShowParams(!showParams)}
            />
            Show function parameters
          </label>
        </div>
      </div>

      <div className="symbol-table-wrapper">
        <table className="symbol-table">
          <thead>
            <tr>
              <th>Identifier</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Line</th>
              <th>Status</th>
              {showParams && <th>Parameters</th>}
            </tr>
          </thead>
          <tbody>
            {filteredSymbols.map(([identifier, details], index) => (
              <React.Fragment key={`${identifier}-${index}`}>
                <tr className={index % 2 === 0 ? "even-row" : "odd-row"}>
                  <td className="identifier">{identifier}</td>
                  <td className="type">{details.type}</td>
                  <td className="scope">{details.scope}</td>
                  <td className="line">{details.line}</td>
                  <td className="status">
                    <span
                      className={`status-badge ${
                        details.initialized ? "initialized" : "declared"
                      }`}
                    >
                      {details.initialized ? "Initialized" : "Declared Only"}
                    </span>
                  </td>
                  {showParams && (
                    <td className="params">
                      {details.params && details.params.length > 0 ? (
                        <details>
                          <summary>{details.params.length} parameters</summary>
                          <ul className="param-list">
                            {details.params.map((param, pIdx) => (
                              <li key={pIdx}>
                                <span className="param-type">{param.type}</span>{" "}
                                <span className="param-name">{param.name}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="symbol-table-stats">
        <p>Total symbols defined: {Object.keys(processedSymbolTable).length}</p>
        {activeScope !== "all" && (
          <p>
            Symbols in scope '{activeScope}': {filteredSymbols.length}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Extract symbols from C code using regex (fallback method)
 */
function extractSymbolsFromCode(sourceCode = "") {
  const extractedSymbols = {};

  if (!sourceCode) return extractedSymbols;

  try {
    // Extract function declarations
    const functionRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
    let functionMatch;

    while ((functionMatch = functionRegex.exec(sourceCode)) !== null) {
      const returnType = functionMatch[1];
      const functionName = functionMatch[2];
      const paramsStr = functionMatch[3].trim();

      // Parse parameters
      const params = paramsStr
        ? paramsStr
            .split(",")
            .map((param) => {
              const parts = param.trim().split(/\s+/);
              if (parts.length >= 2) {
                // Handle pointer types
                if (parts[0].endsWith("*")) {
                  return { type: parts[0], name: parts[1].replace("*", "") };
                }
                return { type: parts[0], name: parts[1] };
              }
              return null;
            })
            .filter(Boolean)
        : [];

      extractedSymbols[functionName] = {
        type: `${returnType} function`,
        scope: "global",
        line: getLineNumber(sourceCode, functionMatch.index),
        initialized: true,
        params: params,
      };
    }

    // Extract variable declarations - extended to catch more C types
    const variableRegex =
      /(int|float|double|char|void\*|size_t|long|short|unsigned|const\s+\w+|\w+\s*\*)\s+(\w+)(?:\s*=\s*([^;]+))?;/g;
    let variableMatch;

    while ((variableMatch = variableRegex.exec(sourceCode)) !== null) {
      const type = variableMatch[1];
      const name = variableMatch[2];
      const isInitialized = variableMatch[3] !== undefined;

      // Determine scope by checking if inside a function
      let scope = "global";
      const lines = sourceCode.substring(0, variableMatch.index).split("\n");
      let braceCount = 0;

      for (const line of lines) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
      }

      if (braceCount > 0) {
        // Find the nearest enclosing function
        const functionRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
        let lastFunction = null;
        let match;

        while (
          (match = functionRegex.exec(
            sourceCode.substring(0, variableMatch.index)
          )) !== null
        ) {
          lastFunction = match[2];
        }

        scope = lastFunction || "local";
      }

      extractedSymbols[name] = {
        type: type,
        scope: scope,
        line: getLineNumber(sourceCode, variableMatch.index),
        initialized: isInitialized,
      };
    }

    // Extract parameters from function declarations again to make sure we don't miss any
    // This is needed because parameters might be missed by the variable regex
    const funcParamRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)/g;
    let paramMatch;

    while ((paramMatch = funcParamRegex.exec(sourceCode)) !== null) {
      const params = paramMatch[3].trim();
      if (!params) continue;

      const paramParts = params.split(",");
      for (const param of paramParts) {
        const parts = param.trim().split(/\s+/);
        if (parts.length >= 2) {
          const paramType = parts[0];
          // Remove any leading/trailing special chars from param name
          const paramName = parts[1].replace(/[*&]/, "");

          if (!extractedSymbols[paramName]) {
            extractedSymbols[paramName] = {
              type: paramType,
              scope: paramMatch[2], // Function name as the scope
              line: getLineNumber(sourceCode, paramMatch.index),
              initialized: true, // Parameters are initialized by the caller
              isParameter: true,
            };
          }
        }
      }
    }

    // Extract enum declarations
    const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g;
    let enumMatch;

    while ((enumMatch = enumRegex.exec(sourceCode)) !== null) {
      const enumName = enumMatch[1];
      const enumValues = enumMatch[2].split(",").map((v) => v.trim());

      extractedSymbols[enumName] = {
        type: "enum",
        scope: "global",
        line: getLineNumber(sourceCode, enumMatch.index),
        initialized: true,
      };

      // Add enum values to symbol table
      enumValues.forEach((value, i) => {
        const valueName = value.split("=")[0].trim();
        if (valueName) {
          extractedSymbols[valueName] = {
            type: `enum ${enumName}`,
            scope: "global",
            line: getLineNumber(sourceCode, enumMatch.index),
            initialized: true,
          };
        }
      });
    }

    // Extract struct declarations
    const structRegex = /struct\s+(\w+)\s*{([^}]*)}/g;
    let structMatch;

    while ((structMatch = structRegex.exec(sourceCode)) !== null) {
      const structName = structMatch[1];

      extractedSymbols[structName] = {
        type: "struct",
        scope: "global",
        line: getLineNumber(sourceCode, structMatch.index),
        initialized: true,
      };
    }
  } catch (error) {
    console.error("Error extracting symbols:", error);
  }

  return extractedSymbols;
}

// Helper function to get line number from character index
function getLineNumber(text, index) {
  return text.substring(0, index).split("\n").length;
}

export default SymbolTable;
