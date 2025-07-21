import React from "react";
import "../styles/components/CodeInput.css";
import sampleCode from "../data/sampleCode";

const CodeInput = ({ code, setCode }) => {
  // Handle the code input changes
  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  // Load sample code examples
  const loadSample = (sampleIndex) => {
    if (sampleCode[sampleIndex]) {
      setCode(sampleCode[sampleIndex].code);
    }
  };

  return (
    <div className="code-input-container">
      <div className="code-input-header">
        <h2>C Code Input</h2>
        <div className="sample-selector">
          <label>Sample Code:</label>
          <select onChange={(e) => loadSample(e.target.value)}>
            <option value="">-- Select a sample --</option>
            {sampleCode.map((sample, index) => (
              <option key={index} value={index}>
                {sample.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        className="code-editor"
        value={code}
        onChange={handleCodeChange}
        placeholder="Enter C code here..."
        spellCheck="false"
      />
    </div>
  );
};

export default CodeInput;
