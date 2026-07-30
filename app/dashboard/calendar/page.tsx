import { DashboardProvider } from "@/components/DashboardContext";
import LunisolarCalendar from "@/components/LunisolarCalendar";

export const metadata = {
  title: "Lịch Âm Dương",
};

export default function CalendarPage() {
  return (
    <DashboardProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <h1 className="title">Lịch Âm Dương</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Tra cứu ngày Âm - Dương lịch dễ dàng.
          </p>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
          <LunisolarCalendar />
        </main>
      </div>
    </DashboardProvider>
  );
}
