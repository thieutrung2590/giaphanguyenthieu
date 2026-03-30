// File: app/actions.ts
'use server'

import { revalidatePath } from "next/cache";
// Import thư viện database của bạn (Prisma, Supabase, Drizzle...)
// import { db } from "@/lib/db"; 

export async function addPersonAction(formData: FormData) {
  const fullName = formData.get("full_name") as string;

  if (!fullName) return;

  // 1. Lưu vào Database (thay đoạn này bằng code DB thực tế của bạn)
  // Ví dụ với Prisma: 
  // await db.person.create({ data: { full_name: fullName } });
  console.log("Đã thêm:", fullName);

  // 2. Xóa cache của trang gia phả để Next.js lấy dữ liệu mới
  revalidatePath('/gia-pha'); 
}
