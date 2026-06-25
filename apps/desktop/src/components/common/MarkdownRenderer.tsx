import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { open } from "@tauri-apps/plugin-shell";
import { Check, Copy } from "lucide-react";

interface Props {
  children: string;
  className?: string;
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === "string" ? children : String(children ?? "");
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group/code">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
        title="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <pre className={className}>
        {children}
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ children, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          a({ href, children: linkChildren, ...props }) {
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              if (href) {
                open(href);
              }
            };
            return (
              <a
                href={href}
                onClick={handleClick}
                target="_blank"
                rel="noopener noreferrer"
                style={{ cursor: "pointer" }}
                {...props}
              >
                {linkChildren}
              </a>
            );
          },
          pre({ children, ...props }) {
            // Extract className from child code element
            const codeChild = (children as any)?.props;
            return <CodeBlock className={codeChild?.className}>{codeChild?.children || children}</CodeBlock>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
