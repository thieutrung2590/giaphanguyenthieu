import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!groqApiKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình GROQ_API_KEY trên Vercel.' }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình biến môi trường Supabase trên Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: persons, error: supabaseError } = await supabase
      .from('persons')
      .select('*')
      .limit(500);

    if (supabaseError) {
      return NextResponse.json({ reply: `Lỗi truy xuất CSDL: ${supabaseError.message}` }, { status: 500 });
    }

    if (!persons || persons.length === 0) {
      return NextResponse.json({ reply: 'Hệ thống thông báo: Đã kết nối thành công nhưng bảng "persons" hiện chưa có dữ liệu.' }, { status: 200 });
    }

    const totalMembers = persons.length;

    // =========================================================================
    // NÂNG CẤP BỘ LỌC THÔNG MINH: TÌM CHÍNH XÁC TÊN, TRÁNH LẪN LỘN
    // =========================================================================
    
    const lowerMsg = message.toLowerCase();
    
    // 1. Loại bỏ các từ khóa thừa để AI chỉ tập trung vào cụm Danh Từ (Tên người)
    let cleanMsg = lowerMsg.replace(/(thông tin|cho biết|hỏi về|ai là|tìm|về|của|những|người|tên)/g, ' ').trim();
    const keywords = cleanMsg.split(/[ \n\t.,?]+/).filter((w: string) => w.length > 1); 

    let relevantPersons = persons;
    
    // 2. Đổi thuật toán sang 'every' (Bắt buộc dữ liệu phải chứa TẤT CẢ các chữ trong tên)
    if (keywords.length > 0 && !lowerMsg.includes('bao nhiêu') && !lowerMsg.includes('tổng số') && !lowerMsg.includes('tất cả')) {
        relevantPersons = persons.filter((p: any) => {
            const personStr = JSON.stringify(p).toLowerCase();
            // Ví dụ: Gõ "Nguyễn Thiệu Dũng", bắt buộc chuỗi JSON phải có đủ "nguyễn", "thiệu", "dũng"
            return keywords.every((kw: string) => personStr.includes(kw));
        });
    }

    // Chỉ gửi tối đa 10 kết quả phù hợp nhất
    relevantPersons = relevantPersons.slice(0, 10);

    // Dọn dẹp JSON
    const cleanPersons = relevantPersons.map((p: any) => {
        const clean: any = {};
        for (const key in p) {
            const lowerKey = key.toLowerCase();
            if (['id', 'created_at', 'updated_at', 'avatar_url', 'image', 'uuid', 'photo'].includes(lowerKey)) continue;
            
            if (p[key] !== null && p[key] !== '') {
                clean[key] = p[key];
            }
        }
        return clean;
    });

    const contextData = JSON.stringify(cleanPersons);

    const systemPrompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên danh sách dữ liệu gia phả (định dạng JSON) được cung cấp dưới đây. Hãy tự động nhận diện các trường như tên, tuổi, giới tính, tiểu sử dựa vào dữ liệu JSON. 

LƯU Ý QUAN TRỌNG VỀ ĐÍCH DANH: Phải đọc thật kỹ và đối chiếu chính xác HỌ TÊN người dùng hỏi với dữ liệu JSON. Tuyệt đối không nhầm lẫn các tên gần giống nhau (Ví dụ: Dũng và Dung, Trọng và Trung).
Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu JSON cung cấp là mảng rỗng [] hoặc không có thông tin khớp với yêu cầu, hãy trả lời đúng nguyên văn: "Không đủ thông tin để kết luận".

THÔNG TIN TỔNG QUAN:
- Gia phả hiện tại có tổng cộng: ${totalMembers} thành viên.

DỮ LIỆU THÀNH VIÊN LIÊN QUAN (Định dạng JSON):
${contextData}`;

    // 3. Gọi Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1, // Khóa chặt tính sáng tạo để chống bịa đặt
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Lỗi kết nối đến Groq API');
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
