import React from 'react';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

export function MarkdownText({ content, className = '' }: MarkdownTextProps) {
  // Parse markdown and convert to React elements
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    paragraphs.forEach((paragraph, pIndex) => {
      // Check if it's a numbered list
      if (/^\d+\.\s/.test(paragraph.trim())) {
        const listItems = paragraph.split(/\n/).filter(line => line.trim());
        elements.push(
          <ol key={`ol-${pIndex}`} className="list-decimal list-inside space-y-1 my-2">
            {listItems.map((item, i) => (
              <li key={i} className="text-inherit">
                {parseInline(item.replace(/^\d+\.\s*/, ''))}
              </li>
            ))}
          </ol>
        );
      }
      // Check if it's a bullet list
      else if (/^[-*]\s/.test(paragraph.trim())) {
        const listItems = paragraph.split(/\n/).filter(line => line.trim());
        elements.push(
          <ul key={`ul-${pIndex}`} className="list-disc list-inside space-y-1 my-2">
            {listItems.map((item, i) => (
              <li key={i} className="text-inherit">
                {parseInline(item.replace(/^[-*]\s*/, ''))}
              </li>
            ))}
          </ul>
        );
      }
      // Regular paragraph
      else {
        const lines = paragraph.split(/\n/);
        elements.push(
          <p key={`p-${pIndex}`} className="my-1">
            {lines.map((line, lIndex) => (
              <React.Fragment key={lIndex}>
                {parseInline(line)}
                {lIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      }
    });
    
    return elements;
  };
  
  // Parse inline markdown (bold, italic, code)
  const parseInline = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    
    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/s) || remaining.match(/^(.*?)__(.+?)__/s);
      if (boldMatch) {
        if (boldMatch[1]) {
          elements.push(<span key={key++}>{parseInlineSimple(boldMatch[1])}</span>);
        }
        elements.push(<strong key={key++} className="font-semibold">{parseInlineSimple(boldMatch[2])}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }
      
      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/s) || remaining.match(/^(.*?)_(.+?)_/s);
      if (italicMatch && !italicMatch[1].endsWith('*')) {
        if (italicMatch[1]) {
          elements.push(<span key={key++}>{parseInlineSimple(italicMatch[1])}</span>);
        }
        elements.push(<em key={key++} className="italic">{parseInlineSimple(italicMatch[2])}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }
      
      // Inline code: `code`
      const codeMatch = remaining.match(/^(.*?)`(.+?)`/s);
      if (codeMatch) {
        if (codeMatch[1]) {
          elements.push(<span key={key++}>{codeMatch[1]}</span>);
        }
        elements.push(
          <code key={key++} className="bg-black/30 px-1.5 py-0.5 rounded text-sm font-mono">
            {codeMatch[2]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }
      
      // No more matches, add the rest as plain text
      elements.push(<span key={key++}>{remaining}</span>);
      break;
    }
    
    return elements;
  };
  
  // Simple inline parse for nested elements (no recursion to avoid infinite loops)
  const parseInlineSimple = (text: string): string => {
    return text;
  };
  
  return (
    <div className={`markdown-content ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
}
