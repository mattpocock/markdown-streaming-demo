"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Share2,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

const defaultMarkdown = `# Markdown Streaming Demo

This demo shows how **Markdown** is streamed token by token from LLMs.

## Features

- Real-time tokenization using \`tiktoken\`
- Progressive rendering with \`react-markdown\`
- Keyboard navigation (← →)
- URL sharing with compression

### Code Example

\`\`\`javascript
const tokens = encoder.encode(markdown);
console.log('Token count:', tokens.length);
\`\`\`

> Use the controls below or arrow keys to navigate through tokens!

1. **Step 1**: Paste your markdown
2. **Step 2**: Watch it stream
3. **Step 3**: Share the URL

---

*Happy streaming!* 🚀`;

export default function MarkdownStreamingDemo() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [tokens, setTokens] = useState<number[]>([]);
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [encoder] = useState<Tiktoken>(() => new Tiktoken(o200k_base));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100);

  // Load markdown from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const compressed = urlParams.get("md");
    if (compressed) {
      try {
        const decompressed = decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          setMarkdown(decompressed);
        }
      } catch (error) {
        console.error("Failed to decompress markdown from URL:", error);
      }
    }
  }, []);

  // Tokenize markdown when it changes
  useEffect(() => {
    if (markdown) {
      try {
        const newTokens = encoder.encode(markdown);
        setTokens(newTokens);
        setCurrentTokenIndex(0);
      } catch (error) {
        console.error("Failed to tokenize markdown:", error);
        setTokens([]);
      }
    }
  }, [encoder, markdown]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && currentTokenIndex < tokens.length) {
      const timer = setTimeout(() => {
        setCurrentTokenIndex((prev) => Math.min(prev + 1, tokens.length));
      }, playbackSpeed);
      return () => clearTimeout(timer);
    } else if (isPlaying && currentTokenIndex >= tokens.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentTokenIndex, tokens.length, playbackSpeed]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setCurrentTokenIndex((prev) => Math.max(0, prev - 1));
          setIsPlaying(false);
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentTokenIndex((prev) => Math.min(prev + 1, tokens.length));
          setIsPlaying(false);
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tokens.length]);

  // Get current markdown up to current token
  const getCurrentMarkdown = useCallback(() => {
    if (tokens.length === 0) return "";

    try {
      const currentTokens = tokens.slice(0, currentTokenIndex);
      return encoder.decode(currentTokens);
    } catch (error) {
      console.error("Failed to decode tokens:", error);
      return "";
    }
  }, [encoder, tokens, currentTokenIndex]);

  const handleShare = async () => {
    try {
      const compressed = compressToEncodedURIComponent(markdown);
      const url = new URL(window.location.href);
      url.searchParams.set("md", compressed);

      await navigator.clipboard.writeText(url.toString());
      alert("URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to share:", error);
      alert("Failed to copy URL");
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetToStart = () => {
    setCurrentTokenIndex(0);
    setIsPlaying(false);
  };

  const skipToEnd = () => {
    setCurrentTokenIndex(tokens.length);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Markdown Streaming Demo
          </h1>
          <p className="text-gray-600">
            See how Markdown is streamed token by token from LLMs
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Controls</span>
              <div className="flex gap-2">
                <Button onClick={handleShare} variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Button onClick={resetToStart} variant="outline" size="sm">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button onClick={togglePlayback} variant="outline" size="sm">
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button onClick={skipToEnd} variant="outline" size="sm">
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Speed:</label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value={50}>Fast (50ms)</option>
                  <option value={100}>Normal (100ms)</option>
                  <option value={200}>Slow (200ms)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Token {currentTokenIndex} / {tokens.length}
                </Badge>
                <Badge variant="outline">
                  {Math.round((currentTokenIndex / tokens.length) * 100) || 0}%
                </Badge>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                  style={{
                    width: `${(currentTokenIndex / tokens.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Use ← → arrow keys to navigate, spacebar to play/pause
            </p>
          </CardContent>
        </Card>

        {/* Input and Output */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Input Markdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Paste your Markdown here..."
                className="min-h-[400px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle>Streamed Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px] p-4 border rounded-lg bg-white overflow-auto">
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:text-blue-900 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-li:text-gray-700">
                  <ReactMarkdown
                    components={{
                      // Minimal error handling - let Tailwind Typography handle the styling
                      p: ({ children, ...props }) => {
                        try {
                          return <p {...props}>{children}</p>;
                        } catch (error) {
                          return (
                            <p className="text-red-500">
                              Error rendering paragraph
                            </p>
                          );
                        }
                      },
                      code: ({ children, ...props }) => {
                        try {
                          return <code {...props}>{children}</code>;
                        } catch (error) {
                          return (
                            <code className="text-red-500">
                              Error rendering code
                            </code>
                          );
                        }
                      },
                      pre: ({ children, ...props }) => {
                        try {
                          return <pre {...props}>{children}</pre>;
                        } catch (error) {
                          return (
                            <pre className="text-red-500">
                              Error rendering code block
                            </pre>
                          );
                        }
                      },
                      ul: ({ children, ...props }) => {
                        try {
                          return <ul {...props}>{children}</ul>;
                        } catch (error) {
                          return (
                            <ul className="text-red-500">
                              Error rendering unordered list
                            </ul>
                          );
                        }
                      },
                      ol: ({ children, ...props }) => {
                        try {
                          return <ol {...props}>{children}</ol>;
                        } catch (error) {
                          return (
                            <ol className="text-red-500">
                              Error rendering ordered list
                            </ol>
                          );
                        }
                      },
                      li: ({ children, ...props }) => {
                        try {
                          return <li {...props}>{children}</li>;
                        } catch (error) {
                          return (
                            <li className="text-red-500">
                              Error rendering list item
                            </li>
                          );
                        }
                      },
                    }}
                  >
                    {getCurrentMarkdown()}
                  </ReactMarkdown>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Token Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Token Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50 font-mono text-xs">
              {tokens.map((token, index) => {
                const isActive = index < currentTokenIndex;
                const tokenText = encoder.decode([token]) || "";
                const isNewline = tokenText.includes("\n");

                return (
                  <>
                    <span
                      key={index}
                      className={`inline-block px-1 py-0.5 border rounded cursor-pointer transition-colors ${
                        isActive
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setCurrentTokenIndex(index + 1);
                        setIsPlaying(false);
                      }}
                      title={`Token ${index}: "${tokenText}"`}
                    >
                      {tokenText.replace(/\t/g, "→").replace(/\n/g, "⤶") || "∅"}
                    </span>
                    {isNewline && (
                      <div
                        key={index}
                        className={`w-full h-4 ${
                          isActive ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setCurrentTokenIndex(index + 1);
                          setIsPlaying(false);
                        }}
                        title={`Token ${index}: "\\n"`}
                      />
                    )}
                  </>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing all {tokens.length} tokens. Click any token to jump to
              that position.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
