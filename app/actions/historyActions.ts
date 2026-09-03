'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getIsAdmin } from "@/utils/supabase/queries";
import { put } from '@vercel/blob';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Lỗi hệ thống: Thiếu biến môi trường cấu hình Supabase.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
}

/**
 * Tải ảnh bài viết lên Vercel Blob và trả về URL công khai
 */
export async function uploadHistoryImageAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const isAdmin = await getIsAdmin();
    if (!isAdmin) {
      return { success: false, error: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên." };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: "Không tìm thấy dữ liệu ảnh." };
    }

    const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'image.jpg';
    const filename = `history/${Date.now()}-${safeName}`;

    // Upload lên Vercel Blob với quyền private (theo cấu hình kho lưu trữ)
    const blob = await put(filename, file, {
      access: 'private',
    });

    // Tạo đường dẫn proxy công khai an toàn để hiển thị ảnh
    const displayUrl = `/api/history-image?url=${encodeURIComponent(blob.url)}`;

    return { success: true, url: displayUrl };
  } catch (error) {
    console.error("Lỗi khi tải ảnh bài viết lên kho lưu trữ:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Đã xảy ra lỗi trong quá trình tải ảnh."
    };
  }
}

export async function addHistoryEntry(formData: FormData): Promise<void> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    throw new Error("Truy cập bị từ chối: Yêu cầu quyền Quản trị viên.");
  }

  const rawTitle = formData.get('title');
  const rawContent = formData.get('content');
  const rawDate = formData.get('event_date');

  if (!rawTitle || typeof rawTitle !== 'string' || rawTitle.trim() === '') {
    throw new Error("Lỗi xác thực: Tiêu đề không được để trống hoặc sai định dạng.");
  }
  
  if (!rawContent || typeof rawContent !== 'string' || rawContent.trim() === '') {
    throw new Error("Lỗi xác thực: Nội dung không được để trống hoặc sai định dạng.");
  }

  let eventDate: string | null = null;
  if (rawDate && typeof rawDate === 'string' && rawDate.trim() !== '') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
      eventDate = rawDate.trim();
    } else {
      throw new Error("Lỗi xác thực: Định dạng ngày không hợp lệ.");
    }
  }

  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('family_history')
    .insert([{ 
        title: rawTitle.trim(), 
        content: rawContent.trim(), 
        event_date: eventDate 
    }]);

  if (error) {
    throw new Error(`Lỗi cập nhật CSDL: ${error.message}`);
  }

  revalidatePath('/dashboard/history');
}

export async function updateHistoryEntry(id: string, formData: FormData): Promise<void> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    throw new Error("Truy cập bị từ chối: Yêu cầu quyền Quản trị viên.");
  }

  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error("Lỗi xác thực: ID bản ghi không hợp lệ.");
  }

  const rawTitle = formData.get('title');
  const rawContent = formData.get('content');
  const rawDate = formData.get('event_date');

  if (!rawTitle || typeof rawTitle !== 'string' || rawTitle.trim() === '') {
    throw new Error("Lỗi xác thực: Tiêu đề không được để trống hoặc sai định dạng.");
  }
  
  if (!rawContent || typeof rawContent !== 'string' || rawContent.trim() === '') {
    throw new Error("Lỗi xác thực: Nội dung không được để trống hoặc sai định dạng.");
  }

  let eventDate: string | null = null;
  if (rawDate && typeof rawDate === 'string' && rawDate.trim() !== '') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
      eventDate = rawDate.trim();
    } else {
      throw new Error("Lỗi xác thực: Định dạng ngày không hợp lệ.");
    }
  }

  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('family_history')
    .update({ 
        title: rawTitle.trim(), 
        content: rawContent.trim(), 
        event_date: eventDate 
    })
    .eq('id', id.trim());

  if (error) {
    throw new Error(`Lỗi cập nhật CSDL: ${error.message}`);
  }

  revalidatePath('/dashboard/history');
  revalidatePath(`/dashboard/history/${id.trim()}`);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    throw new Error("Truy cập bị từ chối: Yêu cầu quyền Quản trị viên.");
  }

  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error("Lỗi xác thực: ID bản ghi không hợp lệ.");
  }

  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('family_history')
    .delete()
    .eq('id', id.trim());

  if (error) {
    throw new Error(`Lỗi cập nhật CSDL: ${error.message}`);
  }

  revalidatePath('/dashboard/history');
}
