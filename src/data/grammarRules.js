/**
 * C Grammar Rules for the Parser
 * This file defines the grammar rules used for parsing C code
 * Based on a simplified subset of the C language grammar
 */

const grammarRules = {
  // Program structure
  program: {
    name: "Program",
    description:
      "A C program consists of declarations and function definitions",
    rules: [{ name: "translation_unit", production: "external_declaration+" }],
    examples: ["int main() { return 0; }"],
  },

  externalDeclaration: {
    name: "External Declaration",
    description: "Top-level declarations and function definitions",
    rules: [
      {
        name: "external_declaration",
        production: "function_definition | declaration",
      },
    ],
    examples: ["int x;", "int main() { return 0; }"],
  },

  // Function definitions
  functionDefinition: {
    name: "Function Definition",
    description:
      "Definition of a function with its return type, parameters, and body",
    rules: [
      {
        name: "function_definition",
        production: "declaration_specifiers declarator compound_statement",
      },
    ],
    examples: ["int add(int a, int b) { return a + b; }"],
  },

  // Declarations
  declaration: {
    name: "Declaration",
    description: "Variable or function declaration",
    rules: [
      {
        name: "declaration",
        production: "declaration_specifiers init_declarator_list? ';'",
      },
    ],
    examples: ["int x;", "int x, y = 5;"],
  },

  declarationSpecifiers: {
    name: "Declaration Specifiers",
    description: "Type and storage class specifiers for declarations",
    rules: [
      {
        name: "declaration_specifiers",
        production:
          "(storage_class_specifier | type_specifier | type_qualifier)+",
      },
    ],
    examples: ["static const int"],
  },

  initDeclaratorList: {
    name: "Initialization Declarator List",
    description: "List of declarators with optional initializers",
    rules: [
      {
        name: "init_declarator_list",
        production: "init_declarator (',' init_declarator)*",
      },
    ],
    examples: ["x, y = 5, z[10]"],
  },

  initDeclarator: {
    name: "Initialization Declarator",
    description: "Declarator with optional initializer",
    rules: [
      { name: "init_declarator", production: "declarator ('=' initializer)?" },
    ],
    examples: ["x", "y = 5"],
  },

  // Types
  typeSpecifier: {
    name: "Type Specifier",
    description: "Specifies the type of a variable or function",
    rules: [
      {
        name: "type_specifier",
        production:
          "'void' | 'char' | 'short' | 'int' | 'long' | 'float' | 'double' | 'signed' | 'unsigned' | struct_or_union_specifier | enum_specifier | typedef_name",
      },
    ],
    examples: ["int", "struct Point"],
  },

  // Statements
  statement: {
    name: "Statement",
    description: "Individual C statement",
    rules: [
      {
        name: "statement",
        production:
          "labeled_statement | compound_statement | expression_statement | selection_statement | iteration_statement | jump_statement",
      },
    ],
    examples: ["x = 5;", "{ int y = 10; }"],
  },

  compoundStatement: {
    name: "Compound Statement",
    description: "Block of statements enclosed in braces",
    rules: [{ name: "compound_statement", production: "'{' block_item* '}'" }],
    examples: ['{ int x = 5; printf("%d", x); }'],
  },

  expressionStatement: {
    name: "Expression Statement",
    description: "Expression followed by a semicolon",
    rules: [{ name: "expression_statement", production: "expression? ';'" }],
    examples: ["x = 5;", ";"],
  },

  selectionStatement: {
    name: "Selection Statement",
    description: "If and switch statements",
    rules: [
      {
        name: "selection_statement",
        production: "'if' '(' expression ')' statement ('else' statement)?",
      },
      {
        name: "selection_statement",
        production: "'switch' '(' expression ')' statement",
      },
    ],
    examples: ["if (x > 0) y = 1;", "switch (x) { case 1: break; }"],
  },

  iterationStatement: {
    name: "Iteration Statement",
    description: "Loops: while, do-while, and for",
    rules: [
      {
        name: "iteration_statement",
        production: "'while' '(' expression ')' statement",
      },
      {
        name: "iteration_statement",
        production: "'do' statement 'while' '(' expression ')' ';'",
      },
      {
        name: "iteration_statement",
        production:
          "'for' '(' expression_statement expression_statement expression? ')' statement",
      },
      {
        name: "iteration_statement",
        production:
          "'for' '(' declaration expression_statement expression? ')' statement",
      },
    ],
    examples: ["while (x > 0) x--;", "for (int i = 0; i < 10; i++) sum += i;"],
  },

  jumpStatement: {
    name: "Jump Statement",
    description: "Statements that transfer control: return, break, continue",
    rules: [
      { name: "jump_statement", production: "'goto' IDENTIFIER ';'" },
      { name: "jump_statement", production: "'continue' ';'" },
      { name: "jump_statement", production: "'break' ';'" },
      { name: "jump_statement", production: "'return' expression? ';'" },
    ],
    examples: ["return 0;", "break;", "continue;"],
  },

  // Expressions
  expression: {
    name: "Expression",
    description: "Any C expression",
    rules: [
      {
        name: "expression",
        production: "assignment_expression (',' assignment_expression)*",
      },
    ],
    examples: ["x = 5", "x = 5, y = 10"],
  },

  assignmentExpression: {
    name: "Assignment Expression",
    description: "Expression with assignment",
    rules: [
      {
        name: "assignment_expression",
        production:
          "conditional_expression | unary_expression assignment_operator assignment_expression",
      },
    ],
    examples: ["x = 5", "x += 10"],
  },

  conditionalExpression: {
    name: "Conditional Expression",
    description: "Ternary conditional operator",
    rules: [
      {
        name: "conditional_expression",
        production:
          "logical_or_expression ('?' expression ':' conditional_expression)?",
      },
    ],
    examples: ["x > 0 ? 1 : -1"],
  },

  // Common error patterns
  commonErrors: {
    syntaxErrors: [
      { error: "Missing semicolon", example: "int x = 5" },
      { error: "Mismatched parentheses", example: "if (x > 0 {" },
      { error: "Missing closing brace", example: "void func() {" },
      { error: "Invalid statement", example: "5 + 3;" },
    ],
    semanticErrors: [
      { error: "Undeclared variable", example: "x = 5;" },
      { error: "Type mismatch", example: 'int x = "hello";' },
      { error: "Redeclaration of variable", example: "int x; int x;" },
      { error: "Invalid operation", example: "char c = 'A' / 0;" },
    ],
  },
};

export default grammarRules;
