import { Person, Relationship } from "@/types";
import JSZip from "jszip";
import Papa from "papaparse";

interface PersonDetailsPrivateRow {
  person_id: string;
  phone_number: string | null;
  occupation: string | null;
  current_residence: string | null;
}

interface CustomEventRow {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

export async function exportToCsvZip(data: {
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
  person_details_private?: PersonDetailsPrivateRow[];
  custom_events?: CustomEventRow[];
}): Promise<Blob> {
  const personsCsv = Papa.unparse(data.persons);
  const relationshipsCsv = Papa.unparse(data.relationships);

  const zip = new JSZip();
  zip.file("persons.csv", personsCsv);
  zip.file("relationships.csv", relationshipsCsv);

  if (data.person_details_private && data.person_details_private.length > 0) {
    zip.file(
      "person_details_private.csv",
      Papa.unparse(data.person_details_private),
    );
  }

  if (data.custom_events && data.custom_events.length > 0) {
    zip.file("custom_events.csv", Papa.unparse(data.custom_events));
  }

  return await zip.generateAsync({ type: "blob" });
}

export async function parseCsvZip(zipBlob: Blob): Promise<{
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
  person_details_private?: PersonDetailsPrivateRow[];
  custom_events?: CustomEventRow[];
}> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlob);

  const personsFile = loadedZip.file("persons.csv");
  const relationshipsFile = loadedZip.file("relationships.csv");

  if (!personsFile || !relationshipsFile) {
    throw new Error(
      "File ZIP không hợp lệ: thiếu persons.csv hoặc relationships.csv.",
    );
  }

  const personsCsvStr = await personsFile.async("text");
  const relationshipsCsvStr = await relationshipsFile.async("text");

  // Loại trừ ép kiểu tự động cho các ID
  const personsParsed = Papa.parse<Partial<Person>>(personsCsvStr, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: (field) => field !== "id", 
  });

  const relationshipsParsed = Papa.parse<Partial<Relationship>>(
    relationshipsCsvStr,
    {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: (field) => field !== "person_a" && field !== "person_b",
    },
  );

  if (personsParsed.errors.length > 0) {
    console.error("Lỗi parse persons.csv:", personsParsed.errors);
  }

  if (relationshipsParsed.errors.length > 0) {
    console.error("Lỗi parse relationships.csv:", relationshipsParsed.errors);
  }

  const result: {
    persons: Partial<Person>[];
    relationships: Partial<Relationship>[];
    person_details_private?: PersonDetailsPrivateRow[];
    custom_events?: CustomEventRow[];
  } = {
    persons: personsParsed.data,
    relationships: relationshipsParsed.data,
  };

  const privateFile = loadedZip.file("person_details_private.csv");
  if (privateFile) {
    const privateCsvStr = await privateFile.async("text");
    const privateParsed = Papa.parse<PersonDetailsPrivateRow>(privateCsvStr, {
      header: true,
      skipEmptyLines: true,
      // Chặn ép kiểu cho person_id và phone_number để không mất số 0
      dynamicTyping: (field) => field !== "phone_number" && field !== "person_id",
    });
    if (privateParsed.errors.length > 0) {
      console.error(
        "Lỗi parse person_details_private.csv:",
        privateParsed.errors,
      );
    }
    result.person_details_private = privateParsed.data;
  }

  const eventsFile = loadedZip.file("custom_events.csv");
  if (eventsFile) {
    const eventsCsvStr = await eventsFile.async("text");
    const eventsParsed = Papa.parse<CustomEventRow>(eventsCsvStr, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: (field) => field !== "id" && field !== "created_by",
    });
    if (eventsParsed.errors.length > 0) {
      console.error("Lỗi parse custom_events.csv:", eventsParsed.errors);
    }
    result.custom_events = eventsParsed.data;
  }

  return result;
}
