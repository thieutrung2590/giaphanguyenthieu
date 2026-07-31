"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getLuangiaiAI(data: {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Lỗi: Hệ thống chưa được cấu hình API Key của AI.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Hãy đóng vai một bậc thầy Tử Vi Đẩu Số. Viết một bài luận giải chuyên sâu, mang âm hưởng huyền bí nhưng dễ hiểu cho đương số sau:
    - Tên: ${data.name}
    - Giới tính: ${data.gender}
    - Âm Dương: ${data.amDuong}
    - Bản Mệnh: ${data.banMenh}
    - Cục: ${data.cuc}
    - Các sao tại cung Mệnh: ${data.chinhTinh}

    Yêu cầu:
    1. Nhận xét tổng quan về tính cách, khí chất dựa trên Bản mệnh và sao tại cung Mệnh.
    2. Đưa ra một vài lời khuyên trọng tâm giúp đương số phát huy điểm mạnh, hạn chế điểm yếu.
    3. Không dùng định dạng phức tạp, chỉ dùng văn bản thuần túy có dấu xuống dòng. Giới hạn khoảng 250 - 300 chữ.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("Lỗi gọi AI:", error.message || error);
    return "Rất tiếc, các tinh tú đang nhiễu loạn, AI không thể luận giải lúc này. Vui lòng kiểm tra lại API Key trên Vercel hoặc thử lại sau.";
  }
}
