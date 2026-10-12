import { untrack } from 'svelte';
import { appConfig } from "../generated/appConfig";
import { networkState } from "../stores/networkState.svelte";
import { loadingState } from "../stores/loadingState.svelte";
import { getAccount } from "./getAccount";

const endpoint = appConfig?.integrations?.appwrite?.endpoint || null;
const projectId = appConfig?.integrations?.appwrite?.projectId || null;

import { Client, TablesDB, Teams, Query, Realtime, Storage } from "appwrite";

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

const tablesDB = new TablesDB(client);
const teams = new Teams(client);
const realtime = new Realtime(client);
const storage = new Storage(client);

type Cache = "localStorage" | "sessionStorage";
type Source = "databases" | "user-account" | "teams" | "team-memberships" | "files";

export interface GetData {
  source: Source;
  "database-id"?: string;
  "table-id"?: string;
  "row-id"?: string;
  "team-id"?: string;
  "membership-id"?: string;
  "bucket-id"?: string;
  "file-id"?: string;
  query?: GetDataQuery;
  cache?: Cache;
  realtime?: boolean;
  "infinite-scroll"?: boolean;
}

export interface GetDataQuery {
  columns?: string[];
  rules?: GetDataRule[];
  order?: GetDataOrder[];
  limit?: number;
  offset?: number;
  page?: number;
}

export interface GetDataRule {
  and?: GetDataRule[];
  or?: GetDataRule[];
  column?: string;
  operator?: string;
  value?: any;
}

export interface GetDataOrder {
  column: string;
  type: "asc" | "desc" | "random";
}

type DataShape = {
  [K in Source]: { local: K extends "user-account" ? Record<string, any> : Record<string, any>[]; session: K extends "user-account" ? Record<string, any> : Record<string, any>[] };
};

let data: DataShape = {
  databases: { local: [], session: [] },
  "user-account": { local: {}, session: {} },
  teams: { local: [], session: [] },
  "team-memberships": { local: [], session: [] },
  files: { local: [], session: [] },
};

// Теперь DEFAULTS знает, что для массивов — массивы, для объекта — объект
const DEFAULTS: Record<Source, Record<string, any>[] | Record<string, any>> = {
  databases: [],
  "user-account": {},
  teams: [],
  "team-memberships": [],
  files: [],
};

const loadedSources = new Set<string>();

export function loadData(source: Source, cache: Cache = "localStorage"): void {
  const cacheKey = `${source}_${cache}`;
  if (loadedSources.has(cacheKey)) return;
  loadedSources.add(cacheKey);

  const storage = cache === "localStorage" ? localStorage : sessionStorage;
  const raw = storage.getItem(`appwrite-${source}`);
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : DEFAULTS[source];
  } catch (e) {
    parsed = DEFAULTS[source];
  }

  const targetCache = cache === "localStorage" ? "local" : "session";
  data[source][targetCache] = structuredClone(parsed) as any;
}

export function getCacheData(source: Source, cache: Cache) {
  loadData(source, cache);
  const targetCache = cache === "localStorage" ? "local" : "session";
  return data[source][targetCache];
}

export function saveData(source: Source, cache: Cache = "localStorage"): void {
  const targetCache = cache === "localStorage" ? "local" : "session";
  const storage = cache === "localStorage" ? localStorage : sessionStorage;
  try {
    storage.setItem(`appwrite-${source}`, JSON.stringify(data[source][targetCache]));
  } catch (e) {
    console.error("Failed to save cache", e);
  }
}

export function addItem(item: Record<string, any>, source: Source, cache: Cache = "localStorage"): void {
  const cacheData = getCacheData(source, cache);

  if (source === "user-account") {
    data[source][cache === "localStorage" ? "local" : "session"] = item;
    saveData(source, cache);
    return;
  }

  const arr = cacheData as Record<string, any>[];
  let index = -1;

  if (source === "databases") {
    index = arr.findIndex((row) => row.$id === item.$id && row.$databaseId === item.$databaseId && row.$tableId === item.$tableId);
  } else if (source === "team-memberships") {
    index = arr.findIndex((membership) => membership.$id === item.$id && membership.teamId === item.teamId);
  } else if (source === "teams") {
    index = arr.findIndex((team) => team.$id === item.$id);
  } else if (source === "files") {
    index = arr.findIndex((file) => file.$id === item.$id && file.bucketId === item.bucketId);
  }

  if (index !== -1) {
    arr[index] = { ...arr[index], ...item };
  } else {
    arr.push(item);
  }

  saveData(source, cache);
}

