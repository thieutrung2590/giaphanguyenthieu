-- Kích hoạt RLS cho bảng person_details_private
ALTER TABLE public.person_details_private ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu có (để tránh lỗi khi chạy lại)
DROP POLICY IF EXISTS "Admin and Editor can manage private details" ON public.person_details_private;

-- Tạo policy mới chỉ cho phép admin và editor CRUD dữ liệu riêng tư
CREATE POLICY "Admin and Editor can manage private details" ON public.person_details_private
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'editor')
);