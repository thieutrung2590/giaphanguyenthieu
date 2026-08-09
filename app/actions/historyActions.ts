'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getIsAdmin } from "@/utils/supabase/queries"; // <-- Dùng hàm của bạn

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

export async function addHistoryEntry(formData: FormData): Promise<void> {
  // GỌI HÀM CỦA BẠN ĐỂ CHECK QUYỀN
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

  revalidatePath('/history');
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  // GỌI HÀM CỦA BẠN ĐỂ CHECK QUYỀN
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

  revalidatePath('/history');
}
