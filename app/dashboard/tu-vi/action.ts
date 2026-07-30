"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getLuangiaiAI(lasoData: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Hệ thống chưa được cấu hình API Key của AI. Vui lòng thêm GEMINI_API_KEY vào phần Environment Variables trên Vercel.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Tìm cung Mệnh để lấy các sao Chính Tinh
    const menhCung = lasoData.gridCung.find((c: any) => c && c.Name === "Mệnh");
    const chinhTinhMenh = menhCung?.ChinhTinh.map((s: any) => s.Name).join(", ") || "Không có chính tinh (Vô Chính Diệu)";

    const prompt = `Hãy đóng vai một bậc thầy Tử Vi Đẩu Số. Viết một bài luận giải chuyên sâu, mang âm hưởng huyền bí nhưng dễ hiểu cho đương số sau:
    - Tên: ${lasoData.info.Name}
    - Giới tính: ${lasoData.info.Gender === "male" ? "Nam" : "Nữ"}
    - Âm Dương: ${lasoData.info.AmDuong}
    - Bản Mệnh: ${lasoData.info.BanMenh}
    - Cục: ${lasoData.info.Cuc}
    - Các sao tại cung Mệnh: ${chinhTinhMenh}

    Yêu cầu:
    1. Nhận xét tổng quan về tính cách, khí chất dựa trên Bản mệnh và sao tại cung Mệnh.
    2. Đưa ra một vài lời khuyên trọng tâm giúp đương số phát huy điểm mạnh, hạn chế điểm yếu.
    3. Không dùng định dạng phức tạp (như markdown đậm nghiêng), chỉ dùng văn bản thuần túy có dấu xuống dòng. Giới hạn khoảng 250 - 300 chữ.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Lỗi gọi AI:", error);
    return "Rất tiếc, các tinh tú đang nhiễu loạn, AI không thể luận giải lúc này. Vui lòng thử lại sau.";
  }
}