export function removeItem(item: Record<string, any>, source: Source, cache: Cache = "localStorage"): void {
  const cacheData = getCacheData(source, cache);

  if (source === "user-account") {
    data["user-account"][cache === "localStorage" ? "local" : "session"] = {};
    saveData(source, cache);
    return;
  }

  const arr = cacheData as Record<string, any>[];
  let index = -1;

  if (source === "databases") {
    index = arr.findIndex((row) => row.$id === item.$id && row.$databaseId === item.$databaseId && row.$tableId === item.$tableId);
  } else if (source === "team-memberships") {
    index = arr.findIndex((membership) => membership.$id === item.$id && membership.teamId === item.teamId);
  } else if (source === "teams") {
    index = arr.findIndex((team) => team.$id === item.$id);
  } else if (source === "files") {
    index = arr.findIndex((file) => file.$id === item.$id && file.bucketId === item.bucketId);
  }

  if (index !== -1) {
    arr.splice(index, 1); // Удаляем 1 элемент по найденному индексу
    saveData(source, cache);
  }
}

interface DatabaseRow {
  $id: string;
  $databaseId: string;
  $tableId: string;
  [key: string]: any;
}

interface UserAccount {
  $id: string;
  email: string;
  name: string;
  [key: string]: any;
}

interface Team {
  $id: string;
  name: string;
  [key: string]: any;
}

interface TeamMembership {
  $id: string;
  teamId: string;
  userId: string;
  [key: string]: any;
}

export type Item = DatabaseRow | UserAccount | Team | TeamMembership;

export interface Result {
  items?: Item[];
  total?: number;
  [key: string]: any;
}

type ConditionRule = {
  column: string;
  operator: string;
  value?: unknown;
};

type AndRule = {
  and: QueryRule[];
};

type OrRule = {
  or: QueryRule[];
};

type QueryRule =
  | AndRule
  | OrRule
  | ConditionRule;

type CompareOperator =
  | "isNull" | "isNotNull" | "search"
  | "equal" | "notEqual"
  | "lessThan" | "lessThanEqual"
  | "greaterThan" | "greaterThanEqual"
  | "between";

interface SearchResult {
  match: boolean;
  index: number;
}

// Логика поиска как в Appwrite
export function matchSearch(
  text: string | null | undefined,
  query: string
): SearchResult {
  const words = query.trim().toLowerCase().split(/\s+/);
  // Если после разделения нет слов (например, запрос состоял из пробелов)
  if (words.length === 0 || words[0] === "") {
    return { match: false, index: -1 };
  }

  // В вашей логике ищется только последнее слово из поисковой фразы
  const lastWord = words[words.length - 1];
  const textLower = (text?.toString() || "").toLowerCase();

  // Разбиваем на слова (по пробелам и пунктуации)
  const wordRegex = /[\s.,;:!?(){}[\]'"@#$%^&*|\\/<>\-+=~`]+/;
  // .filter(Boolean) убирает пустые строки, которые могут появиться,
  // если текст начинается или заканчивается разделителем
  const textWords = textLower.split(wordRegex).filter(Boolean);

  for (let i = 0; i < textWords.length; i++) {
    const word = textWords[i];
    if (word.startsWith(lastWord)) {
      return { match: true, index: i }; // Чем меньше index → тем ближе к началу
    }
  }

  return { match: false, index: -1 };
}

function isAndRule(rule: unknown): rule is AndRule {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    Array.isArray((rule as AndRule).and)
  );
}

function isOrRule(rule: unknown): rule is OrRule {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    Array.isArray((rule as OrRule).or)
  );
}

function isConditionRule(rule: unknown): rule is ConditionRule {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    typeof (rule as ConditionRule).column === 'string' &&
    typeof (rule as ConditionRule).operator === 'string'
  );
}

