'use client';

import React, { useState } from 'react';
import { deletePhotoAction } from '@/app/actions/photo';

interface DeletePhotoButtonProps {
  id: string;
  url: string;
}

export default function DeletePhotoButton({ id, url }: DeletePhotoButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    // Hiển thị hộp thoại xác nhận để tránh bấm nhầm
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa bức ảnh này không? Hành động này không thể hoàn tác.');
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const result = await deletePhotoAction(id, url);
      if (!result.success) {
        alert('Lỗi: ' + result.error);
      }
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      alert('Đã xảy ra lỗi trong quá trình xóa ảnh.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`absolute top-2 right-2 p-1.5 rounded-md bg-white/80 text-red-600 hover:bg-red-600 hover:text-white backdrop-blur-sm transition-colors shadow-sm ${
        isDeleting ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title="Xóa ảnh"
    >
      {isDeleting ? (
        // Icon loading đang xoay
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        // Icon thùng rác
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  );
}
