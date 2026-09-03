'use client';

import React, { useState } from 'react';
import DeletePhotoButton from './DeletePhotoButton';
import { X, ImageOff, ZoomIn } from 'lucide-react';

interface Photo {
  id: string;
  title?: string;
  url: string;
  uploader_email?: string;
}

interface PhotoCardProps {
  photo: Photo;
  secureUrl: string;
  isAdmin: boolean;
}

export default function PhotoCard({ photo, secureUrl, isAdmin }: PhotoCardProps) {
  // Trạng thái quản lý việc đóng/mở chế độ toàn màn hình
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {/* --- GIAO DIỆN HIỂN THỊ TRÊN LƯỚI --- */}
      <div className="border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs bg-white hover:shadow-md transition-all duration-300 relative group">
        <div 
          className="aspect-square relative overflow-hidden bg-stone-100 cursor-pointer"
          onClick={() => !hasError && setIsLightboxOpen(true)} // Mở Lightbox khi click vào ảnh
        >
          {!hasError ? (
            <>
              <img 
                src={secureUrl} 
                alt={photo.title || 'Ảnh kỷ niệm'} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={() => setHasError(true)}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="bg-white/90 backdrop-blur-xs text-stone-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <ZoomIn className="size-3" /> Xem ảnh
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-4 text-center">
              <ImageOff className="size-8 mb-1.5 opacity-60" />
              <span className="text-xs font-medium">Không thể tải ảnh</span>
            </div>
          )}
          
          {/* Nút xóa */}
          {isAdmin && (
            <div onClick={(e) => e.stopPropagation()}>
              <DeletePhotoButton id={photo.id} url={photo.url} />
            </div>
          )}
        </div>
        
        <div className="p-3 text-center border-t border-stone-100 bg-white">
          <p className="text-sm text-stone-700 font-semibold truncate" title={photo.title || 'Ảnh kỷ niệm'}>
            {photo.title || 'Ảnh kỷ niệm'}
          </p>
          {photo.uploader_email && (
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {photo.uploader_email}
            </p>
          )}
        </div>
      </div>

      {/* --- GIAO DIỆN LIGHTBOX (TOÀN MÀN HÌNH) --- */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)} // Bấm vào nền đen để đóng
        >
          {/* Nút X Tắt */}
          <button 
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-stone-300 bg-black/50 hover:bg-black/70 rounded-full p-2.5 transition-colors z-[101]"
            onClick={() => setIsLightboxOpen(false)}
            title="Đóng xem ảnh"
          >
            <X className="size-6" />
          </button>
          
          {/* Ảnh phóng to */}
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Ngăn việc bấm vào chính bức ảnh làm đóng Lightbox
          >
            <img 
              src={secureUrl} 
              alt={photo.title || 'Ảnh phóng to'} 
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            {photo.title && (
              <p className="text-white/85 text-sm mt-3 text-center px-4 font-medium">
                {photo.title}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
