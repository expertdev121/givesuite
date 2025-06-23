import fs from "fs";
import path from "path";

type ContactRecord = {
  ACT_ID: string;
  ACT_Lastname: string;
  ACT_HisName: string;
  ACT_HisTitle: string;
  TEL_ID: string;
  TEL_Number: string;
  TEL_Type: string;
  TEL_AreaCode?: string;
  TEL_CountryCode?: string;
};

const filePath = path.resolve(__dirname, "../data/contact.json");
const raw = fs.readFileSync(filePath, "utf-8");
const records: ContactRecord[] = JSON.parse(raw);

// Track unique ACT_IDs
const seen = new Set<string>();

function escape(value: string | null | undefined): string {
  if (!value) return `''`;
  return `'${value.replace(/'/g, "''")}'`;
}

function toDefaultEmail(first: string, last: string) {
  return `${first.toLowerCase()}.${last.toLowerCase()}@example.com`.replace(
    /\s+/g,
    ""
  );
}

function isLikelyEmail(input: string | undefined | null) {
  return typeof input === "string" && input.includes("@");
}

const inserts: string[] = [];

for (const [index, rec] of records.entries()) {
  if (seen.has(rec.ACT_ID)) continue;
  seen.add(rec.ACT_ID);

  const firstNameRaw = rec.ACT_HisName || `First${index}`;
  const lastNameRaw = rec.ACT_Lastname || `Last${index}`;
  const title = rec.ACT_HisTitle || "Mr.";

  const emailRaw = isLikelyEmail(rec.TEL_Number)
    ? rec.TEL_Number
    : toDefaultEmail(firstNameRaw, lastNameRaw);
  const email = escape(emailRaw);

  let phoneRaw: string | null = null;
  if (!isLikelyEmail(rec.TEL_Number)) {
    phoneRaw = `${rec.TEL_AreaCode || ""}${rec.TEL_Number || ""}`.trim();
  }

  const phone = phoneRaw ? escape(phoneRaw) : "NULL";

  inserts.push(
    `INSERT INTO contact (first_name, last_name, email, phone, title) VALUES (${escape(
      firstNameRaw
    )}, ${escape(lastNameRaw)}, ${email}, ${phone}, ${escape(title)});`
  );
}

fs.writeFileSync(
  path.resolve(__dirname, "../data/data.sql"),
  inserts.join("\n"),
  "utf-8"
);

console.log(`✅ SQL dump created with ${inserts.length} unique records.`);
