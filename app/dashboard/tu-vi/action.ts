"use server";

export async function getLuangiaiAI(data: {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
}) {
  // Lấy khóa API của Groq từ Vercel
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy GROQ_API_KEY. Vui lòng thêm biến GROQ_API_KEY vào phần Environment Variables trên Vercel.";
  }

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

  try {
    // Gọi trực tiếp đến máy chủ của Groq (Tương thích chuẩn OpenAI)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Mô hình LLaMA 3 70B siêu thông minh và tốc độ cực nhanh của Groq
        messages: [
          { role: "system", content: "Bạn là một chuyên gia Tử Vi Đẩu Số uyên bác, thông thạo văn phong và văn hóa Việt Nam." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7, 
        max_tokens: 1024, 
      }),
    });

    const result = await response.json();

    // Xử lý nếu máy chủ Groq báo lỗi (Sai key, vượt quá giới hạn...)
    if (!response.ok) {
      return `LỖI TỪ GROQ AI: ${result.error?.message || "Không xác định"}
      
      💡 GỢI Ý KHẮC PHỤC:
      1. Đảm bảo bạn đã nhập đúng GROQ_API_KEY trên Vercel.
      2. Nếu lỗi liên quan đến Rate Limit (Giới hạn truy cập), hãy chờ khoảng 1 phút rồi thử lại do Groq giới hạn số lần gọi trên mỗi phút cho tài khoản miễn phí.`;
    }

    // Trả kết quả luận giải về màn hình
    return result.choices[0].message.content;
  } catch (error: any) {
    return `LỖI KẾT NỐI MẠNG: ${error.message}`;
  }
}
