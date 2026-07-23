'use server'

import { revalidatePath } from 'next/cache';
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries';
import { put } from '@vercel/blob';

export async function uploadPhotoAction(formData: FormData) {
  try {
    // 1. Phân quyền: Bắt buộc kiểm tra Admin ở server
    const isAdmin = await getIsAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Bạn không có quyền tải ảnh lên.' };
    }

    // Lấy file từ form
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'Không có dữ liệu ảnh.' };
    }

    // 2. Upload file lên Vercel Blob
    // Đặt tên file kèm thời gian để tránh trùng lặp tên
    const filename = `photos/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'public', // Cho phép ai cũng có thể xem ảnh
    });

    // 3. Lưu URL ảnh vào cơ sở dữ liệu Supabase
    const supabase = await getSupabase();
    
    // Lưu ý: Đảm bảo bạn đã chạy câu lệnh SQL tạo bảng 'photos' ở Bước 1
    const { error: dbError } = await supabase
      .from('photos')
      .insert([
        { 
          url: blob.url, 
          title: file.name 
        }
      ]);

    if (dbError) {
      console.error('Lỗi lưu Database:', dbError);
      return { success: false, error: 'Tải ảnh thành công nhưng không thể lưu vào cơ sở dữ liệu.' };
    }

    // 4. Làm mới giao diện để hiển thị ảnh mới ngay lập tức
    revalidatePath('/dashboard/photos');
    return { success: true };

  } catch (error) {
    console.error('Lỗi hệ thống khi tải ảnh:', error);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống trong quá trình tải ảnh.' };
  }
}
