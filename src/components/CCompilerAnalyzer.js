import React, { useState, useEffect } from "react";
import CodeInput from "./CodeInput";
import SyntaxHighlighter from "./SyntaxHighlighter";
import TokenList from "./TokenList";
import TokenStatistics from "./TokenStatistics";
import Legend from "./Legend";
import ASTVisualizer from "./ASTVisualizer";
import SyntaxErrors from "./SyntaxErrors";
import SemanticAnalyzer from "./SemanticAnalyzer";
import SymbolTable from "./SymbolTable";
import SemanticErrors from "./SemanticErrors";
import CodeGenerator from "./CodeGenerator";
import { lexer } from "../utils/lexer";
import { parser } from "../utils/parser";
import { semanticAnalyzer } from "../utils/semanticAnalyzer";
import { codeGenerator } from "../utils/codeGenerator";
import "../styles/components/CCompilerAnalyzer.css";

const CCompilerAnalyzer = () => {
  const [code, setCode] = useState("");
  const [tokens, setTokens] = useState([]);
  const [ast, setAst] = useState(null);
  const [syntaxErrors, setSyntaxErrors] = useState([]);
  const [symbolTable, setSymbolTable] = useState({});
  const [semanticErrors, setSemanticErrors] = useState([]);
  const [codeGenResult, setCodeGenResult] = useState(null);
  const [activeTab, setActiveTab] = useState("lexical");

  // Enhanced state for tracking analysis status
  const [analysisState, setAnalysisState] = useState({
    lexical: false,
    syntax: false,
    semantic: false,
    codegen: false,
  });

  // Phase 1: Lexical Analysis (automatic)
  useEffect(() => {
    if (code) {
      try {
        const newTokens = lexer(code);
        setTokens(newTokens);
        setAnalysisState((prev) => ({ ...prev, lexical: true }));

        // Reset subsequent analyses when code changes
        setAst(null);
        setSyntaxErrors([]);
        setSymbolTable({});
        setSemanticErrors([]);
        setCodeGenResult(null);
        setAnalysisState((prev) => ({
          ...prev,
          syntax: false,
          semantic: false,
          codegen: false,
        }));
      } catch (error) {
        console.error("Lexer error:", error);
        setTokens([]);
        setAnalysisState((prev) => ({ ...prev, lexical: false }));
      }
    } else {
      setTokens([]);
      setAnalysisState((prev) => ({ ...prev, lexical: false }));
    }
  }, [code]);

  // Phase 2: Syntax Analysis
  const runSyntaxAnalysis = () => {
    if (tokens.length === 0) return;

    try {
      const { ast: newAst, errors } = parser(tokens);
      setAst(newAst);
      setSyntaxErrors(errors);
      setAnalysisState((prev) => ({ ...prev, syntax: true }));

      // Reset subsequent analyses
      setSymbolTable({});
      setSemanticErrors([]);
      setCodeGenResult(null);
      setAnalysisState((prev) => ({
        ...prev,
        semantic: false,
        codegen: false,
      }));

      // Automatically switch to syntax tab if no errors
      if (errors.length === 0) {
        setActiveTab("syntax");
      }
    } catch (error) {
      console.error("Parser error:", error);
      setAst(null);
      setSyntaxErrors([{ message: error.message, location: "unknown" }]);
      setAnalysisState((prev) => ({ ...prev, syntax: false }));
    }
  };

  // Phase 3: Semantic Analysis
  const runSemanticAnalysis = () => {
    if (!ast) return;

    try {
      const { symbolTable: newSymbolTable, errors } = semanticAnalyzer(
        ast,
        code
      );
      setSymbolTable(newSymbolTable);
      setSemanticErrors(errors);
      setAnalysisState((prev) => ({ ...prev, semantic: true }));

      // Reset code generation
      setCodeGenResult(null);
      setAnalysisState((prev) => ({ ...prev, codegen: false }));

      // Automatically switch to semantic tab if no errors
      if (errors.length === 0) {
        setActiveTab("semantic");
      }
    } catch (error) {
      console.error("Semantic analyzer error:", error);
      setSymbolTable({});
      setSemanticErrors([{ message: error.message, location: "unknown" }]);
      setAnalysisState((prev) => ({ ...prev, semantic: false }));
    }
  };

  // Phase 4: Code Generation
  const runCodeGeneration = () => {
    if (!ast || semanticErrors.length > 0) return;

    try {
      const result = codeGenerator(ast, symbolTable);
      setCodeGenResult(result);
      setAnalysisState((prev) => ({ ...prev, codegen: true }));

      // Automatically switch to codegen tab if no errors
      if (!result.errors || result.errors.length === 0) {
        setActiveTab("codegen");
      }
    } catch (error) {
      console.error("Code generator error:", error);
      setCodeGenResult({
        intermediateCode: "",
        optimizedCode: "",
        assemblyCode: "",
        stringLiterals: {},
        statistics: {},
        errors: [{ message: error.message, type: "codegen" }],
      });
      setAnalysisState((prev) => ({ ...prev, codegen: false }));
    }
  };

  // Determine if we can proceed to the next phase
  const canRunSyntaxAnalysis = tokens.length > 0;
  const canRunSemanticAnalysis = ast && syntaxErrors.length === 0;
  const canRunCodeGeneration =
    ast &&
    syntaxErrors.length === 0 &&
    semanticErrors.length === 0 &&
    analysisState.semantic;

  return (
    <div className="container">
      <div className="code-area">
        <CodeInput code={code} setCode={setCode} />
        <div className="analysis-controls">
          <button
            className={`analyze-btn ${analysisState.lexical ? "complete" : ""}`}
            disabled={!canRunSyntaxAnalysis}
            onClick={runSyntaxAnalysis}
            title={
              !canRunSyntaxAnalysis
                ? "Enter code to enable syntax analysis"
                : ""
            }
          >
            <span className="btn-icon">🔍</span>
            Run Syntax Analysis
            {analysisState.syntax && <span className="checkmark">✓</span>}
          </button>

          <button
            className={`analyze-btn ${
              analysisState.semantic ? "complete" : ""
            }`}
            disabled={!canRunSemanticAnalysis}
            onClick={runSemanticAnalysis}
            title={
              !canRunSemanticAnalysis ? "Complete syntax analysis first" : ""
            }
          >
            <span className="btn-icon">🧠</span>
            Run Semantic Analysis
            {analysisState.semantic && <span className="checkmark">✓</span>}
          </button>

          <button
            className={`analyze-btn ${analysisState.codegen ? "complete" : ""}`}
            disabled={!canRunCodeGeneration}
            onClick={runCodeGeneration}
            title={
              !canRunCodeGeneration ? "Complete semantic analysis first" : ""
            }
          >
            <span className="btn-icon">⚙️</span>
            Generate Code
            {analysisState.codegen && <span className="checkmark">✓</span>}
          </button>
        </div>

        {/* Analysis Progress Indicator */}
        <div className="analysis-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  (Object.values(analysisState).filter(Boolean).length / 4) *
                  100
                }%`,
              }}
            />
          </div>
          <div className="progress-text">
            {Object.values(analysisState).filter(Boolean).length} of 4 phases
            completed
          </div>
        </div>
      </div>

      <div className="analysis-area">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "lexical" ? "active" : ""}`}
            onClick={() => setActiveTab("lexical")}
            disabled={!analysisState.lexical}
          >
            <span className="tab-icon">📝</span>
            Lexical Analysis
            {analysisState.lexical && <span className="tab-checkmark">✓</span>}
          </button>

          <button
            className={`tab ${activeTab === "syntax" ? "active" : ""}`}
            onClick={() => setActiveTab("syntax")}
            disabled={!ast}
          >
            <span className="tab-icon">🌲</span>
            Syntax Analysis
            {analysisState.syntax && <span className="tab-checkmark">✓</span>}
          </button>

          <button
            className={`tab ${activeTab === "semantic" ? "active" : ""}`}
            onClick={() => setActiveTab("semantic")}
            disabled={!analysisState.semantic}
          >
            <span className="tab-icon">🧠</span>
            Semantic Analysis
            {analysisState.semantic && <span className="tab-checkmark">✓</span>}
          </button>

          <button
            className={`tab ${activeTab === "codegen" ? "active" : ""}`}
            onClick={() => setActiveTab("codegen")}
            disabled={!analysisState.codegen}
          >
            <span className="tab-icon">⚙️</span>
            Code Generation
            {analysisState.codegen && <span className="tab-checkmark">✓</span>}
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "lexical" && (
            <>
              <h2>Syntax Highlighted Output</h2>
              <SyntaxHighlighter code={code} tokens={tokens} />
              <Legend />
              <TokenStatistics tokens={tokens} />
              <h2>Token List</h2>
              <TokenList tokens={tokens} />
            </>
          )}

          {activeTab === "syntax" && (
            <>
              <h2>Abstract Syntax Tree</h2>
              {syntaxErrors.length > 0 ? (
                <SyntaxErrors errors={syntaxErrors} code={code} />
              ) : (
                <ASTVisualizer ast={ast} />
              )}
            </>
          )}

          {activeTab === "semantic" && (
            <>
              <h2>Semantic Analysis</h2>
              {semanticErrors.length > 0 ? (
                <SemanticErrors errors={semanticErrors} code={code} />
              ) : (
                <>
                  <SemanticAnalyzer ast={ast} />
                  <h3>Symbol Table</h3>
                  <SymbolTable symbolTable={symbolTable} sourceCode={code} />
                </>
              )}
            </>
          )}

          {activeTab === "codegen" && (
            <>
              <h2>Code Generation</h2>
              <CodeGenerator codeGenResult={codeGenResult} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CCompilerAnalyzer;
