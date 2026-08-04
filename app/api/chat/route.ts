import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function removeAccents(str: string) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function jsonToCsv(items: any[]) {
  if (!items || items.length === 0) return '';
  const keySet = new Set<string>();
  items.forEach(item => Object.keys(item).forEach(key => keySet.add(key)));
  const headers = Array.from(keySet);
  const csvRows = [headers.join(',')];

  for (const row of items) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) val = '';
      const strVal = String(val);
      if (strVal.includes(',') || strVal.includes('\n') || strVal.includes('"')) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình đủ biến môi trường trên Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const lowerMsg = message.toLowerCase();
    const unaccentedMsg = removeAccents(lowerMsg);
    
    let cleanMsg = unaccentedMsg.replace(/(thong tin|cho biet|hoi ve|ai la|tim|ve|cua|nhung|nguoi|ten|cha|me|vo|chong|con|cai|gia|pha|ban|su kien|gio|hop|ngay|ong|ba|anh|chi|em|bac|chu|co|di|cau|mo|thim)/g, ' ').trim();
    const keywords = cleanMsg.split(/[ \n\t.,?]+/).filter((w: string) => w.length > 1);

    let eventsData: any[] = [];
    if (/(su kien|gio|hop|le|ngay|ky niem)/.test(unaccentedMsg)) {
      const { data: events } = await supabase.from('custom_events').select('*').limit(20);
      if (events) {
        eventsData = events.map((e: any) => {
          const clean: any = {};
          for (const key in e) {
            if (!['created_at', 'updated_at'].includes(key.toLowerCase()) && e[key] !== null) clean[key] = e[key];
          }
          return clean;
        });
      }
    }

    const { data: allPersons, error: personError, count } = await supabase
      .from('persons')
      .select('*', { count: 'exact' })
      .limit(2000);

    if (personError) {
      return NextResponse.json({ reply: `Lỗi truy xuất bảng persons: ${personError.message}` }, { status: 500 });
    }

    const totalMembers = count || (allPersons ? allPersons.length : 0);
    let finalPersons: any[] = [];
    let relationshipsData: any[] = [];

    if (allPersons && allPersons.length > 0) {
      let mainPersons = allPersons;

      if (keywords.length > 0 && !unaccentedMsg.includes('bao nhieu') && !unaccentedMsg.includes('tong so')) {
        const scoredPersons = allPersons.map((p: any) => {
          const rawName = p.full_name || p.name || p.ho_ten || p.title || '';
          const nameStr = removeAccents(rawName.toLowerCase());
          let score = 0;
          keywords.forEach((kw: string) => { if (nameStr.includes(kw)) score += 1; });
          return { ...p, _matchScore: score };
        });

        mainPersons = scoredPersons
          .filter((p: any) => p._matchScore > 0) 
          .sort((a: any, b: any) => b._matchScore - a._matchScore)
          .slice(0, 15); 
      } else {
        mainPersons = mainPersons.slice(0, 15);
      }

      finalPersons = [...mainPersons];

      if (mainPersons.length > 0) {
        const mainIds = mainPersons.map(p => p.id).filter(Boolean);

        if (mainIds.length > 0) {
          const { data: rels } = await supabase
            .from('relationships')
            .select('*')
            .or(`person_id.in.(${mainIds.join(',')}),related_person_id.in.(${mainIds.join(',')})`)
            .limit(100);

          if (rels && rels.length > 0) {
            relationshipsData = rels;

            const relativeIds = new Set<string>();
            rels.forEach(r => {
              if (r.person_id && !mainIds.includes(r.person_id)) relativeIds.add(r.person_id);
              if (r.related_person_id && !mainIds.includes(r.related_person_id)) relativeIds.add(r.related_person_id);
            });

            const relIdsArray = Array.from(relativeIds);
            if (relIdsArray.length > 0) {
              const foundRelatives = allPersons.filter(p => relIdsArray.includes(p.id));
              finalPersons = [...finalPersons, ...foundRelatives];
              
              const foundIds = foundRelatives.map(p => p.id);
              const missingIds = relIdsArray.filter(id => !foundIds.includes(id));
              
              if (missingIds.length > 0) {
                 const { data: extraRelatives } = await supabase.from('persons').select('*').in('id', missingIds);
                 if (extraRelatives) finalPersons = [...finalPersons, ...extraRelatives];
              }
            }
          }
        }
      }
    }

    const uniquePersons = Array.from(new Map(finalPersons.map(p => [p.id, p])).values());
    const cleanPersons = uniquePersons.map((p: any) => {
      const clean: any = { id: p.id };
      for (const key in p) {
        const lowerKey = key.toLowerCase();
        if (['created_at', 'updated_at', 'avatar_url', 'image', 'uuid', 'photo', '_matchscore'].includes(lowerKey)) continue;
        if (p[key] !== null && p[key] !== '') clean[key] = p[key];
      }
      return clean;
    });

    const translatedRelationships = relationshipsData.map((r: any) => {
      const p1 = uniquePersons.find(p => p.id === r.person_id);
      const p2 = uniquePersons.find(p => p.id === r.related_person_id);
      
      if (p1 && p2) {
        const name1 = p1.full_name || p1.name || p1.ho_ten || 'Không rõ';
        const name2 = p2.full_name || p2.name || p2.ho_ten || 'Không rõ';
        const type = r.relationship_type || r.type || r.quan_he || 'người thân';
        
        return `- ${name1} (ID: ${p1.id}) <--> Quan hệ là "${type}" với <--> ${name2} (ID: ${p2.id})`;
      }
      return null;
    }).filter(Boolean);

    const relsText = translatedRelationships.join('\n');
    const csvPersons = jsonToCsv(cleanPersons);
    const csvEvents = jsonToCsv(eventsData);

    const systemPrompt = `Bạn là "Trợ lý Gia Phả" của dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc: Ưu tiên tuyệt đối tính CHÍNH XÁC, không suy đoán hay bịa đặt.
Nếu không có dữ liệu để kết luận, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

THÔNG TIN TỔNG QUAN:
- Gia phả hiện tại có tổng cộng: ${totalMembers} thành viên.

DỮ LIỆU THÀNH VIÊN (Định dạng CSV):
${csvPersons}

DỮ LIỆU MỐI QUAN HỆ (Đã được giải mã trực tiếp từ Database):
${relsText || 'Không có dữ liệu mối quan hệ.'}

DỮ LIỆU SỰ KIỆN SẮP TỚI:
${csvEvents || 'Không có sự kiện.'}

HƯỚNG DẪN TRÌNH BÀY:
1. NẾU NGƯỜI DÙNG HỎI VỀ GIA ĐÌNH, CON CÁI: TUYỆT ĐỐI KHÔNG SỬ DỤNG BẢNG (TABLE). Hãy trình bày bằng danh sách gạch đầu dòng rõ ràng, mạch lạc.
2. BỘ LỌC QUAN HỆ CỐT LÕI: Bạn CHỈ ĐƯỢC PHÉP liệt kê những người có mối quan hệ trực tiếp sau đây: Bố (Cha), Mẹ, Vợ, Chồng, Con cái, Anh ruột, Chị ruột, Em ruột. 
3. TUYỆT ĐỐI BỎ QUA VÀ KHÔNG LIỆT KÊ các mối quan hệ họ hàng xa (như: ông nội, bà nội, chú rể, bác, cô, cậu, mợ, anh họ, em họ, cháu...).
4. Đọc kỹ mục "DỮ LIỆU MỐI QUAN HỆ". Không bao giờ hiển thị dãy số ID cho người dùng xem.`;

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
        temperature: 0.1,
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
