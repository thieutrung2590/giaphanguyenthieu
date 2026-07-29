'use client';

import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { uploadPhotoAction } from '@/app/actions/photo';

export default function PhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState(''); // State lưu mô tả ảnh

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Thiết lập nén: Tối đa 1MB, độ phân giải 1920px
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      // QUAN TRỌNG: Thêm tham số thứ 3 (file.name) để giữ lại tên gốc, chống lỗi chữ "blob"
      formData.append('file', compressedFile, file.name);
      
      // Gửi kèm đoạn mô tả người dùng vừa nhập
      formData.append('description', description);

      const result = await uploadPhotoAction(formData);
      
      if (result.success) {
        alert('Tải ảnh lên thành công!');
        setDescription(''); // Xóa trắng ô nhập sau khi tải xong
      } else {
        alert('Lỗi: ' + result.error);
      }
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
      alert('Đã xảy ra lỗi trong quá trình xử lý ảnh.');
    } finally {
      setIsUploading(false);
      // Reset lại input file để có thể chọn lại cùng một ảnh nếu cần
      event.target.value = '';
    }
  };

  return (
    <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
      
      {/* Ô nhập mô tả ảnh */}
      <input 
        type="text"
        placeholder="Nhập mô tả cho ảnh (không bắt buộc)..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-4 w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        disabled={isUploading}
      />

      <label className="cursor-pointer">
        <span className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium inline-block text-center">
          {isUploading ? 'Đang xử lý và tải lên...' : 'Chọn ảnh để tải lên'}
        </span>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageUpload} 
          disabled={isUploading}
        />
      </label>
      <p className="mt-3 text-sm text-gray-500">Nhập mô tả trước, sau đó bấm chọn ảnh. Ảnh sẽ tự động được nén.</p>
    </div>
  );
}
