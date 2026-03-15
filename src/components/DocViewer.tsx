import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import './DocViewer.css';

interface DocViewerProps {
  content: string;
}

const SVG_REGEX = /<svg[\s\S]*?<\/svg>/gi;

export default function DocViewer({ content }: DocViewerProps) {
  const { cleaned, svgMap } = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    const text = content.replace(SVG_REGEX, (match) => {
      const placeholder = `<!--SVG_PLACEHOLDER_${i}-->`;
      map.set(placeholder, match);
      i++;
      return `\n\n<div data-svg="${placeholder}"></div>\n\n`;
    });
    return { cleaned: text, svgMap: map };
  }, [content]);

  return (
    <article className="doc-viewer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeHighlight, { ignoreMissing: true }]]}
        components={{
          div(props) {
            const svgKey = (props as Record<string, unknown>)['data-svg'] as string | undefined;
            if (svgKey && svgMap.has(svgKey)) {
              return (
                <div
                  className="svg-diagram"
                  dangerouslySetInnerHTML={{ __html: svgMap.get(svgKey)! }}
                />
              );
            }
            return <div {...props} />;
          },
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </article>
  );
}