function compareValues(
  item: Item,
  column: string | string[],
  operator: CompareOperator,
  value: any
): boolean {
  // Приводим к строке на случай, если придут числа или булевы значения
  const containsLetters = /[a-zA-Z]/i.test(String(value));

  // 1. Проверка на null
  if (operator === "isNull") {
    return item[column as string] === null;
  } else if (operator === "isNotNull") {
    return item[column as string] !== null;
  }

  // 2. Поиск
  else if (operator === "search") {
    const searchQuery = String(value).trim();
    if (!searchQuery) return true;

    let fieldValue: string;
    if (Array.isArray(column)) {
      fieldValue = column.map((curr) => String(item[curr] || "")).join(" ");
    } else {
      fieldValue = String(item[column] || "");
    }

    const result = matchSearch(fieldValue, searchQuery);
    return result.match;
  }

  // 3. Проверка на булевы значения
  if (typeof value === "boolean") {
    return operator === "equal"
      ? item[column as string] === value
      : item[column as string] !== value;
  }

  // 4. Оператор BETWEEN (новый)
  if (operator === "between") {
    // Разбиваем строку по запятой и убираем лишние пробелы
    const rangeValues = String(value).split(",").map(v => v.trim());
    if (rangeValues.length !== 2) return false;

    const [startStr, endStr] = rangeValues;
    const itemValue = item[column as string];

    // Проверка, является ли диапазон датами
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    // Надежная проверка валидности даты в JS/TS
    const isStartDateValid = !isNaN(startDate.getTime());
    const isEndDateValid = !isNaN(endDate.getTime());

    if (isStartDateValid && isEndDateValid) {
      const itemDateValue = new Date(itemValue).valueOf();
      if (isNaN(itemDateValue)) return false; // Если в строке не дата - не пропускаем

      return itemDateValue >= startDate.getTime() && itemDateValue <= endDate.getTime();
    }

    // Проверка, является ли диапазон числами
    const startNum = parseFloat(startStr);
    const endNum = parseFloat(endStr);

    if (!isNaN(startNum) && !isNaN(endNum)) {
      const itemNum = parseFloat(itemValue);
      if (isNaN(itemNum)) return false; // Если в строке не число - не пропускаем

      return itemNum >= startNum && itemNum <= endNum;
    }

    return false; // Если не дата и не число - between не работает
  }

  // 5. Проверка на дату (для остальных операторов сравнения)
  const dateValue = new Date(value);
  if (!isNaN(dateValue.getTime()) && containsLetters) { // containsLetters отсекает чистые числа, чтобы new Date(123) не стало датой
    const itemDateValue = new Date(item[column as string]).valueOf();
    if (operator === "equal") return itemDateValue === dateValue.valueOf();
    else if (operator === "notEqual") return itemDateValue !== dateValue.valueOf();
    else if (operator === "lessThan") return itemDateValue < dateValue.valueOf();
    else if (operator === "lessThanEqual") return itemDateValue <= dateValue.valueOf();
    else if (operator === "greaterThan") return itemDateValue > dateValue.valueOf();
    else if (operator === "greaterThanEqual") return itemDateValue >= dateValue.valueOf();
  }

  // 6. Проверка на строку
  if (typeof value === "string" && containsLetters) {
    const left = String(item[column as string]).toLowerCase();
    const right = value.toLowerCase();

    if (operator === "equal") return left === right;
    else if (operator === "notEqual") return left !== right;
    else if (operator === "lessThan") return left < right;
    else if (operator === "lessThanEqual") return left <= right;
    else if (operator === "greaterThan") return left > right;
    else if (operator === "greaterThanEqual") return left >= right;
  }

  // 7. Проверка на число
  if (!isNaN(Number(value)) && !containsLetters) {
    const numericValue = parseFloat(value);
    const itemNumeric = parseFloat(item[column as string]);

    if (operator === "equal") return itemNumeric === numericValue;
    else if (operator === "notEqual") return itemNumeric !== numericValue;
    else if (operator === "lessThan") return itemNumeric < numericValue;
    else if (operator === "lessThanEqual") return itemNumeric <= numericValue;
    else if (operator === "greaterThan") return itemNumeric > numericValue;
    else if (operator === "greaterThanEqual") return itemNumeric >= numericValue;
  }

  return false;
}

