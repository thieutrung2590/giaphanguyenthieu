"use server";

export async function getLuangiaiAI(data: {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
  tuanTriet?: string; 
  category?: string;
  viewYear?: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy GROQ_API_KEY trên Vercel.";
  }

  let specificPrompt = "";
  const cat = data.category || "tong_quan";
  const namXemHan = data.viewYear || "hiện tại";

  if (cat === "cong_danh") {
    specificPrompt = `Tập trung chuyên sâu phân tích về đường Công danh, Sự nghiệp, Quan lộc và Khả năng lãnh đạo của đương số dựa trên Mệnh cục và các chính tinh. Đưa ra lời khuyên về định hướng nghề nghiệp phù hợp.`;
  } else if (cat === "tai_loc") {
    specificPrompt = `Tập trung chuyên sâu phân tích về Tài lộc, Tiền bạc, khả năng quản lý tài chính và cơ hội làm giàu của đương số.`;
  } else if (cat === "tinh_duyen") {
    specificPrompt = `Tập trung chuyên sâu phân tích về Tình duyên, Hôn nhân, Gia đạo và các mối quan hệ tình cảm của đương số.`;
  } else if (cat === "van_han") {
    specificPrompt = `Tập trung chuyên sâu phân tích về VẬN HẠN TRONG NĂM ${namXemHan} của đương số. Đưa ra dự đoán về những cơ hội, thách thức trong năm ${namXemHan} và lời khuyên để hóa giải hung hiểm, đón nhận cát tường.`;
  } else {
    specificPrompt = `Nhận xét tổng quan về tính cách, khí chất và định hướng cuộc đời dựa trên Bản mệnh và sao tại cung Mệnh.`;
  }

  const tuanTrietInfo = data.tuanTriet ? `- Mức độ ảnh hưởng của Tuần/Triệt: ${data.tuanTriet}` : "";

  const prompt = `Hãy đóng vai một bậc thầy Tử Vi Đẩu Số uyên bác. Hãy viết một bài luận giải chi tiết, mang âm hưởng huyền bí nhưng thực tế cho đương số sau:
  - Tên: ${data.name}
  - Giới tính: ${data.gender}
  - Âm Dương: ${data.amDuong}
  - Bản Mệnh: ${data.banMenh}
  - Cục: ${data.cuc}
  - Các sao tại cung Mệnh: ${data.chinhTinh}
  - Năm đang xem vận hạn: ${namXemHan}
  ${tuanTrietInfo}

  YÊU CẦU TRỌNG TÂM:
  ${specificPrompt}
  
  LƯU Ý ĐẶC BIỆT: Nếu có thông tin Tuần/Triệt, hãy phân tích kỹ sự ảnh hưởng của Tuần Không / Triệt Lộ đến những khó khăn, cản trở của đương số. Không dùng định dạng quá phức tạp, chỉ dùng văn bản thuần túy có dấu xuống dòng rõ ràng, độ dài khoảng 250 - 350 chữ.`;

  const modelsToTry = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b"
  ];

  let lastErrorMessage = "";

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
            { role: "system", content: "Bạn là một chuyên gia Tử Vi Đẩu Số am hiểu sâu sắc văn hóa phương Đông." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7, 
          max_tokens: 1200, 
        }),
      });

      const result = await response.json();

      if (response.ok && result.choices && result.choices.length > 0) {
        return result.choices[0].message.content;
      } else {
        lastErrorMessage = result.error?.message || "Lỗi không xác định";
      }
    } catch (error: any) {
      lastErrorMessage = error.message;
    }
  }

  return `LỖI TỪ AI: ${lastErrorMessage}`;
}
