'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';

interface HistoryContentRendererProps {
  content: string;
  className?: string;
}

interface ParsedBlock {
  type: 'text' | 'image';
  text?: string;
  url?: string;
  alt?: string;
}

/**
 * Tách nội dung thành các khối văn bản và hình ảnh (nhận diện cú pháp Markdown ![alt](url) và link ảnh)
 */
function parseContent(content: string): ParsedBlock[] {
  if (!content) return [];

  const blocks: ParsedBlock[] = [];
  // Regex khớp cú pháp markdown: ![alt text](https://url)
  const markdownImageRegex = /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;

  let lastIndex = 0;
  let match;

  while ((match = markdownImageRegex.exec(content)) !== null) {
    const matchIndex = match.index;

    // Đoạn text phía trước ảnh
    if (matchIndex > lastIndex) {
      const textChunk = content.substring(lastIndex, matchIndex);
      if (textChunk.trim() !== '') {
        blocks.push({ type: 'text', text: textChunk });
      }
    }

    // Khối ảnh
    const alt = match[1] || 'Hình ảnh tư liệu';
    const url = match[2];
    blocks.push({ type: 'image', alt, url });

    lastIndex = matchIndex + match[0].length;
  }

  // Đoạn text còn lại sau cùng
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim() !== '') {
      blocks.push({ type: 'text', text: remainingText });
    }
  }

  return blocks;
}

export default function HistoryContentRenderer({ content, className = '' }: HistoryContentRendererProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const blocks = parseContent(content);

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {blocks.map((block, idx) => {
          if (block.type === 'image' && block.url) {
            return (
              <figure key={idx} className="my-6">
                <div 
                  className="relative group cursor-pointer overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50 shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => setSelectedImage({ url: block.url!, alt: block.alt || 'Ảnh tư liệu' })}
                >
                  <img
                    src={block.url}
                    alt={block.alt || 'Ảnh tư liệu'}
                    className="w-full max-h-[550px] object-contain mx-auto rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                  
                  {/* Lớp phủ hover với biểu tượng phóng to */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="bg-white/90 backdrop-blur-sm text-stone-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <ZoomIn className="size-3.5" /> Phóng to ảnh
                    </span>
                  </div>
                </div>

                {block.alt && block.alt !== 'Hình ảnh' && block.alt !== 'ảnh' && (
                  <figcaption className="text-center text-xs sm:text-sm text-stone-500 mt-2 font-medium italic">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );
          }

          return (
            <div 
              key={idx} 
              className="text-stone-700 whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base font-normal"
            >
              {block.text}
            </div>
          );
        })}
      </div>

      {/* LIGHTBOX MODAL: Xem ảnh phóng to toàn màn hình */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-stone-300 bg-black/50 hover:bg-black/70 rounded-full p-2.5 transition-colors z-[101]"
            title="Đóng xem ảnh"
          >
            <X className="size-6" />
          </button>

          <div 
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            {selectedImage.alt && (
              <p className="text-white/80 text-sm mt-3 text-center px-4">
                {selectedImage.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
