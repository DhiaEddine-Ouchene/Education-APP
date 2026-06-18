import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render through a portal into document.body so the fixed-position overlay is
  // always centered to the viewport, never trapped inside a transformed parent
  // (the dashboard container uses an animation that leaves a CSS transform,
  // which would otherwise offset this modal away from the screen center).
  return createPortal(
    <div className="modal-wrapper">
      {/* Backdrop overlay */}
      <div className="modal-overlay" onClick={onClose} />

      {/* Modal Box Container */}
      <div className="modal-container animate-scale">
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
