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

    // 1. Lấy toàn bộ dữ liệu để biết tổng số thành viên (Sẽ không gửi tất cả cho AI)
    const { data: persons, error: supabaseError } = await supabase
      .from('persons')
      .select('*');

    if (supabaseError) {
      return NextResponse.json({ reply: `Lỗi truy xuất CSDL: ${supabaseError.message}` }, { status: 500 });
    }

    if (!persons || persons.length === 0) {
      return NextResponse.json({ reply: 'Hệ thống thông báo: Đã kết nối thành công nhưng bảng "persons" hiện chưa có dữ liệu.' }, { status: 200 });
    }

    const totalMembers = persons.length;

    // =========================================================================
    // THUẬT TOÁN BỘ LỌC THÔNG MINH NHẰM TRÁNH LỖI QUÁ TẢI TOKEN CỦA GROQ
    // =========================================================================
    
    const lowerMsg = message.toLowerCase();
    // Tách các từ trong câu hỏi có độ dài > 2 ký tự làm từ khóa tìm kiếm
    const keywords = lowerMsg.split(/[ \n\t.,?]+/).filter((w: string) => w.length > 2); 

    let relevantPersons = persons;
    
    // Nếu câu hỏi không mang tính chất đếm tổng quát, tiến hành lọc dữ liệu
    if (keywords.length > 0 && !lowerMsg.includes('bao nhiêu') && !lowerMsg.includes('tổng số') && !lowerMsg.includes('tất cả')) {
        relevantPersons = persons.filter((p: any) => {
            const personStr = JSON.stringify(p).toLowerCase();
            // Chỉ giữ lại những người có chứa từ khóa trong câu hỏi
            return keywords.some((kw: string) => personStr.includes(kw));
        });
    }

    // CẮT GIẢM DỮ LIỆU: Chỉ gửi tối đa 10 kết quả phù hợp nhất lên AI
    relevantPersons = relevantPersons.slice(0, 10);

    // DỌN RÁC JSON: Xóa bỏ các cột làm tốn token vô ích
    const cleanPersons = relevantPersons.map((p: any) => {
        const clean: any = {};
        for (const key in p) {
            const lowerKey = key.toLowerCase();
            // Loại bỏ ID, Link ảnh, ngày tạo, ngày sửa
            if (['id', 'created_at', 'updated_at', 'avatar_url', 'image', 'uuid', 'photo'].includes(lowerKey)) continue;
            
            // Chỉ giữ lại trường có giá trị
            if (p[key] !== null && p[key] !== '') {
                clean[key] = p[key];
            }
        }
        return clean;
    });

    const contextData = JSON.stringify(cleanPersons);

    const systemPrompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu không đủ, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

THÔNG TIN TỔNG QUAN:
- Gia phả hiện tại có tổng cộng: ${totalMembers} thành viên.

DỮ LIỆU THÀNH VIÊN LIÊN QUAN (Định dạng JSON - Đã giới hạn hiển thị):
${contextData}`;

    // 2. Gọi Groq API với gói dữ liệu đã được tối ưu siêu nhẹ
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
        temperature: 0.1, // Khóa chặt trí tưởng tượng của AI
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
