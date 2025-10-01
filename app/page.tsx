import MarkdownRenderer from '@/components/MarkdownRenderer';
import React from 'react';
import '@/styles/markdown.css';

const ExampleComponent: React.FC = () => {
  const markdownContent = `
# Hello, Markdown!

This is a paragraph with some **bold** text and an \`inline code snippet\`.

## Code Example

Here's a block of code with syntax highlighting for TypeScript:

\`\`\`typescript
import React from 'react';

// Define the component props type
interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return <h1>Hello, {name}!</h1>;
};

export default Greeting;
\`\`\`

And here is some Python code:

\`\`\`python
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)

print(factorial(5))
\`\`\`
  `;

  return (
    <div>
      <MarkdownRenderer content={markdownContent} />
    </div>
  );
};

export default ExampleComponent;