type InnLookupInput = {
  lastName: string;
  firstName: string;
  patronymic?: string | null;
  birthDate: string;
  passportNumber: string;
  passportIssuedDate: string;
};

type InnLookupResult =
  | { ok: true; inn: string }
  | { ok: false; message: string; reason?: "not_found" | "captcha" | "unavailable" };

const FNS_TIMEOUT_MS = 10000;
const FNS_NEW_FIND_URL = "https://service.nalog.ru/inn-new-proc.json";
const FNS_NEW_GET_URL = "https://service.nalog.ru/inn-new-proc.do";
const FNS_OLD_URL = "https://service.nalog.ru/inn-proc.do";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatRuDate(value: string) {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function formatPassportNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 10);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postForm(url: string, params: Record<string, string>, timeoutMs = FNS_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
      },
      body: new URLSearchParams(params).toString(),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`FNS HTTP ${response.status}`);
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function hasCaptchaMarker(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") {
    return /captcha|капч/i.test(value);
  }
  if (typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (record.captchaRequired === true || record.captcha === true) return true;
  return Object.values(record).some(hasCaptchaMarker);
}

function extractRequestId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const direct = record.requestId ?? record.id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  for (const nested of Object.values(record)) {
    const found = extractRequestId(nested);
    if (found) return found;
  }
  return null;
}

function extractInn(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/\b\d{10,12}\b/);
    return match?.[0] ?? null;
  }
  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of ["inn", "ИНН"]) {
    const direct = record[key];
    if (typeof direct === "string" && /^\d{10,12}$/.test(direct.trim())) return direct.trim();
    if (typeof direct === "number") {
      const normalized = String(direct);
      if (/^\d{10,12}$/.test(normalized)) return normalized;
    }
  }

  for (const nested of Object.values(record)) {
    const found = extractInn(nested);
    if (found) return found;
  }
  return null;
}

function baseParams(input: InnLookupInput) {
  return {
    fam: input.lastName.trim(),
    nam: input.firstName.trim(),
    otch: input.patronymic?.trim() ?? "",
    bdate: formatRuDate(input.birthDate),
    doctype: "21",
    docno: formatPassportNumber(input.passportNumber),
    docdt: formatRuDate(input.passportIssuedDate),
    captcha: "",
    captchaToken: "",
  };
}

function validateLookupInput(input: InnLookupInput) {
  if (!input.lastName?.trim() || !input.firstName?.trim() || !input.birthDate?.trim() || !input.passportNumber?.trim() || !input.passportIssuedDate?.trim()) {
    throw new Error("Для поиска ИНН заполните ФИО, дату рождения, паспорт и дату выдачи.");
  }
}

async function tryNewLookup(input: InnLookupInput): Promise<InnLookupResult> {
  const findResponse = await postForm(FNS_NEW_FIND_URL, {
    c: "find",
    ...baseParams(input),
  });

  if (hasCaptchaMarker(findResponse)) {
    return { ok: false, reason: "captcha", message: "ФНС запросила капчу. Укажите ИНН вручную или попробуйте позже." };
  }

  const directInn = extractInn(findResponse);
  if (directInn) return { ok: true, inn: directInn };

  const requestId = extractRequestId(findResponse);
  if (!requestId) {
    return { ok: false, reason: "not_found", message: "ИНН не найден по указанным данным" };
  }

  await sleep(1200);
  const getResponse = await postForm(FNS_NEW_GET_URL, { c: "get", requestId });

  if (hasCaptchaMarker(getResponse)) {
    return { ok: false, reason: "captcha", message: "ФНС запросила капчу. Укажите ИНН вручную или попробуйте позже." };
  }

  const inn = extractInn(getResponse);
  return inn
    ? { ok: true, inn }
    : { ok: false, reason: "not_found", message: "ИНН не найден по указанным данным" };
}

async function tryOldLookup(input: InnLookupInput): Promise<InnLookupResult> {
  const response = await postForm(FNS_OLD_URL, {
    ...baseParams(input),
    bplace: "",
    c: "innMy",
  });

  if (hasCaptchaMarker(response)) {
    return { ok: false, reason: "captcha", message: "ФНС запросила капчу. Укажите ИНН вручную или попробуйте позже." };
  }

  const inn = extractInn(response);
  return inn
    ? { ok: true, inn }
    : { ok: false, reason: "not_found", message: "ИНН не найден по указанным данным" };
}

export async function findInnByPassport(input: InnLookupInput): Promise<InnLookupResult> {
  validateLookupInput(input);

  try {
    const result = await tryNewLookup(input);
    if (result.ok || result.reason === "captcha") return result;
  } catch {
    // Fall through to the older FNS endpoint. Do not log passport data.
  }

  try {
    return await tryOldLookup(input);
  } catch {
    return { ok: false, reason: "unavailable", message: "Сервис ФНС временно недоступен. ИНН можно указать вручную." };
  }
}
