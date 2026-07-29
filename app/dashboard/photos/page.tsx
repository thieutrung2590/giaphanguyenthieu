import React from 'react';
import { getSupabase, getIsAdmin } from '@/utils/supabase/queries';
import PhotoUpload from '@/components/PhotoUpload';
import { generateSignedUrl } from '@/utils/signUrl';

// 1. Nhúng Component PhotoCard thay vì viết trực tiếp giao diện
import PhotoCard from '@/components/PhotoCard';

export const revalidate = 0;

export default async function PhotosPage() {
  const supabase = await getSupabase();
  const isAdmin = await getIsAdmin();
  
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Ảnh kỷ niệm</h1>
        <p className="text-gray-600 mt-2">Nơi lưu giữ những khoảnh khắc và hình ảnh đáng nhớ của dòng họ.</p>
      </div>
      
      <PhotoUpload />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          <p className="font-semibold">Không thể tải danh sách ảnh:</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {photos && photos.length > 0 ? (
          photos.map((photo) => {
            const secureUrl = generateSignedUrl(photo.url, 15);

            // 2. Truyền dữ liệu vào Component PhotoCard
            return (
              <PhotoCard 
                key={photo.id} 
                photo={photo} 
                secureUrl={secureUrl} 
                isAdmin={isAdmin} 
              />
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="font-medium">Chưa có bức ảnh nào</p>
            <p className="text-sm mt-1">Hãy sử dụng nút tải lên phía trên để thêm bức ảnh đầu tiên.</p>
          </div>
        )}
      </div>
    </div>
  );
}
