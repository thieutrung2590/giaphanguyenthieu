'use client';

import React, { useState } from 'react';
import DeletePhotoButton from './DeletePhotoButton';

interface PhotoCardProps {
  photo: any;
  secureUrl: string;
  isAdmin: boolean;
}

export default function PhotoCard({ photo, secureUrl, isAdmin }: PhotoCardProps) {
  // Trạng thái quản lý việc đóng/mở chế độ toàn màn hình
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <>
      {/* --- GIAO DIỆN HIỂN THỊ TRÊN LƯỚI --- */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow relative">
        <div 
          className="aspect-square relative overflow-hidden bg-gray-100 group cursor-pointer"
          onClick={() => setIsLightboxOpen(true)} // Mở Lightbox khi click vào ảnh
        >
          <img 
            src={secureUrl} 
            alt={photo.title || 'Ảnh kỷ niệm'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Nút xóa */}
          {isAdmin && (
            // Dùng e.stopPropagation() để khi bấm nút xóa không bị kích hoạt sự kiện mở ảnh
            <div onClick={(e) => e.stopPropagation()}>
              <DeletePhotoButton id={photo.id} url={photo.url} />
            </div>
          )}
        </div>
        
        <div className="p-3 text-center border-t border-gray-100">
          <p className="text-sm text-gray-700 font-medium truncate">
            {photo.title || 'Ảnh kỷ niệm'}
          </p>
          {photo.uploader_email && (
            <p className="text-xs text-gray-400 truncate mt-1">
              Đăng bởi: {photo.uploader_email}
            </p>
          )}
        </div>
      </div>

      {/* --- GIAO DIỆN LIGHTBOX (TOÀN MÀN HÌNH) --- */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)} // Bấm vào nền đen để đóng
        >
          {/* Nút X Tắt */}
          <button 
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-gray-300 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors z-[101]"
            onClick={() => setIsLightboxOpen(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Ảnh phóng to */}
          <img 
            src={secureUrl} 
            alt={photo.title || 'Ảnh phóng to'} 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Ngăn việc bấm vào chính bức ảnh làm đóng Lightbox
          />
        </div>
      )}
    </>
  );
}
