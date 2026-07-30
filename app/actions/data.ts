"use server";

import { Relationship } from "@/types";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload shape cho file backup JSON.
 * Hỗ trợ toàn bộ 8 bảng trong schema public.
 */
interface PersonExport {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  avatar_url: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

interface RelationshipExport {
  id?: string;
  type: string;
  person_a: string;
  person_b: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PersonDetailsPrivateExport {
  person_id: string;
  phone_number: string | null;
  occupation: string | null;
  current_residence: string | null;
}

interface CustomEventExport {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

// Khai báo kiểu dữ liệu mở rộng cho 4 bảng mới
type DonationExport = Record<string, any>;
type ExpenseExport = Record<string, any>;
type PhotoExport = Record<string, any>;
type ProfileExport = Record<string, any>;

interface BackupPayload {
  version: number;
  timestamp: string;
  persons: PersonExport[];
  relationships: RelationshipExport[];
  person_details_private?: PersonDetailsPrivateExport[];
  custom_events?: CustomEventExport[];
  donations?: DonationExport[];
  expenses?: ExpenseExport[];
  photos?: PhotoExport[];
  profiles?: ProfileExport[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizePerson(
  p: PersonExport,
): Omit<PersonExport, "created_at" | "updated_at"> {
  return {
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year ?? null,
    birth_month: p.birth_month ?? null,
    birth_day: p.birth_day ?? null,
    death_year: p.death_year ?? null,
    death_month: p.death_month ?? null,
    death_day: p.death_day ?? null,
    death_lunar_year: p.death_lunar_year ?? null,
    death_lunar_month: p.death_lunar_month ?? null,
    death_lunar_day: p.death_lunar_day ?? null,
    is_deceased: p.is_deceased ?? false,
    is_in_law: p.is_in_law ?? false,
    birth_order: p.birth_order ?? null,
    generation: p.generation ?? null,
    other_names: p.other_names ?? null,
    avatar_url: p.avatar_url ?? null,
    note: p.note ?? null,
  };
}

function sanitizeRelationship(
  r: RelationshipExport,
): Omit<RelationshipExport, "id" | "created_at" | "updated_at"> {
  return {
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
    note: r.note ?? null,
  };
}

function sanitizeCustomEvent(
  e: CustomEventExport,
): Omit<CustomEventExport, "created_by"> {
  return {
    id: e.id,
    name: e.name,
    content: e.content ?? null,
    event_date: e.event_date,
    location: e.location ?? null,
  };
}

// Hàm làm sạch dữ liệu chung cho các bảng mới (loại bỏ created_at và updated_at để DB tự tạo)
function sanitizeGeneric(item: any) {
  const { created_at, updated_at, ...rest } = item;
  return rest;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportData(
  exportRootId?: string,
): Promise<BackupPayload | { error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return { error: "Từ chối truy cập. Chỉ admin mới có quyền này." };
  }

  const supabase = await getSupabase();

  // 1. Tải dữ liệu 4 bảng cốt lõi
  const { data: allPersons, error: personsError } = await supabase
    .from("persons")
    .select("id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, note, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (personsError) return { error: "Lỗi tải dữ liệu persons: " + personsError.message };

  const { data: allRels, error: relationshipsError } = await supabase
    .from("relationships")
    .select("id, type, person_a, person_b, note, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (relationshipsError) return { error: "Lỗi tải dữ liệu relationships: " + relationshipsError.message };

  const { data: allPrivateDetails, error: privateDetailsError } = await supabase
    .from("person_details_private")
    .select("person_id, phone_number, occupation, current_residence");

  if (privateDetailsError) return { error: "Lỗi tải dữ liệu person_details_private: " + privateDetailsError.message };

  const { data: allCustomEvents, error: customEventsError } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by")
    .order("event_date", { ascending: true });

  if (customEventsError) return { error: "Lỗi tải dữ liệu custom_events: " + customEventsError.message };

  // 2. Tải dữ liệu 4 bảng mở rộng
  const { data: allDonations, error: donationsError } = await supabase.from("donations").select("*");
  if (donationsError) return { error: "Lỗi tải dữ liệu donations: " + donationsError.message };

  const { data: allExpenses, error: expensesError } = await supabase.from("expenses").select("*");
  if (expensesError) return { error: "Lỗi tải dữ liệu expenses: " + expensesError.message };

  const { data: allPhotos, error: photosError } = await supabase.from("photos").select("*");
  if (photosError) return { error: "Lỗi tải dữ liệu photos: " + photosError.message };

  const { data: allProfiles, error: profilesError } = await supabase.from("profiles").select("*");
  if (profilesError) return { error: "Lỗi tải dữ liệu profiles: " + profilesError.message };


  let exportPersons = (allPersons ?? []) as PersonExport[];
  let exportRels = (allRels ?? []) as RelationshipExport[];
  let exportPrivateDetails = (allPrivateDetails ?? []) as PersonDetailsPrivateExport[];
  const exportCustomEvents = (allCustomEvents ?? []) as CustomEventExport[];
  const exportDonations = (allDonations ?? []) as DonationExport[];
  const exportExpenses = (allExpenses ?? []) as ExpenseExport[];
  const exportPhotos = (allPhotos ?? []) as PhotoExport[];
  const exportProfiles = (allProfiles ?? []) as ProfileExport[];

  // Xử lý lọc nhánh gia đình nếu chọn exportRootId
  if (exportRootId && exportPersons.some((p) => p.id === exportRootId)) {
    const includedPersonIds = new Set<string>([exportRootId]);

    const findDescendants = (parentId: string) => {
      exportRels
        .filter(
          (r) =>
            (r.type === "biological_child" || r.type === "adopted_child") &&
            r.person_a === parentId,
        )
        .forEach((r) => {
          if (!includedPersonIds.has(r.person_b)) {
            includedPersonIds.add(r.person_b);
            findDescendants(r.person_b);
          }
        });
    };
    findDescendants(exportRootId);

    const descendantsArray = Array.from(includedPersonIds);
    descendantsArray.forEach((personId) => {
      exportRels
        .filter(
          (r) =>
            r.type === "marriage" &&
            (r.person_a === personId || r.person_b === personId),
        )
        .forEach((r) => {
          const spouseId = r.person_a === personId ? r.person_b : r.person_a;
          includedPersonIds.add(spouseId);
        });
    });

    exportPersons = exportPersons.filter((p) => includedPersonIds.has(p.id));
    exportRels = exportRels.filter(
      (r) => includedPersonIds.has(r.person_a) && includedPersonIds.has(r.person_b),
    );
    exportPrivateDetails = exportPrivateDetails.filter((d) =>
      includedPersonIds.has(d.person_id),
    );
    // Các bảng như donations, expenses, photos, profiles, custom_events sẽ được xuất toàn bộ để đảm bảo an toàn.
  }

  return {
    version: 4, 
    timestamp: new Date().toISOString(),
    persons: exportPersons,
    relationships: exportRels,
    person_details_private: exportPrivateDetails,
    custom_events: exportCustomEvents,
    donations: exportDonations,
    expenses: exportExpenses,
    photos: exportPhotos,
    profiles: exportProfiles,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(
  importPayload:
    | BackupPayload
    | {
        persons: PersonExport[];
        relationships: Relationship[];
        person_details_private?: PersonDetailsPrivateExport[];
        custom_events?: CustomEventExport[];
        donations?: DonationExport[];
        expenses?: ExpenseExport[];
        photos?: PhotoExport[];
        profiles?: ProfileExport[];
      },
) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return { error: "Từ chối truy cập. Chỉ admin mới có quyền này." };
  }

  const supabase = await getSupabase();

  if (!importPayload?.persons || !importPayload?.relationships) {
    return { error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file JSON." };
  }

  if (importPayload.persons.length === 0) {
    return {
      error: "File backup trống — không có thành viên nào để phục hồi.",
    };
  }

  // --- BƯỚC 1: XÓA DỮ LIỆU CŨ THEO THỨ TỰ (Để tránh lỗi khóa ngoại FK) ---

  // Xóa 4 bảng mở rộng
  const { error: delDonationsError } = await supabase.from("donations").delete().not("id", "is", null);
  if (delDonationsError) return { error: "Lỗi khi xoá donations cũ: " + delDonationsError.message };

  const { error: delExpensesError } = await supabase.from("expenses").delete().not("id", "is", null);
  if (delExpensesError) return { error: "Lỗi khi xoá expenses cũ: " + delExpensesError.message };

  const { error: delPhotosError } = await supabase.from("photos").delete().not("id", "is", null);
  if (delPhotosError) return { error: "Lỗi khi xoá photos cũ: " + delPhotosError.message };

  const { error: delProfilesError } = await supabase.from("profiles").delete().not("id", "is", null);
  if (delProfilesError) return { error: "Lỗi khi xoá profiles cũ: " + delProfilesError.message };

  // Xóa 4 bảng cốt lõi
  const { error: delEventsError } = await supabase.from("custom_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delEventsError) return { error: "Lỗi khi xoá custom_events cũ: " + delEventsError.message };

  const { error: delRelError } = await supabase.from("relationships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delRelError) return { error: "Lỗi khi xoá relationships cũ: " + delRelError.message };

  const { error: delPrivateError } = await supabase.from("person_details_private").delete().neq("person_id", "00000000-0000-0000-0000-000000000000");
  if (delPrivateError) return { error: "Lỗi khi xoá person_details_private cũ: " + delPrivateError.message };

  const { error: delPersonsError } = await supabase.from("persons").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delPersonsError) return { error: "Lỗi khi xoá persons cũ: " + delPersonsError.message };


  // --- BƯỚC 2: PHỤC HỒI DỮ LIỆU ---
  const CHUNK = 200;

  // 1. Insert persons
  const persons = importPayload.persons.map(sanitizePerson);
  for (let i = 0; i < persons.length; i += CHUNK) {
    const chunk = persons.slice(i, i + CHUNK);
    const { error } = await supabase.from("persons").insert(chunk);
    if (error) return { error: `Lỗi khi import persons (chunk ${i / CHUNK + 1}): ${error.message}` };
  }

  // 2. Insert relationships
  const relationships = importPayload.relationships
    .filter((r) => r.person_a !== r.person_b)
    .map(sanitizeRelationship);
  for (let i = 0; i < relationships.length; i += CHUNK) {
    const chunk = relationships.slice(i, i + CHUNK);
    const { error } = await supabase.from("relationships").insert(chunk);
    if (error) return { error: `Lỗi khi import relationships: ${error.message}` };
  }

  // 3. Insert person_details_private
  let privateDetailsCount = 0;
  const privateDetails = importPayload.person_details_private ?? [];
  if (privateDetails.length > 0) {
    for (let i = 0; i < privateDetails.length; i += CHUNK) {
      const chunk = privateDetails.slice(i, i + CHUNK);
      const { error } = await supabase.from("person_details_private").insert(chunk);
      if (error) return { error: `Lỗi khi import person_details_private: ${error.message}` };
    }
    privateDetailsCount = privateDetails.length;
  }

  // 4. Insert custom_events
  let customEventsCount = 0;
  const customEvents = (importPayload.custom_events ?? []).map(sanitizeCustomEvent);
  if (customEvents.length > 0) {
    for (let i = 0; i < customEvents.length; i += CHUNK) {
      const chunk = customEvents.slice(i, i + CHUNK);
      const { error } = await supabase.from("custom_events").insert(chunk);
      if (error) return { error: `Lỗi khi import custom_events: ${error.message}` };
    }
    customEventsCount = customEvents.length;
  }

  // 5. Insert donations
  let donationsCount = 0;
  const donations = (importPayload.donations ?? []).map(sanitizeGeneric);
  if (donations.length > 0) {
    for (let i = 0; i < donations.length; i += CHUNK) {
      const chunk = donations.slice(i, i + CHUNK);
      const { error } = await supabase.from("donations").insert(chunk);
      if (error) return { error: `Lỗi khi import donations: ${error.message}` };
    }
    donationsCount = donations.length;
  }

  // 6. Insert expenses
  let expensesCount = 0;
  const expenses = (importPayload.expenses ?? []).map(sanitizeGeneric);
  if (expenses.length > 0) {
    for (let i = 0; i < expenses.length; i += CHUNK) {
      const chunk = expenses.slice(i, i + CHUNK);
      const { error } = await supabase.from("expenses").insert(chunk);
      if (error) return { error: `Lỗi khi import expenses: ${error.message}` };
    }
    expensesCount = expenses.length;
  }

  // 7. Insert photos
  let photosCount = 0;
  const photos = (importPayload.photos ?? []).map(sanitizeGeneric);
  if (photos.length > 0) {
    for (let i = 0; i < photos.length; i += CHUNK) {
      const chunk = photos.slice(i, i + CHUNK);
      const { error } = await supabase.from("photos").insert(chunk);
      if (error) return { error: `Lỗi khi import photos: ${error.message}` };
    }
    photosCount = photos.length;
  }

  // 8. Insert profiles
  let profilesCount = 0;
  const profiles = (importPayload.profiles ?? []).map(sanitizeGeneric);
  if (profiles.length > 0) {
    for (let i = 0; i < profiles.length; i += CHUNK) {
      const chunk = profiles.slice(i, i + CHUNK);
      const { error } = await supabase.from("profiles").insert(chunk);
      if (error) return { error: `Lỗi khi import profiles: ${error.message}` };
    }
    profilesCount = profiles.length;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/data");
  revalidatePath("/dashboard/photos");

  return {
    success: true,
    imported: {
      persons: persons.length,
      relationships: relationships.length,
      person_details_private: privateDetailsCount,
      custom_events: customEventsCount,
      donations: donationsCount,
      expenses: expensesCount,
      photos: photosCount,
      profiles: profilesCount,
    },
  };
}
