export type DadataAddressSuggestion = {
  value: string;
  unrestrictedValue: string;
  data: Record<string, unknown>;
};

export type DadataFmsUnitSuggestion = {
  value: string;
  code: string;
  name: string;
};

const DADATA_TIMEOUT_MS = 10000;
const DADATA_ADDRESS_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const DADATA_FMS_UNIT_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/fms_unit";

function getDadataConfig() {
  const token = process.env.DADATA_API_TOKEN?.trim();
  const secret = process.env.DADATA_SECRET_KEY?.trim();
  if (!token || !secret) {
    return null;
  }
  return { token, secret };
}

async function postDadata(url: string, query: string) {
  const config = getDadataConfig();
  if (!config) {
    return { suggestions: [], message: "Подсказки DaData не настроены. Можно заполнить вручную." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DADATA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${config.token}`,
        "X-Secret": config.secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, count: 8 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { suggestions: [], message: "Подсказки временно недоступны" };
    }

    return await response.json() as { suggestions?: unknown[]; message?: string };
  } catch {
    return { suggestions: [], message: "Подсказки временно недоступны" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function suggestAddress(query: string) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return { suggestions: [] as DadataAddressSuggestion[] };
  }

  const result = await postDadata(DADATA_ADDRESS_URL, normalizedQuery);
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions.map((item) => {
        const record = item as { value?: unknown; unrestricted_value?: unknown; data?: unknown };
        return {
          value: typeof record.value === "string" ? record.value : "",
          unrestrictedValue: typeof record.unrestricted_value === "string" ? record.unrestricted_value : "",
          data: record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {},
        };
      }).filter((item) => item.value)
    : [];

  return { suggestions, message: result.message };
}

export async function suggestFmsUnit(query: string) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return { suggestions: [] as DadataFmsUnitSuggestion[] };
  }

  const result = await postDadata(DADATA_FMS_UNIT_URL, normalizedQuery);
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions.map((item) => {
        const record = item as { value?: unknown; data?: { code?: unknown; name?: unknown } };
        const name = typeof record.data?.name === "string" ? record.data.name : "";
        return {
          value: typeof record.value === "string" ? record.value : name,
          code: typeof record.data?.code === "string" ? record.data.code : "",
          name: name || (typeof record.value === "string" ? record.value : ""),
        };
      }).filter((item) => item.value || item.name || item.code)
    : [];

  return { suggestions, message: result.message };
}
