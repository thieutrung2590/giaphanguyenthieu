'use server'

import { revalidatePath } from 'next/cache';
import { getIsAdmin, getSupabase } from '@/utils/supabase/queries';
import { put, del } from '@vercel/blob';

// ------------------------------------------------------------------
// 1. HÀM TẢI ẢNH LÊN
// ------------------------------------------------------------------
export async function uploadPhotoAction(formData: FormData) {
  try {
    const supabase = await getSupabase();

    // Kiểm tra thông tin người dùng đang thao tác
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Bạn phải đăng nhập để tải ảnh lên.' };
    }

    // Phân quyền: Bắt buộc kiểm tra Admin ở server
    const isAdmin = await getIsAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Bạn không có quyền tải ảnh lên.' };
    }

    // Lấy file từ form
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'Không có dữ liệu ảnh.' };
    }

    // Lấy đoạn mô tả từ form
    const description = formData.get('description') as string;
    
    // Xử lý tiêu đề: Nếu có mô tả thì dùng mô tả, nếu không thì dùng tên file gốc
    const finalTitle = description && description.trim() !== '' ? description.trim() : file.name;

    // Upload file lên Vercel Blob (Quyền riêng tư)
    const filename = `photos/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'private', 
    });

    // Lưu URL ảnh và thông tin người đăng, kèm tiêu đề (mô tả) vào cơ sở dữ liệu Supabase
    const { error: dbError } = await supabase
      .from('photos')
      .insert([
        { 
          url: blob.url, 
          title: finalTitle, // Đã cập nhật để lưu mô tả
          uploader_id: user.id,
          uploader_email: user.email
        }
      ]);

    if (dbError) {
      console.error('Lỗi lưu Database:', dbError);
      return { success: false, error: 'Tải ảnh thành công nhưng không thể lưu vào cơ sở dữ liệu.' };
    }

    // Làm mới giao diện
    revalidatePath('/dashboard/photos');
    return { success: true };

  } catch (error) {
    console.error('Lỗi hệ thống khi tải ảnh:', error);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống trong quá trình tải ảnh.' };
  }
}

// ------------------------------------------------------------------
// 2. HÀM XÓA ẢNH
// ------------------------------------------------------------------
export async function deletePhotoAction(id: string, url: string) {
  try {
    // Phân quyền: Chỉ Admin mới được xóa
    const isAdmin = await getIsAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Bạn không có quyền xóa ảnh này.' };
    }

    // Xóa file khỏi Vercel Blob
    await del(url);

    // Xóa bản ghi trong cơ sở dữ liệu Supabase
    const supabase = await getSupabase();
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Lỗi xóa Database:', dbError);
      return { success: false, error: 'Đã xóa file nhưng không thể xóa bản ghi trong CSDL.' };
    }

    // Làm mới giao diện
    revalidatePath('/dashboard/photos');
    return { success: true };

  } catch (error) {
    console.error('Lỗi hệ thống khi xóa ảnh:', error);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống trong quá trình xóa ảnh.' };
  }
}
