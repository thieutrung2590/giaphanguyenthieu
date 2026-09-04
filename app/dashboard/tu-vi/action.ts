"use server";

export interface LuangiaiAIData {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
  thanCu?: string;
  tuanTriet?: string; 
  category?: string;
  viewYear?: string;
  quanLocInfo?: string;
  taiBachInfo?: string;
  phuTheInfo?: string;
  phucDucInfo?: string;
  thienDiInfo?: string;
}

export async function getLuangiaiAI(data: LuangiaiAIData) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy GROQ_API_KEY trên hệ thống.";
  }

  let specificPrompt = "";
  const cat = data.category || "tong_quan";
  const namXemHan = data.viewYear || "hiện tại";

  if (cat === "cong_danh") {
    specificPrompt = `Tập trung chuyên sâu luận giải về đường CÔNG DANH, SỰ NGHIỆP, NĂNG LỰC LÃNH ĐẠO và ĐỊNH HƯỚNG PHÁT TRIỂN:
- Kết hợp cung Mệnh, cung Thân (${data.thanCu || "chưa rõ"}) và đặc biệt là CUNG QUAN LỘC (${data.quanLocInfo || "Vô chính diệu"}).
- Dùng các câu văn mạch lạc, sắc sảo để chỉ rõ lĩnh vực phù hợp (kinh doanh độc lập, quản lý tổ chức, kỹ thuật công nghệ, nghiên cứu hay sáng tạo nghệ thuật), ưu thế nổi trội và thời điểm bứt phá sự nghiệp.`;
  } else if (cat === "tai_loc") {
    specificPrompt = `Tập trung chuyên sâu luận giải về TÀI BẠCH, TIỀN TÀI và PHƯƠNG THỨC QUẢN TRỊ TÀI CHÍNH:
- Kết hợp cung Mệnh và CUNG TÀI BẠCH (${data.taiBachInfo || "Vô chính diệu"}).
- Diễn giải bằng văn phong rõ ràng, khúc chiết về tính chất dòng tiền (chính tài hay phụ tài, tích lũy điền sản hay kinh doanh mạo hiểm), cơ hội tài chính và các điểm cốt tử cần lưu ý để giữ gìn tài sản.`;
  } else if (cat === "tinh_duyen") {
    specificPrompt = `Tập trung chuyên sâu luận giải về TÌNH DUYÊN, HÔN NHÂN và GIA ĐẠO:
- Phân tích sự tương tác giữa CUNG PHU THÊ (${data.phuTheInfo || "Vô chính diệu"}) và CUNG PHÚC ĐỨC (${data.phucDucInfo || "Vô chính diệu"}).
- Khắc họa tính cách người bạn đời, mức độ hòa hợp tâm hồn, những thử thách thường gặp và lời khuyên chân thành để xây dựng gia đạo êm ấm, thuận hòa, bền chặt.`;
  } else if (cat === "van_han") {
    specificPrompt = `Tập trung chuyên sâu luận giải về VẬN HẠN TRONG NĂM ${namXemHan}:
- Xem xét sự vận hành giữa Mệnh, Cục, Cung Thân (${data.thanCu || "chưa rõ"}), các sao hội tụ và ảnh hưởng của Tuần/Triệt trong năm ${namXemHan}.
- Đưa ra dự đoán về cơ hội thăng tiến, các giai đoạn hoặc lĩnh vực cần chú ý (sức khỏe, tài chính, thị phi), cùng phương thức tu tâm dưỡng tính để hóa giải hung tinh, đón nhận phúc lộc cát tường.`;
  } else {
    specificPrompt = `Luận giải tổng quan về cốt cách tính cách, căn nguyên vận mệnh và định hướng cuộc đời:
- Luận giải sự tương phối giữa Bản mệnh (${data.banMenh}) và Cục (${data.cuc}), Âm Dương thuận/nghịch lý bằng những câu văn uyển chuyển, sâu sắc.
- Phân tích khí chất và phong thái thể hiện qua các sao tại cung Mệnh (${data.chinhTinh}), vị trí Thân cư (${data.thanCu || "chưa rõ"}), và thế xuất ngoại đối ngoại ở cung Thiên Di (${data.thienDiInfo || ""}).
- Đưa ra triết lý sống và kim chỉ nam giúp đương số làm chủ số phận, tự hoàn thiện bản thân.`;
  }

  const tuanTrietInfo = data.tuanTriet ? `- Ảnh hưởng Tuần/Triệt tại Mệnh: ${data.tuanTriet}` : "";
  const thanCuInfo = data.thanCu ? `- Vị trí Thân: ${data.thanCu}` : "";

  const prompt = `Hãy viết một bài luận giải Tử Vi Đẩu Số sắc sảo, nhân văn và chân thực cho đương số sau:
  - Họ tên: ${data.name}
  - Giới tính: ${data.gender}
  - Âm Dương: ${data.amDuong}
  - Bản Mệnh: ${data.banMenh}
  - Cục: ${data.cuc}
  - Các sao tại Cung Mệnh: ${data.chinhTinh}
  ${thanCuInfo}
  ${tuanTrietInfo}
  ${data.quanLocInfo ? `- Cung Quan Lộc: ${data.quanLocInfo}` : ""}
  ${data.taiBachInfo ? `- Cung Tài Bạch: ${data.taiBachInfo}` : ""}
  ${data.phuTheInfo ? `- Cung Phu Thê: ${data.phuTheInfo}` : ""}
  ${data.phucDucInfo ? `- Cung Phúc Đức: ${data.phucDucInfo}` : ""}
  ${data.thienDiInfo ? `- Cung Thiên Di: ${data.thienDiInfo}` : ""}
  - Năm đang xem vận hạn: ${namXemHan}

  YÊU CẦU NỘI DUNG TRỌNG TÂM:
  ${specificPrompt}
  
  QUY TẮC BẮT BUỘC VỀ HÌNH THỨC VÀ HÀNH VĂN:
  1. TUYỆT ĐỐI KHÔNG DÙNG BẢNG BIỂU (NO TABLES), KHÔNG dùng các ký tự gạch đứng '|' hay các dòng gạch ngang phân cột '|---|'.
  2. BẮT BUỘC viết thành các ĐOẠN VĂN XUÔI HOÀN CHỈNH, câu văn rõ ràng, gãy gọn, mạch lạc, tự nhiên và giàu cảm hứng.
  3. Khi phân tích tác động tương sinh tương khắc giữa Bản mệnh (${data.banMenh}) và Ngũ hành của các sao: Hãy lồng ghép khéo léo vào câu văn giải thích ý nghĩa thực tế (ví dụ: Bản mệnh ${data.banMenh} tương hòa hay tương sinh với sao nào, ngụ ý điều gì đối với tính cách và cơ hội của đương số), TUYỆT ĐỐI KHÔNG lập danh sách so sánh khô khan hay kẻ bảng.
  4. Bố cục gồm 3 - 4 đoạn văn súc tích, có thể dùng tiêu đề in đậm ngắn gọn cho từng phần (ví dụ: **1. Cốt cách Bản Mệnh & Ngũ Hành**, **2. Luận Giải Trọng Tâm**, **3. Lời Khuyên & Định Hướng**).
  5. Độ dài khoảng 300 - 450 từ, văn phong uyên bác nhưng gần gũi, thực tế.`;

  const modelsToTry = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile"
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
            { 
              role: "system", 
              content: "Bạn là một bậc thầy Tử Vi Đẩu Số uyên bác, thấu triệt Dịch lý Đông phương và nhân sinh hiện đại. Bạn luôn viết lời luận giải bằng những đoạn văn xuôi trau chuốt, các câu văn rõ ràng, mạch lạc và tự nhiên. BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC DÙNG BẢNG BIỂU (TABLE), KHÔNG KẺ CỘT BẰNG DẤU GẠCH ĐỨNG (|) HOẶC CÁC ĐƯỜNG KẺ BẢNG (|---|). Mọi quan hệ ngũ hành sinh khắc đều được diễn giải thành lời văn sâu sắc, giàu triết lý và dễ hiểu." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7, 
          max_tokens: 1400, 
        }),
      });

      const result = await response.json();

      if (response.ok && result.choices && result.choices.length > 0) {
        const rawContent = result.choices[0].message.content || "";
        return cleanLuangiaiOutput(rawContent);
      } else {
        lastErrorMessage = result.error?.message || "Lỗi không xác định";
      }
    } catch (error: unknown) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  return `LỖI TỪ AI: ${lastErrorMessage}`;
}

