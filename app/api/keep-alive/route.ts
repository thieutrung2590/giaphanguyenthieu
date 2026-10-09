import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Route này được Vercel Cron gọi mỗi ngày để giữ Supabase không bị pause.
// Query rất nhẹ: chỉ đếm số dòng bảng custom_events (lấy metadata, không tải dữ liệu).
// Kể cả khi RLS trả về rỗng thì request vẫn được tính là API activity.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { count, error } = await supabase
      .from("custom_events")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      count,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
