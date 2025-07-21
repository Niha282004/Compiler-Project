import React from "react";

/**
 * Sample C code examples for the compiler analyzer
 */
const sampleCode = [
  {
    name: "Hello World",
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  {
    name: "Simple Variables",
    code: `#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    int sum = x + y;
    printf("Sum: %d\\n", sum);
    return 0;
}`,
  },
  {
    name: "If-Else Statement",
    code: `#include <stdio.h>

int main() {
    int number = 15;
    
    if (number > 10) {
        printf("Number is greater than 10\\n");
    } else {
        printf("Number is not greater than 10\\n");
    }
    
    return 0;
}`,
  },
  {
    name: "Simple Function",
    code: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    int result = add(5, 7);
    printf("Result: %d\\n", result);
    return 0;
}`,
  },
  {
    name: "Loop Example",
    code: `#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 5; i++) {
        printf("Iteration %d\\n", i);
    }
    return 0;
}`,
  },
  {
    name: "Syntax Error Example",
    code: `#include <stdio.h>

int main() {
    printf("This has a syntax error"
    return 0;
}`,
  },
  {
    name: "Semantic Error Example",
    code: `#include <stdio.h>

int main() {
    int x;
    printf("Value: %d\\n", y);  
    return 0;
}`,
  },
];

export default sampleCode;
