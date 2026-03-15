import { useState, useRef, useEffect } from 'react';
import { docs } from './docs';
import Sidebar from './components/Sidebar';
import DocViewer from './components/DocViewer';
import './App.css';

export default function App() {
  const [activeSlug, setActiveSlug] = useState(docs[0].slug);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const activeDoc = docs.find((d) => d.slug === activeSlug)!;

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activeSlug]);

  return (
    <div className="app-layout">
      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        &#9776;
      </button>
      <Sidebar
        docs={docs}
        activeSlug={activeSlug}
        onSelect={setActiveSlug}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="content-area" ref={contentRef}>
        <DocViewer content={activeDoc.content} />
      </main>
    </div>
  );
}
