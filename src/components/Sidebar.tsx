import type { DocEntry } from '../docs';
import './Sidebar.css';

interface SidebarProps {
  docs: DocEntry[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ docs, activeSlug, onSelect, open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <nav className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">&#9670;</span>
          <span className="sidebar-title">Routing Architecture</span>
        </div>
        <ul className="sidebar-nav">
          {docs.map((doc) => {
            const num = doc.slug.split('-')[0];
            return (
              <li key={doc.slug}>
                <button
                  className={`sidebar-item${doc.slug === activeSlug ? ' active' : ''}`}
                  onClick={() => {
                    onSelect(doc.slug);
                    onClose();
                  }}
                >
                  <span className="sidebar-number">{num}</span>
                  {doc.title}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
