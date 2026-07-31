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

  // Danh sách các mô hình AI dự phòng của Groq (Tự động dò tìm phiên bản hoạt động)
  const modelsToTry = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ];

  let lastErrorMessage = "";

  // Tự động quét: Thử gọi từng model, nếu model nào phản hồi thành công thì trả về kết quả
  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "Bạn là một chuyên gia Tử Vi Đẩu Số uyên bác, thông thạo văn phong và văn hóa Việt Nam." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7, 
          max_tokens: 1024, 
        }),
      });

      const result = await response.json();

      // Nếu API trả về văn bản thành công
      if (response.ok && result.choices && result.choices.length > 0) {
        return result.choices[0].message.content;
      } else {
        // Ghi nhận lỗi nhưng không dừng, tiếp tục thử model khác trong mảng
        lastErrorMessage = result.error?.message || "Lỗi không xác định";
      }
    } catch (error: any) {
      lastErrorMessage = error.message;
    }
  }

  // Nếu tất cả các mô hình đều thất bại
  return `LỖI TỪ GROQ AI: ${lastErrorMessage}
  
  💡 GỢI Ý KHẮC PHỤC:
  1. Đảm bảo GROQ_API_KEY trên Vercel là chính xác và còn hiệu lực.
  2. Nếu lỗi liên quan đến Rate Limit, hãy chờ 1 phút rồi thử lại.`;
}
