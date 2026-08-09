'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getSupabase } from "@/utils/supabase/queries";

// ============================================================================
// 1. KHỞI TẠO AN TOÀN ADMIN CLIENT
// ============================================================================
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

// ============================================================================
// 2. HÀM KIỂM TRA QUYỀN ADMIN (Bảo mật RLS Bypass)
// ============================================================================
async function checkIsAdmin(): Promise<boolean> {
  try {
    // LƯU Ý QUAN TRỌNG: 
    // Hàm getSupabase() của bạn bắt buộc phải dùng createServerClient (từ @supabase/ssr)
    // và đọc cookies() từ 'next/headers' thì hàm getUser() dưới đây mới lấy được session thực tế.
    const supabase = await getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Nếu chưa đăng nhập hoặc không lấy được email, tự động từ chối
    if (error || !user || !user.email) return false;

    // KIỂM TRA QUA EMAIL (Sanitize: Cắt khoảng trắng & Đưa về chữ thường)
    const envAdminEmail = process.env.ADMIN_EMAIL;
    if (envAdminEmail) {
        const adminEmailSanitized = envAdminEmail.trim().toLowerCase();
        const userEmailSanitized = user.email.trim().toLowerCase();
        
        if (userEmailSanitized === adminEmailSanitized) {
            return true;
        }
    }

    // GHI CHÚ BẢO MẬT: 
    // Đã loại bỏ hoàn toàn việc dùng user.user_metadata vì người dùng có thể tự sửa qua API client.
    // Nếu bạn muốn dùng Roles, hãy lưu trong bảng riêng (VD: bảng user_roles)
    // và thiết lập RLS chặn UPDATE bảng đó, hoặc dùng user.app_metadata (chỉ Admin mới sửa được).

    return false;
  } catch (err) {
    console.error("Lỗi xác thực quyền Admin:", err);
    return false;
  }
}

// ============================================================================
// 3. SERVER ACTIONS (XỬ LÝ THÊM/XÓA)
// ============================================================================

export async function addHistoryEntry(formData: FormData): Promise<void> {
  // KHÓA 1: Xác thực quyền (AuthZ) trước khi chạy lệnh Bypass
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error("Truy cập bị từ chối: Yêu cầu quyền Quản trị viên.");
  }

  // KHÓA 2: Validate dữ liệu đầu vào
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
    // Basic regex check định dạng ngày YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
      eventDate = rawDate.trim();
    } else {
      throw new Error("Lỗi xác thực: Định dạng ngày không hợp lệ.");
    }
  }

  // KHÓA 3: Thực thi truy vấn bằng Admin Client
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

  // Cập nhật lại UI sau khi thêm
  revalidatePath('/history');
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  // KHÓA 1: Xác thực quyền
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error("Truy cập bị từ chối: Yêu cầu quyền Quản trị viên.");
  }

  // KHÓA 2: Xác thực ID
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error("Lỗi xác thực: ID bản ghi không hợp lệ.");
  }

  // KHÓA 3: Thực thi xóa
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
