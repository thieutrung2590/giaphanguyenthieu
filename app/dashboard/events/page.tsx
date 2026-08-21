import { Metadata } from "next";
import { DashboardProvider } from "@/components/DashboardContext";
import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/MemberDetailModal";
import { getSupabase } from "@/utils/supabase/queries";

export const metadata: Metadata = {
  title: "Sự kiện gia phả",
  description: "Xem sinh nhật, ngày giỗ (âm lịch), các sự kiện tuỳ chỉnh và ngày lễ Tết Việt Nam trong gia phả.",
};

const VIETNAMESE_HOLIDAYS = [
  { id: "tet-duong-lich", name: "Tết Dương lịch", day: 1, month: 1, isLunar: false },
  { id: "tet-nguyen-dan", name: "Tết Nguyên đán", day: 1, month: 1, isLunar: true },
  { id: "tet-nguyen-tieu", name: "Tết Nguyên tiêu (Rằm tháng Giêng)", day: 15, month: 1, isLunar: true },
  { id: "gio-to", name: "Giỗ Tổ Hùng Vương", day: 10, month: 3, isLunar: true },
  { id: "giai-phong", name: "Ngày Giải phóng miền Nam", day: 30, month: 4, isLunar: false },
  { id: "quoc-te-lao-dong", name: "Quốc tế Lao động", day: 1, month: 5, isLunar: false },
  { id: "tet-doan-ngo", name: "Tết Đoan ngọ", day: 5, month: 5, isLunar: true },
  { id: "le-vu-lan", name: "Lễ Vu lan (Rằm tháng Bảy)", day: 15, month: 7, isLunar: true },
  { id: "quoc-khanh", name: "Quốc khánh", day: 2, month: 9, isLunar: false },
  { id: "tet-trung-thu", name: "Tết Trung thu", day: 15, month: 8, isLunar: true },
  { id: "ong-cong-ong-tao", name: "Tết Ông Công Ông Táo", day: 23, month: 12, isLunar: true },
];

export default async function EventsPage() {
  const supabase = await getSupabase();

  const [personsRes, customEventsRes] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, death_lunar_is_leap_month, is_deceased, avatar_url",
      ),
    supabase
      .from("custom_events")
      .select("id, name, content, event_date, location, created_by"),
  ]);

  if (personsRes.error) {
    console.error("Lỗi tải dữ liệu persons:", personsRes.error.message);
  }
  
  if (customEventsRes.error) {
    console.error("Lỗi tải dữ liệu custom_events:", customEventsRes.error.message);
  }

  const persons = personsRes.data || [];
  const customEvents = customEventsRes.data || [];

  return (
    <DashboardProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <h1 className="title">Sự kiện gia phả</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật, ngày giỗ (âm lịch), ngày lễ Tết và các sự kiện tuỳ chỉnh
          </p>
        </div>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
          <EventsList
            persons={persons}
            customEvents={customEvents}
            holidays={VIETNAMESE_HOLIDAYS}
          />
        </main>
      </div>

      <MemberDetailModal />
    </DashboardProvider>
  );
}
