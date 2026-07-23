import React from 'react';
import { getSupabase } from '@/utils/supabase/queries';
import PhotoUpload from '@/components/PhotoUpload';

// Đặt thời gian revalidate để đảm bảo dữ liệu luôn được cập nhật
export const revalidate = 0;

export default async function PhotosPage() {
  // 1. Khởi tạo kết nối với Supabase
  const supabase = await getSupabase();
  
  // 2. Truy vấn danh sách ảnh từ bảng 'photos', sắp xếp mới nhất lên đầu
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
      
      {/* 3. Gọi Component tải ảnh lên mà bạn đã tạo */}
      <PhotoUpload />

      {/* Hiển thị thông báo lỗi nếu truy vấn dữ liệu thất bại */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          <p className="font-semibold">Không thể tải danh sách ảnh:</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* 4. Lưới hiển thị danh sách ảnh (CSS Grid với Tailwind) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {photos && photos.length > 0 ? (
          photos.map((photo) => (
            <div key={photo.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="aspect-square relative overflow-hidden bg-gray-100">
                {/* Sử dụng thẻ img chuẩn hoặc có thể thay bằng next/image nếu cấu hình domain */}
                <img 
                  src={photo.url} 
                  alt={photo.title || 'Ảnh kỷ niệm'} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              {photo.title && (
                <div className="p-3 text-sm text-gray-700 text-center truncate border-t border-gray-100">
                  {photo.title}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="font-medium">Chưa có bức ảnh nào</p>
            <p className="text-sm mt-1">Hãy sử dụng nút tải lên phía trên để thêm bức ảnh đầu tiên.</p>
          </div>
        )}
      </div>
    </div>
  );
}
