import { appConfig } from "../generated/appConfig";
import { networkState } from "../stores/networkState.svelte";
import { loadingState } from "../stores/loadingState.svelte";
import { notifications } from "../stores/notifications.svelte";
import type { GetData, Result } from "./getData.svelte";
import { removeItem, handleSingleResponse } from "./getData.svelte";

import { Client, Teams, Account } from "appwrite";

const endpoint = appConfig?.integrations?.appwrite?.endpoint || null;
const projectId = appConfig?.integrations?.appwrite?.projectId || null;
const anonymousSession = appConfig?.integrations?.appwrite?.anonymousSession || null;

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

const teams = new Teams(client);
const account = new Account(client);

/** Очищает URL от query параметров */
export function cleanUrlParams(): void {
  const state = window.history.state || {};
  window.history.replaceState(
    {
      ...state,
      date: state.date || new Date().toISOString(),
      link: state.link || window.location.pathname,
      frame: state.frame || "",
      animation: state.animation || "instant",
      direction: state.direction || "left",
      easing: state.easing || "ease-out",
      duration: state.duration || 300,
    },
    null as any,
    window.location.pathname
  );
}

/** Сбрасывает объект result и кэш */
function resetResultAndCache(result: Result, config: GetData) {
  Object.keys(result).forEach((key) => delete result[key]);
  removeItem({}, config.source, config?.cache);
}

/** Универсальный обработчик ошибок */
function handleApiError(err: any, isLoading: boolean) {
  if (isLoading) loadingState.stop();
  if (err.code === 429) {
    networkState.markRateLimited(3600000);
  } else if (err.code) {
    console.error("Error:", err);
  } else {
    networkState.markBackendUnavailable();
  }
}

/** Безопасное удаление текущей сессии */
export async function safeDeleteCurrentSession() {
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch (err: any) {
    // Если ошибка 429 или нет сети — прерываем выполнение (пробрасываем наверх)
    if (err.code === 429 || !err.code) throw err;
    // Остальные ошибки (например, 401, когда сессии и так нет) — игнорируем
  }
}

// --- Основная функция ---

export async function getAccount(isLoading: boolean, config: GetData, result: Result) {
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("type");
  const userId = urlParams.get("userId");
  const secret = urlParams.get("secret");
  const expire = urlParams.get("expire");
  const membershipId = urlParams.get("membershipId");
  const teamId = urlParams.get("teamId");

  // 1. Проверка истечения срока ссылки
  if (expire && new Date(expire) < new Date()) {
    if (isLoading) loadingState.stop();
    console.error("The link has expired");
    notifications.add({
      type: "error",
      message: { ru: "Срок действия ссылки истёк", en: "Link has expired" },
      duration: 4000,
    });
    cleanUrlParams();
    return;
  }

  // 2. Magic / Phone авторизация
  if ((type === "magic" || type === "phone" || type === "oauth") && userId && secret) {
    if (result.$id === userId) {
      if (isLoading) loadingState.stop();
      cleanUrlParams();
      return;
    }

    resetResultAndCache(result, config);

    try {
      await safeDeleteCurrentSession();
      await account.createSession({ userId, secret });
      const response = await account.get();

      if (isLoading) loadingState.stop();
      handleSingleResponse(structuredClone(response), config, result);
      cleanUrlParams();
    } catch (err: any) {
      handleApiError(err, isLoading);
      throw err;
    }
    return;
  }

  // 3. Инвайт в команду
  if (type === "invite" && userId && secret && membershipId && teamId) {
    resetResultAndCache(result, config);

    try {
      await safeDeleteCurrentSession();
      await teams.updateMembershipStatus({ teamId, membershipId, userId, secret });
      const response = await account.get();

      if (isLoading) loadingState.stop();
      handleSingleResponse(structuredClone(response), config, result);
      cleanUrlParams();
    } catch (err: any) {
      handleApiError(err, isLoading);
      throw err;
    }
    return;
  }

  // 4. Верификация Email
  if (type === "verify" && userId && secret) {
    try {
      await account.updateEmailVerification({ userId, secret });
      const response = await account.get();

      if (isLoading) loadingState.stop();
      handleSingleResponse(structuredClone(response), config, result);
      cleanUrlParams(); // Добавил очистку URL, которой не хватало
    } catch (err: any) {
      handleApiError(err, isLoading);
      throw err;
    }
    return;
  }

  // 5. Обычный запрос аккаунта (без URL параметров)
  if (!type) {
    try {
      const response = await account.get();
      if (isLoading) loadingState.stop();
      handleSingleResponse(structuredClone(response), config, result);
    } catch (err: any) {
      if (isLoading) loadingState.stop();

      if (err.code === 401) {
        resetResultAndCache(result, config);

        if (anonymousSession) {
          try {
            await account.createAnonymousSession();
            const response = await account.get();
            handleSingleResponse(structuredClone(response), config, result);
            return;
          } catch (innerErr: any) {
            handleApiError(innerErr, false);
            throw innerErr;
          }
        }

        throw err;
      }

      handleApiError(err, false);
      throw err;
    }
  }
}
