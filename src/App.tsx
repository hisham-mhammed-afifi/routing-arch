import { useState, useRef, useEffect, useCallback } from 'react';
import { docs } from './docs';
import Sidebar from './components/Sidebar';
import DocViewer from './components/DocViewer';
import './App.css';

function getSlugFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const match = docs.find((d) => d.slug === hash);
  return match ? match.slug : docs[0].slug;
}

export default function App() {
  const [activeSlug, setActiveSlug] = useState(getSlugFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const navigate = useCallback((slug: string) => {
    window.location.hash = slug;
  }, []);

  // Sync state from hash changes (back/forward, manual URL edits)
  useEffect(() => {
    const onHashChange = () => setActiveSlug(getSlugFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Set initial hash if none present
  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = docs[0].slug;
    }
  }, []);

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
        onSelect={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="content-area" ref={contentRef}>
        <DocViewer content={activeDoc.content} onNavigate={navigate} />
      </main>
    </div>
  );
}
