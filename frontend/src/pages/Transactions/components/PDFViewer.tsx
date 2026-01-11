import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Move } from 'lucide-react';

interface PDFViewerProps {
    pdfUrl: string;
    initialWidth?: number;
    onWidthChange?: (width: number) => void;
    className?: string;
}

export const PDFViewer = ({ pdfUrl, initialWidth = 500, onWidthChange, className = '' }: PDFViewerProps) => {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const [zoom, setZoom] = useState(100);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle Resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = Math.max(300, Math.min(1000, e.clientX));
            setWidth(newWidth);
            if (onWidthChange) onWidthChange(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto'; // Re-enable selection
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Prevent selection during drag
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onWidthChange]);

    const toggleZoom = (delta: number) => {
        setZoom(prev => Math.max(50, Math.min(200, prev + delta)));
    };

    return (
        <div
            ref={containerRef}
            className={`relative flex flex-col bg-slate-800 border-r border-slate-700 h-full transition-all ${className}`}
            style={{ width: `${width}px`, minWidth: '300px' }}
        >
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 text-slate-300">
                <span className="text-xs font-medium">DOCUMENT PREVIEW</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => toggleZoom(-10)} className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Zoom Out">
                        <ZoomOut size={16} />
                    </button>
                    <span className="text-xs w-10 text-center">{zoom}%</span>
                    <button onClick={() => toggleZoom(10)} className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Zoom In">
                        <ZoomIn size={16} />
                    </button>
                </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-slate-800 p-4 flex justify-center">
                <div
                    className="bg-white shadow-2xl transition-transform origin-top"
                    style={{
                        transform: `scale(${zoom / 100})`,
                        width: '100%',
                        height: '100%',
                        minHeight: '800px'
                    }}
                >
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-none"
                        title="PDF Preview"
                    />
                </div>
            </div>

            {/* Resize Handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors bg-slate-900 z-10 flex items-center justify-center group"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
            >
                <div className="h-8 w-1 rounded-full bg-slate-600 group-hover:bg-white" />
            </div>
        </div>
    );
};