function matchesRule(
  item: Item,
  rule: QueryRule | QueryRule[]
): boolean {
  // Массив условий на верхнем уровне считаем неявным AND
  if (Array.isArray(rule)) {
    return rule.every((r) => matchesRule(item, r));
  }

  if (isAndRule(rule)) {
    return rule.and.every((r) => matchesRule(item, r));
  }

  if (isOrRule(rule)) {
    return rule.or.some((r) => matchesRule(item, r));
  }

  if (isConditionRule(rule)) {
      return compareValues(
        item,
        rule.column,
        rule.operator as CompareOperator,
        rule.value
      );
  }

  throw new Error('Unknown query rule node');
}

function filterItemsByRules(
  items: Item[],
  rules?: QueryRule | QueryRule[]
): Item[] {
  if (!rules) {
    return items;
  }

  return items.filter((item) => matchesRule(item, rules));
}

function mapOperatorToQuery(
  column: string,
  operator: CompareOperator,
  value: any
): string {
  switch (operator) {
    case "isNull":
      return Query.isNull(column);
    case "isNotNull":
      return Query.isNotNull(column);
    case "search":
      return Query.search(column, value);
    case "equal":
      return Query.equal(column, value);
    case "notEqual":
      return Query.notEqual(column, value);
    case "lessThan":
      return Query.lessThan(column, value);
    case "lessThanEqual":
      return Query.lessThanEqual(column, value);
    case "greaterThan":
      return Query.greaterThan(column, value);
    case "greaterThanEqual":
      return Query.greaterThanEqual(column, value);
    case "between":
      const rangeValues = String(value).split(",").map(v => v.trim());
      if (rangeValues.length !== 2) throw new Error(`Incorrect value: ${value}`);
      const [startStr, endStr] = rangeValues;
      return Query.between(column, startStr, endStr);
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

/**
 * Рекурсивная функция для построения строки запроса Appwrite
 */
function buildAppwriteQuery(
  rule: QueryRule | QueryRule[]
): string | string[] {
  // Массив условий на верхнем уровне считаем неявным AND
  // Appwrite принимает массив строк на верхнем уровне, они применяются как AND
  if (Array.isArray(rule)) {
    return rule.map((r) => buildAppwriteQuery(r)).flat() as string[];
  }

  if (isAndRule(rule)) {
    // Склеиваем все вложенные правила в массив строк и оборачиваем в Query.and()
    const queries = rule.and.map((r) => buildAppwriteQuery(r)).flat() as string[];
    return Query.and(queries);
  }

  if (isOrRule(rule)) {
    // Склеиваем все вложенные правила в массив строк и оборачиваем в Query.or()
    const queries = rule.or.map((r) => buildAppwriteQuery(r)).flat() as string[];
    return Query.or(queries);
  }

  if (isConditionRule(rule)) {
    // Базовое условие превращается в одну строку запроса
    return mapOperatorToQuery(
      rule.column,
      rule.operator as CompareOperator,
      rule.value
    );
  }

  throw new Error("Unknown query rule node");
}

export function createAppwriteQueries(
  query: GetDataQuery
): string[] {
  const result: string[] = [];

  if (query?.columns && query.columns.length > 0) {
    result.push(Query.select(query.columns));
  }

  if (query?.rules) {
    const rulesQuery = buildAppwriteQuery(query.rules as QueryRule[]);
    if (Array.isArray(rulesQuery)) {
      result.push(...rulesQuery);
    } else {
      result.push(rulesQuery);
    }
  }

  if (query?.order) {
    query.order.forEach((item) => {
      switch (item.type) {
        case "asc":
          result.push(Query.orderAsc(item.column));
          break;
        case "desc":
          result.push(Query.orderDesc(item.column));
          break;
        case "random":
          result.push(Query.orderRandom());
          break;
      }
    });
  }

  if (query?.limit) {
    result.push(Query.limit(query.limit));
  }

  if (query?.offset) {
    result.push(Query.offset(query.offset));
  }

  return result;
}

function getSearchScore(item: Item, rule: QueryRule | QueryRule[]): number {
  // Массив условий (неявный AND)
  if (Array.isArray(rule)) {
    return rule.reduce((sum, r) => sum + getSearchScore(item, r), 0);
  }

  if (isAndRule(rule)) {
    // Для AND складываем индексы всех совпадений
    return rule.and.reduce((sum, r) => sum + getSearchScore(item, r), 0);
  }

  if (isOrRule(rule)) {
    // Для OR берем индекс самого раннего совпадения (Math.min)
    const scores = rule.or.map((r) => getSearchScore(item, r));
    return scores.length > 0 ? Math.min(...scores) : 0;
  }

  if (isConditionRule(rule)) {
    // Если это условие поиска — считаем индекс
    if (rule.operator === "search") {
      const searchQuery = String(rule.value).trim();
      if (!searchQuery) return 0;

      let fieldValue: string;
      if (Array.isArray(rule.column)) {
        fieldValue = rule.column.map((c) => String(item[c] || "")).join(" ");
      } else {
        fieldValue = String(item[rule.column] || "");
      }

      const result = matchSearch(fieldValue, searchQuery);
      // Возвращаем индекс совпадения.
      // Если совпадения нет (что странно, т.к. строка уже отфильтрована), возвращаем Infinity
      return result.match ? result.index : Infinity;
    }

    // Для других операторов (equal, less и т.д.) возвращаем 0, они не мешают сортировке
    return 0;
  }

  return 0;
}
function sortDataBySearchRelevance(data: Item[], rules: QueryRule | QueryRule[]): Item[] {
  // Быстрая проверка, есть ли вообще поиск в правилах
  const hasSearch = JSON.stringify(rules).includes('"operator": "search"');
  if (!hasSearch) return data;

  return data
    .map((item) => ({
      item,
      score: getSearchScore(item, rules) // Считаем суммарный индекс по всему дереву правил
    }))
    .sort((a, b) => a.score - b.score) // Сортируем по возрастанию: чем меньше индекс, тем выше
    .map((item) => item.item);
}

function handleListResponse(
  responseItems: Item[],
  config: GetData,
  comparableItems: Item[]
) {
  const responseItemsMap = new Map(responseItems.map((item) => [item.$id, item]));

  const missingItems = comparableItems.filter((item) => !responseItemsMap.has(item.$id));
  missingItems.forEach((item) => {
    removeItem(item, config.source, config?.cache);
  });

  responseItems.forEach((item) => {
    const filteredItem = comparableItems.find((i) => i.$id === item.$id);
    const isNew = !filteredItem;
    const hasMoreKeys = filteredItem && Object.keys(item).length > Object.keys(filteredItem).length;
    const isUpdated = filteredItem && item.$updatedAt !== filteredItem.$updatedAt;

    if (isNew || hasMoreKeys || isUpdated) {
      addItem(item, config.source, config?.cache);
    }
  });
}

export function handleSingleResponse(
  response: Item,
  config: GetData,
  result: Result
) {
  const hasMoreKeys = Object.keys(response).length > Object.keys(result).length;
  const isUpdated = response.$updatedAt !== result.$updatedAt;
  if (hasMoreKeys || isUpdated) {
    Object.keys(result).forEach(key => delete result[key]);
    Object.assign(result, response);
    addItem(response, config.source, config?.cache);
  }
}

function handleSingleError(
  err: any,
  config: GetData,
  result: Result
) {
  if (err.code === 404) {
    if (result) {
      removeItem(result, config.source, config?.cache);
    }
    Object.keys(result).forEach(key => delete result[key]);
  } else {
    console.error('Error:', err);
  }
}

const calcTotalPages = (total: number = 0, limit: number = 0): number => {
  if (limit <= 0) return 0;
  return Math.ceil(total / limit);
};

// const hashString = (str: string): string => {
//   let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
//   for (let i = 0, ch; i < str.length; i++) {
//     ch = str.charCodeAt(i);
//     h1 = Math.imul(h1 ^ ch, 2654435761);
//     h2 = Math.imul(h2 ^ ch, 1597334677);
//   }
//   h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
//   h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
//   return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
// };

// const getHistoryPageKey = (config: GetData): string => {
//   let key = `p`;

//   if (config["database-id"]) key += `_d_${config["database-id"]}`;
//   if (config["table-id"]) key += `_t_${config["table-id"]}`;
//   if (config["team-id"]) key += `_tm_${config["team-id"]}`;
//   if (config["bucket-id"]) key += `_b_${config["bucket-id"]}`;

//   if (config.query) {
//     key += `_q_${hashString(JSON.stringify(config.query))}`;
//   }

//   return key;
// };

const cleanupMap = new WeakMap<object, () => void>();
export function cleanupRealtime(result: object) {
  const unsubscribe = cleanupMap.get(result);
  if (unsubscribe) {
    unsubscribe();
    cleanupMap.delete(result);
  }
}

export function getData(getConfig: () => GetData): Result {
  let config = $derived(getConfig());

  let result = $state<Result>({});
  let serverTotal = $state<number | null>(null);

  let currentPage = $derived(config.query?.page || 1);
  const limit = $derived(config.query?.limit || 25);

  const applyFiltersAndSort = (sourceData: Item[], cfg: GetData): Item[] => {
    let processed = Array.isArray(sourceData) ? [...sourceData] : [sourceData];

    if (cfg.source === "databases") {
      processed = processed.filter((item: Item) =>
        item.$databaseId === cfg["database-id"] &&
        item.$tableId === cfg["table-id"]
      );
    }
    if (cfg.source === "team-memberships") {
      processed = processed.filter((item: Item) => item.teamId === cfg["team-id"]);
    }
    if (cfg.source === "files") {
      processed = processed.filter((item: Item) => item.bucketId === cfg["bucket-id"]);
    }

    if (cfg.query?.rules) {
      processed = filterItemsByRules(processed, cfg.query.rules as QueryRule[]);
      const hasSearchRule = JSON.stringify(cfg.query.rules).includes('"search"');
      if (hasSearchRule) {
        processed = sortDataBySearchRelevance(processed, cfg.query.rules as QueryRule[]);
      }
    }

    if (cfg.query?.order?.length) {
      const orderRules = cfg.query.order;
      const hasRandom = orderRules.some(rule => rule.type === 'random');

      if (hasRandom) {
        for (let i = processed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [processed[i], processed[j]] = [processed[j], processed[i]];
        }
      } else {
        processed.sort((a, b) => {
          for (const { column, type } of orderRules) {
            const valA = a[column];
            const valB = b[column];
            if (valA === valB) continue;
            if (valA == null) return type === 'desc' ? -1 : 1;
            if (valB == null) return type === 'desc' ? 1 : -1;

            let comparison = 0;
            const numA = Number(valA);
            const numB = Number(valB);
            const isNumA = !isNaN(numA) && valA !== '';
            const isNumB = !isNaN(numB) && valB !== '';

            if (isNumA && isNumB) {
              comparison = numA - numB;
            } else {
              const dateA = new Date(valA);
              const dateB = new Date(valB);
              const timeA = dateA.getTime();
              const timeB = dateB.getTime();
              if (!isNaN(timeA) && !isNaN(timeB)) {
                comparison = timeA - timeB;
              } else {
                comparison = String(valA).localeCompare(String(valB));
              }
            }

            if (comparison !== 0) {
              return type === 'desc' ? -comparison : comparison;
            }
          }
          return 0;
        });
      }
    }
    return processed;
  };

  const applyLimit = (sourceData: Item[], currentOffset: number, limitVal: number, cfg: GetData): Item[] => {
    if (limitVal) {
      if (cfg?.["infinite-scroll"]) {
        return sourceData.slice(0, currentOffset + limitVal);
      } else {
        return sourceData.slice(currentOffset, currentOffset + limitVal);
      }
    }
    return sourceData;
  };

  const getMasterData = (cfg: GetData) => {
    if (Object.keys(data[cfg.source][cfg.cache === "sessionStorage" ? "session" : "local"]).length === 0) {
      loadData(cfg.source, cfg?.cache);
    }
    return applyFiltersAndSort(getCacheData(cfg.source, cfg.cache || "localStorage") as Item[], cfg);
  };

  $effect(() => {
    const cfg = $state.snapshot(config);
    const page = currentPage;
    const limitVal = limit;
    const offset = (page - 1) * limitVal;

    const isListRequest = !cfg?.["row-id"] &&
      !(cfg?.["team-id"] && cfg.source === "teams") &&
      !(cfg?.["team-id"] && cfg?.["membership-id"]) &&
      !cfg?.["file-id"] &&
      cfg.source !== "user-account";

    if (isListRequest) {
      untrack(() => {
        const masterData = getMasterData(cfg);
        result.items = applyLimit(masterData, offset, limitVal, cfg);
        result.total = serverTotal ?? masterData.length;
        result.totalPages = calcTotalPages(result.total, limitVal);
        result.page = page;
      });
    } else {
      untrack(() => {
        if (cfg.source === "user-account") {
          const item = getMasterData(cfg).find((i: Item) => i);
          if (Object.keys(item || {}).length > 0) Object.assign(result, item);
        } else {
          const searchId = cfg["row-id"]
            || (cfg.source === "teams" ? cfg["team-id"] : null)
            || cfg["membership-id"]
            || cfg["file-id"];
          const item = getMasterData(cfg).find((i: Item) => i.$id === searchId);
          if (item) Object.assign(result, item);
        }
      });
    }

    if (!networkState.isOnline || !networkState.isBackendAvailable) return;

    untrack(() => {
      const queries = createAppwriteQueries({ ...cfg.query, offset, limit: limitVal });

      const handleFetch = async () => {
        if (Object.keys(result).length === 0 || (result.items && result.items.length === 0)) {
          result.isLoading = true;
          loadingState.start();
        }

        try {
          let responseItems: Item[] = [];
          let responseTotal = 0;

          switch (cfg.source) {
            case "databases":
              if (cfg?.["row-id"]) {
                const response = await tablesDB.getRow({ databaseId: cfg["database-id"] || "", tableId: cfg["table-id"] || "", rowId: cfg["row-id"], queries });
                handleSingleResponse(structuredClone(response), cfg, result);
              } else {
                const response = await tablesDB.listRows({ databaseId: cfg["database-id"] || "", tableId: cfg["table-id"] || "", queries, ttl: 0 });
                responseItems = response.rows.map(item => structuredClone(item));
                responseTotal = response.total;
              }
              break;
            case "teams":
              if (cfg?.["team-id"]) {
                const response = await teams.get({ teamId: cfg["team-id"] });
                handleSingleResponse(structuredClone(response), cfg, result);
              } else {
                const response = await teams.list({ queries });
                responseItems = response.teams.map(item => structuredClone(item));
                responseTotal = response.total;
              }
              break;
            case "team-memberships":
              if (cfg?.["team-id"] && cfg?.["membership-id"]) {
                const response = await teams.getMembership({ teamId: cfg["team-id"], membershipId: cfg["membership-id"] });
                handleSingleResponse(structuredClone(response), cfg, result);
              } else {
                const response = await teams.listMemberships({ teamId: cfg["team-id"] || "", queries });
                responseItems = response.memberships.map(item => structuredClone(item));
                responseTotal = response.total;
              }
              break;
            case "user-account":
              getAccount(result.isLoading, cfg, result);
              break;
            case "files":
              if (cfg?.["file-id"]) {
                const response = await storage.getFile({ bucketId: cfg["bucket-id"] || "", fileId: cfg["file-id"] });
                handleSingleResponse(structuredClone(response), cfg, result);
              } else {
                const response = await storage.listFiles({ bucketId: cfg["bucket-id"] || "", queries });
                responseItems = response.files.map(item => structuredClone(item));
                responseTotal = response.total;
              }
              break;
          }

          const isListRequest = !cfg?.["row-id"] &&
            !(cfg?.["team-id"] && cfg.source === "teams") &&
            !(cfg?.["team-id"] && cfg?.["membership-id"]) &&
            !cfg?.["file-id"] &&
            cfg.source !== "user-account";

          if (isListRequest) {
            serverTotal = responseTotal;
            const masterData = getMasterData(cfg);
            const comparableItems = masterData.slice(offset, offset + limitVal);

            handleListResponse(responseItems, cfg, comparableItems);

            if (cfg?.["infinite-scroll"]) {
              const existingItems = result.items || [];
              const combinedMap = new Map(existingItems.map((item) => [item.$id, item]));
              responseItems.forEach(item => combinedMap.set(item.$id, item));
              result.items = Array.from(combinedMap.values());
            } else {
              result.items = responseItems;
            }

            result.total = responseTotal;
            result.totalPages = calcTotalPages(responseTotal, limitVal);
          }

        } catch (err: any) {
          if (result.isLoading) {
            result.isLoading = false;
            loadingState.stop();
          }
          if (err.code) {
            console.error('Error:', err);
            handleSingleError(err, cfg, result);
          } else {
            networkState.markBackendUnavailable();
          }
        } finally {
          if (result.isLoading) {
            result.isLoading = false;
            loadingState.stop();
          }
        }
      };

      handleFetch();
    });
  });

  $effect(() => {
    const cfg = $state.snapshot(config);
    if (!cfg?.realtime || !networkState.isOnline || !networkState.isBackendAvailable) {
      return;
    }

    let channels: string[] = [];

    switch (cfg.source) {
      case "databases":
        if (cfg["database-id"] && cfg["table-id"]) {
          if (cfg["row-id"]) channels.push(`databases.${cfg["database-id"]}.tables.${cfg["table-id"]}.rows.${cfg["row-id"]}`);
          else channels.push(`databases.${cfg["database-id"]}.tables.${cfg["table-id"]}.rows`);
        }
        break;
      case "teams":
        channels.push(cfg["team-id"] ? `teams.${cfg["team-id"]}` : `teams`);
        break;
      case "team-memberships":
        if (cfg["team-id"]) channels.push(cfg["membership-id"] ? `teams.${cfg["team-id"]}.memberships.${cfg["membership-id"]}` : `teams.${cfg["team-id"]}.memberships`);
        break;
      case "user-account":
        channels.push(`account`);
        break;
      case "files":
        if (cfg["file-id"]) channels.push(`buckets.${cfg["bucket-id"]}.files.${cfg["file-id"]}`);
        else channels.push(`buckets.${cfg["bucket-id"]}.files`);
        break;
    }

    if (channels.length > 0) {
      const unsubscribe = realtime.subscribe(channels, (response) => {
        const payload = structuredClone(response.payload) as Item;
        const events = response.events as string[];

        const isDelete = events.some(e => e.endsWith('.delete'));
        const isCreate = events.some(e => e.endsWith('.create'));
        const isUpdate = events.some(e => e.endsWith('.update'));

        const isSingleRequest = !!cfg["row-id"] ||
          (cfg.source === "teams" && !!cfg["team-id"]) ||
          (cfg.source === "team-memberships" && !!cfg["membership-id"]) ||
          cfg.source === "user-account";

        untrack(() => {
          if (isSingleRequest) {
            if (isDelete) {
              removeItem(payload, cfg.source, cfg?.cache);
              Object.keys(result).forEach(key => delete result[key]);
            } else {
              addItem(payload, cfg.source, cfg?.cache);
              Object.keys(result).forEach(key => delete result[key]);
              Object.assign(result, payload);
            }
          } else {
            if (isCreate) {
              if (serverTotal !== null) serverTotal += 1;
              addItem(payload, cfg.source, cfg?.cache);
            } else if (isUpdate) {
              addItem(payload, cfg.source, cfg?.cache);
            } else if (isDelete) {
              if (serverTotal !== null) serverTotal -= 1;
              removeItem(payload, cfg.source, cfg?.cache);
            }

            const masterData = getMasterData(cfg);
            const currentOffset = cfg?.["infinite-scroll"] ? 0 : (currentPage - 1) * limit;
            result.items = applyLimit(masterData, currentOffset, limit, cfg);
            result.total = serverTotal ?? masterData.length;
            result.totalPages = calcTotalPages(result.total, limit);
          }
        });
      }) as any;

      return () => {
        if (typeof unsubscribe.then === 'function') {
          unsubscribe.then((sub: any) => {
            if (typeof sub === 'function') sub();
            else if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
            else if (sub && typeof sub.close === 'function') sub.close();
          });
        } else if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  });

  return result;
}