/**
 * Xử lý hậu kỳ văn bản: đảm bảo không còn tàn dư bảng biểu markdown hay dấu gạch đứng pipe,
 * chuyển đổi mọi dữ liệu dạng bảng thành câu văn mạch lạc, tự nhiên.
 */
function cleanLuangiaiOutput(raw: string): string {
  if (!raw) return "";

  const lines = raw.split("\n");
  const resultLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Dòng gạch ngang ngăn cách bảng: |---|---|...
    const isTableSeparator = /^\|?[\s-:]+\|[\s-:|]+$/.test(line);
    // Dòng chứa các cột bảng: | Cung | Sao | ... |
    const isTableRow = line.startsWith("|") && line.endsWith("|") && line.includes("|");

    if (isTableSeparator) {
      inTable = true;
      continue;
    }

    if (isTableRow) {
      const cols = line
        .split("|")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Nhận diện dòng tiêu đề bảng (header) để bỏ qua
      if (
        cols.some(c => /cung|sao|tương sinh|khắc|ý nghĩa|ngũ hành|thuộc tính/i.test(c)) &&
        !inTable
      ) {
        inTable = true;
        continue;
      }

      // Chuyển dòng dữ liệu bảng thành câu văn rõ ràng, tự nhiên
      if (cols.length >= 2) {
        if (cols.length === 2) {
          resultLines.push(`• **${cols[0]}:** ${cols[1]}.`);
        } else {
          resultLines.push(`• **${cols[0]}** (${cols[1]}): ${cols.slice(2).join(" — ")}.`);
        }
      } else if (cols.length === 1) {
        resultLines.push(`• ${cols[0]}`);
      }
      continue;
    }

    // Ra khỏi khối bảng
    inTable = false;

    // Làm sạch dấu pipe rời rạc nếu có trong văn bản thường
    let cleanedLine = line;
    if (cleanedLine.includes("|")) {
      cleanedLine = cleanedLine.replace(/\|/g, " — ").replace(/\s*—\s*—\s*/g, " — ");
    }

    resultLines.push(cleanedLine);
  }

  // Chuẩn hóa khoảng cách giữa các đoạn
  return resultLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
