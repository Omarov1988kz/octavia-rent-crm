import fs from "fs/promises";
import path from "path";
import PizZip from "pizzip";
import { query } from "@/server/db";

export type DocumentTemplateRow = {
  id: string;
  template_key: string;
  title: string;
  file_name: string;
  file_path: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const templateRoot = path.join(process.cwd(), "templates");
const rentalTemplatePath = path.join(templateRoot, "rental-contract-template.docx");

export const rentalContractVariables = [
  "contract_number",
  "contract_date",
  "owner_full_name",
  "owner_inn",
  "owner_passport",
  "owner_passport_issued_by",
  "owner_passport_issued_date",
  "owner_passport_department_code",
  "owner_registration_address",
  "owner_phone",
  "owner_email",
  "client_full_name",
  "client_inn",
  "client_passport",
  "client_passport_issued_by",
  "client_passport_issued_date",
  "client_registration_address",
  "client_phone",
  "client_email",
  "client_driver_license_number",
  "client_driver_license_issued_date",
  "client_driver_license_expiry_date",
  "client_driver_license_categories",
  "car_name",
  "car_brand",
  "car_model",
  "car_year",
  "car_vin",
  "car_plate_number",
  "car_color",
  "car_registration_certificate",
  "car_fuel_type",
  "rental_start_date",
  "rental_start_time",
  "rental_end_date",
  "rental_end_time",
  "rental_days",
  "daily_price",
  "rent_amount",
  "deposit_amount",
  "total_amount",
];

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function documentXml() {
  const lines = [
    "Договор аренды автомобиля без экипажа № {{contract_number}} от {{contract_date}}",
    "Арендодатель: {{owner_full_name}}, ИНН {{owner_inn}}, паспорт {{owner_passport}}, выдан {{owner_passport_issued_by}} {{owner_passport_issued_date}}, код подразделения {{owner_passport_department_code}}, адрес {{owner_registration_address}}, телефон {{owner_phone}}, email {{owner_email}}.",
    "Арендатор: {{client_full_name}}, ИНН {{client_inn}}, паспорт {{client_passport}}, выдан {{client_passport_issued_by}} {{client_passport_issued_date}}, адрес {{client_registration_address}}, телефон {{client_phone}}, email {{client_email}}.",
    "Водительское удостоверение: {{client_driver_license_number}}, выдано {{client_driver_license_issued_date}}, действительно до {{client_driver_license_expiry_date}}, категории {{client_driver_license_categories}}.",
    "Автомобиль: {{car_name}}, {{car_brand}} {{car_model}} {{car_year}}, VIN {{car_vin}}, госномер {{car_plate_number}}, цвет {{car_color}}, СТС {{car_registration_certificate}}, топливо {{car_fuel_type}}.",
    "Период аренды: с {{rental_start_date}} {{rental_start_time}} до {{rental_end_date}} {{rental_end_time}}, дней: {{rental_days}}.",
    "Стоимость: {{daily_price}} в сутки, аренда {{rent_amount}}, депозит {{deposit_amount}}, итого {{total_amount}}.",
  ];

  const body = lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="850"/></w:sectPr>
  </w:body>
</w:document>`;
}

export async function ensureTemplatesDir() {
  await fs.mkdir(templateRoot, { recursive: true });
}

export async function createDefaultRentalTemplateIfMissing() {
  await ensureTemplatesDir();
  try {
    await fs.access(rentalTemplatePath);
  } catch {
    const zip = new PizZip();
    zip.file("[Content_Types].xml", contentTypesXml());
    zip.folder("_rels")?.file(".rels", rootRelsXml());
    zip.folder("word")?.file("document.xml", documentXml());
    await fs.writeFile(rentalTemplatePath, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
  }
}

export async function ensureRentalContractTemplateRow() {
  await createDefaultRentalTemplateIfMissing();
  const result = await query<DocumentTemplateRow>(
    `INSERT INTO document_templates (template_key, title, file_name, file_path, description, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (template_key) DO UPDATE
     SET title = EXCLUDED.title,
         updated_at = now()
     RETURNING *`,
    [
      "rental_contract",
      "Договор аренды",
      "rental-contract-template.docx",
      "templates/rental-contract-template.docx",
      "DOCX-шаблон договора аренды автомобиля без экипажа",
    ]
  );
  return result.rows[0];
}

export async function listDocumentTemplates() {
  await ensureRentalContractTemplateRow();
  const result = await query<DocumentTemplateRow>(
    `SELECT * FROM document_templates ORDER BY template_key, created_at DESC`,
    []
  );
  return result.rows;
}

export async function getActiveTemplate(templateKey: string) {
  await ensureRentalContractTemplateRow();
  const result = await query<DocumentTemplateRow>(
    `SELECT * FROM document_templates WHERE template_key = $1 AND is_active = true LIMIT 1`,
    [templateKey]
  );
  return result.rows[0] ?? null;
}

export function resolveTemplatePath(filePath: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const root = path.resolve(templateRoot);
  if (!fullPath.startsWith(root)) {
    throw new Error("Некорректный путь шаблона");
  }
  return fullPath;
}

export async function readTemplateFile(templateKey: string) {
  const template = await getActiveTemplate(templateKey);
  if (!template) {
    throw new Error("Активный шаблон не найден");
  }
  const fullPath = resolveTemplatePath(template.file_path);
  const buffer = await fs.readFile(fullPath);
  return { template, buffer };
}

export async function replaceRentalContractTemplate(fileName: string, fileBuffer: Buffer) {
  if (!fileName.toLowerCase().endsWith(".docx")) {
    throw new Error("Загрузите файл .docx");
  }

  await ensureTemplatesDir();
  const safeName = `rental-contract-template-${Date.now()}.docx`;
  const filePath = path.join(templateRoot, safeName);
  await fs.writeFile(filePath, fileBuffer);

  const relativePath = path.join("templates", safeName).replace(/\\/g, "/");
  const result = await query<DocumentTemplateRow>(
    `INSERT INTO document_templates (template_key, title, file_name, file_path, description, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (template_key) DO UPDATE
     SET file_name = EXCLUDED.file_name,
         file_path = EXCLUDED.file_path,
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()
     RETURNING *`,
    ["rental_contract", "Договор аренды", fileName, relativePath, "DOCX-шаблон договора аренды автомобиля без экипажа"]
  );

  return result.rows[0];
}
