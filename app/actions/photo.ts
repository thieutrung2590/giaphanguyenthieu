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
      access: 'private', // Cho phép ai cũng có thể xem ảnh
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
// Thêm hàm del từ @vercel/blob ở dòng import trên cùng của tệp
import { put, del } from '@vercel/blob'; 
// (Các import khác giữ nguyên)

// ... (code hàm uploadPhotoAction cũ)

// Hàm mới: Xóa ảnh
export async function deletePhotoAction(id: string, url: string) {
  try {
    // 1. Phân quyền: Chỉ Admin mới được xóa
    const isAdmin = await getIsAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Bạn không có quyền xóa ảnh này.' };
    }

    // 2. Xóa file khỏi Vercel Blob
    // Hàm del của Vercel Blob nhận trực tiếp đường dẫn URL gốc của file
    await del(url);

    // 3. Xóa bản ghi trong cơ sở dữ liệu Supabase
    const supabase = await getSupabase();
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Lỗi xóa Database:', dbError);
      return { success: false, error: 'Đã xóa file nhưng không thể xóa bản ghi trong CSDL.' };
    }

    // 4. Làm mới giao diện
    revalidatePath('/dashboard/photos');
    return { success: true };

  } catch (error) {
    console.error('Lỗi hệ thống khi xóa ảnh:', error);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống trong quá trình xóa ảnh.' };
  }
}
