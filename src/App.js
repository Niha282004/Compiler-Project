import React from "react";
import "./styles/App.css";
import CCompilerAnalyzer from "./components/CCompilerAnalyzer";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>C Code Analyzer</h1>
        <p>
          A tool for analyzing C code with lexical, syntax, and semantic
          analysis
        </p>
      </header>
      <main>
        <CCompilerAnalyzer />
      </main>
      <footer>
        <p>© 2025 C Code Analyzer</p>
      </footer>
    </div>
  );
}

export default App;
