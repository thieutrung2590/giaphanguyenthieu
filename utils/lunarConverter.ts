// utils/lunarConverter.ts
import { Lunar, Solar } from "lunar-javascript";

/**
 * Chuyển đổi ngày Âm lịch sang Dương lịch
 * @param lunarDay Ngày âm lịch (1-30)
 * @param lunarMonth Tháng âm lịch (1-12)
 * @param lunarYear Năm âm lịch
 * @param isLeapMonth Đánh dấu tháng nhuận (0: không nhuận, 1: nhuận)
 * @returns Mảng [ngày, tháng, năm] dương lịch
 */
export function getSolarDate(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  isLeapMonth: number = 0
): [number, number, number] {
  try {
    const m = isLeapMonth === 1 ? -Math.abs(lunarMonth) : Math.abs(lunarMonth);
    const lunar = Lunar.fromYmd(lunarYear, m, lunarDay);
    const solar = lunar.getSolar();
    
    // Đảm bảo trả về đúng định dạng mảng [ngày, tháng, năm]
    return [solar.getDay(), solar.getMonth(), solar.getYear()];
  } catch (error) {
    console.error("Lỗi khi chuyển đổi Âm sang Dương:", error);
    // Trả về dữ liệu an toàn để không làm sập giao diện nếu có lỗi
    return [lunarDay, lunarMonth, lunarYear];
  }
}

/**
 * Chuyển đổi ngày Dương lịch sang Âm lịch
 * @param solarDay Ngày dương lịch
 * @param solarMonth Tháng dương lịch
 * @param solarYear Năm dương lịch
 * @returns Object chứa ngày, tháng, năm âm lịch và cờ nhuận (isLeap)
 */
export function getLunarDate(
  solarDay: number,
  solarMonth: number,
  solarYear: number
): { day: number; month: number; year: number; isLeap: boolean } {
  try {
    const solar = Solar.fromYmd(solarYear, solarMonth, solarDay);
    const lunar = solar.getLunar();
    return {
      day: lunar.getDay(),
      month: Math.abs(lunar.getMonth()),
      year: lunar.getYear(),
      isLeap: lunar.getMonth() < 0,
    };
  } catch (error) {
    console.error("Lỗi khi chuyển đổi Dương sang Âm:", error);
    return { day: solarDay, month: solarMonth, year: solarYear, isLeap: false };
  }
}
