'use client';

import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { uploadPhotoAction } from '@/app/actions/photo';

export default function PhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Thiết lập nén: Tối đa 1MB, độ phân giải tối đa 1920px
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      formData.append('file', compressedFile);

      const result = await uploadPhotoAction(formData);
      
      if (result.success) {
        alert('Tải ảnh lên thành công!');
      } else {
        alert('Lỗi: ' + result.error);
      }
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
      alert('Đã xảy ra lỗi trong quá trình xử lý ảnh.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
      <label className="cursor-pointer">
        <span className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium inline-block">
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
      <p className="mt-3 text-sm text-gray-500">Ảnh sẽ được tự động nén để tiết kiệm dung lượng.</p>
    </div>
  );
}
