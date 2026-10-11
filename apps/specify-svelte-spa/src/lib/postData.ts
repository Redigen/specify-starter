import { appConfig } from "../generated/appConfig";
import { networkState } from "../stores/networkState.svelte";
import { loadingState } from "../stores/loadingState.svelte";
import { addItem, removeItem, getCacheData } from "./getData.svelte";
import type { Item } from "./getData.svelte";
import { syncQueue } from "../stores/syncQueue.svelte";
import { safeDeleteCurrentSession, cleanUrlParams } from "./getAccount";

const endpoint = appConfig.integrations?.appwrite?.endpoint || null;
const projectId = appConfig.integrations?.appwrite?.projectId || null;

import { Client, TablesDB, Account, OAuthProvider, Teams, ID, Permission, Role, Storage } from "appwrite";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const tablesDB = new TablesDB(client);
const teams = new Teams(client);
const account = new Account(client);
const storage = new Storage(client);

type Cache = "localStorage" | "sessionStorage";
type Source = "databases" | "user-account" | "teams" | "team-memberships" | "files";
type Operations =
  // databases
  "create-row" |
  "update-row" |
  "upsert-row" |
  "delete-row" |
  "increment-column" |
  "decrement-column" |
  // user-account
  "signup-email-password" |
  "login-email-password" |
  "login-oauth" |
  "login-magic-link" |
  "login-email-otp-request" |
  "login-email-otp-confirm" |
  "login-phone-otp-request" |
  "login-phone-otp-confirm" |
  "logout" |
  "logout-all" |
  "block-account" |
  "change-email" |
  "change-name" |
  "change-password" |
  "change-phone" |
  "update-preferences" |
  "reset-password-request" |
  "reset-password-confirm" |
  "verify-email-request" |
  "verify-phone-request" |
  "verify-phone-confirm" |
  // teams
  "create-team" |
  "change-name" |
  "update-preferences" |
  "delete-team" |
  // team-memberships
  "create-membership" |
  "change-roles" |
  "delete-membership" |
  // storage
  "upload-file" |
  "upload-files" |
  "change-name" |
  "change-permissions" |
  "delete-file"
  ;

interface PermissionRoles {
  "user-id"?: string;
  "team-id"?: string;
  "team-membership-id"?: string;
  "label-id"?: string;
}

type PermissionStringTargets = "any" | "guests" | "verified-users" | "unverified-users";
type PermissionTargets = PermissionStringTargets | PermissionRoles;

interface PermissionActions {
  read?: PermissionTargets[];
  update?: PermissionTargets[];
  delete?: PermissionTargets[];
}

export interface PostData {
  source: Source;
  operation: Operations;
  "database-id"?: string;
  "table-id"?: string;
  "row-id"?: string;
  columns?: Record<string, any>;
  column?: string;
  value?: number;
  min?: number;
  max?: number;
  permissions?: PermissionActions;
  "user-id"?: string;
  secret?: string;
  email?: string;
  phone?: string;
  password?: string;
  "old-password"?: string;
  name?: string;
  prefs?: Record<string, any>;
  provider?: "Amazon" | "Apple" | "Auth0" | "Authentik" | "Autodesk" | "Bitbucket" | "Bitly" | "Box" | "Dailymotion" | "Discord" | "Disqus" | "Dropbox" | "Etsy" | "Facebook" | "Figma" | "Fusionauth" | "Github" | "Gitlab" | "Google" | "Keycloak" | "Kick" | "Linkedin" | "Microsoft" | "Notion" | "Oidc" | "Okta" | "Paypal" | "PaypalSandbox" | "Podio" | "Salesforce" | "Slack" | "Spotify" | "Stripe" | "Tradeshift" | "TradeshiftBox" | "Twitch" | "Wordpress" | "X" | "Yahoo" | "Yammer" | "Yandex" | "Zoho" | "Zoom";
  "success-url"?: string;
  "failure-url"?: string;
  "url"?: string;
  "team-id"?: string;
  roles?: string[];
  "membership-id"?: string;
  "bucket-id"?: string;
  "file-id"?: string;
  "file"?: File;
  "files"?: FileList;
  cache?: Cache;
  success?: any;
  error?: any;
  $createdAt?: Date;
  $updatedAt?: Date;
  isPendingTask?: boolean;
}

const providerMap = {
  "Amazon": OAuthProvider.Amazon,
  "Apple": OAuthProvider.Apple,
  "Auth0": OAuthProvider.Auth0,
  "Authentik": OAuthProvider.Authentik,
  "Autodesk": OAuthProvider.Autodesk,
  "Bitbucket": OAuthProvider.Bitbucket,
  "Bitly": OAuthProvider.Bitly,
  "Box": OAuthProvider.Box,
  "Dailymotion": OAuthProvider.Dailymotion,
  "Discord": OAuthProvider.Discord,
  "Disqus": OAuthProvider.Disqus,
  "Dropbox": OAuthProvider.Dropbox,
  "Etsy": OAuthProvider.Etsy,
  "Facebook": OAuthProvider.Facebook,
  "Figma": OAuthProvider.Figma,
  "Fusionauth": OAuthProvider.Fusionauth,
  "Github": OAuthProvider.Github,
  "Gitlab": OAuthProvider.Gitlab,
  "Google": OAuthProvider.Google,
  "Keycloak": OAuthProvider.Keycloak,
  "Kick": OAuthProvider.Kick,
  "Linkedin": OAuthProvider.Linkedin,
  "Microsoft": OAuthProvider.Microsoft,
  "Notion": OAuthProvider.Notion,
  "Oidc": OAuthProvider.Oidc,
  "Okta": OAuthProvider.Okta,
  "Paypal": OAuthProvider.Paypal,
  "PaypalSandbox": OAuthProvider.PaypalSandbox,
  "Podio": OAuthProvider.Podio,
  "Salesforce": OAuthProvider.Salesforce,
  "Slack": OAuthProvider.Slack,
  "Spotify": OAuthProvider.Spotify,
  "Stripe": OAuthProvider.Stripe,
  "Tradeshift": OAuthProvider.Tradeshift,
  "TradeshiftBox": OAuthProvider.TradeshiftBox,
  "Twitch": OAuthProvider.Twitch,
  "Wordpress": OAuthProvider.Wordpress,
  "X": OAuthProvider.X,
  "Yahoo": OAuthProvider.Yahoo,
  "Yammer": OAuthProvider.Yammer,
  "Yandex": OAuthProvider.Yandex,
  "Zoho": OAuthProvider.Zoho,
  "Zoom": OAuthProvider.Zoom,
};

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (/^\d/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

const resolveRole = (target: PermissionTargets): string | null => {
  if (typeof target === "string") {
    switch (target) {
      case "any": return Role.any();
      case "guests": return Role.guests();
      case "verified-users": return Role.users("verified");
      case "unverified-users": return Role.users("unverified");
      default: return null;
    }
  }

  if (target["user-id"]) return Role.user(target["user-id"]);
  if (target["team-id"]) return Role.team(target["team-id"]);
  if (target["team-membership-id"]) return Role.member(target["team-membership-id"]);
  if (target["label-id"]) return Role.label(target["label-id"]);

  return null;
};

const buildPermissions = (config: { permissions?: PermissionActions }): string[] => {
  const permissions: string[] = [];
  if (!config.permissions) return permissions;

  const actionMap: Record<keyof PermissionActions, (role: string) => string> = {
    read: Permission.read,
    update: Permission.update,
    delete: Permission.delete,
  };

  (Object.keys(config.permissions) as Array<keyof PermissionActions>).forEach((action) => {
    const targets = config.permissions![action];
    if (!targets) return;

    const permissionFn = actionMap[action];

    for (const target of targets) {
      const role = resolveRole(target);
      if (role) {
        permissions.push(permissionFn(role));
      }
    }
  });

  return permissions;
};

export async function postData(config: PostData): Promise<any> {
  const permissions = buildPermissions(config);
  const isPendingTask = config.isPendingTask || false;

  switch (config.source) {
    case "databases":
      if (config.operation === "create-row" || config.operation === "update-row" || config.operation === "upsert-row") {
        if (!config["database-id"]) throw new Error("database-id is required");
        if (!config["table-id"]) throw new Error("table-id is required");
        if (!config["row-id"] && config.operation !== "create-row") throw new Error("row-id is required");

        const databaseId = config["database-id"];
        const tableId = config["table-id"];
        const rowId = config["row-id"] || ID.unique();
        const row = {
          $databaseId: databaseId,
          $tableId: tableId,
          $id: rowId,
          ...config.columns,
          $createdAt: config.$createdAt || new Date().toISOString().replace('Z', '+00:00'),
          $updatedAt: new Date().toISOString().replace('Z', '+00:00'),
          $permissions: permissions
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            let response: Record<string, any> = {};
            if (config.operation === "create-row") {
              response = await tablesDB.createRow({
                databaseId,
                tableId,
                rowId,
                data: config.columns || {},
                permissions,
              });
            } else if (config.operation === "update-row") {
              response = await tablesDB.updateRow({
                databaseId,
                tableId,
                rowId,
                data: config.columns || {},
                permissions,
              });
            } else if (config.operation === "upsert-row") {
              response = await tablesDB.upsertRow({
                databaseId,
                tableId,
                rowId,
                data: config.columns || {},
                permissions,
              });
            }
            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(60000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(row, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(row, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "delete-row") {
        if (!config["database-id"]) throw new Error("database-id is required");
        if (!config["table-id"]) throw new Error("table-id is required");
        if (!config["row-id"]) throw new Error("row-id is required");

        const databaseId = config["database-id"];
        const tableId = config["table-id"];
        const rowId = config["row-id"];
        const row = {
          $databaseId: databaseId,
          $tableId: tableId,
          $id: rowId
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await tablesDB.deleteRow({
              databaseId,
              tableId,
              rowId,
            });

            loadingState.stop();
            removeItem(row, config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(60000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              removeItem(row, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            removeItem(row, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "increment-column" || config.operation === "decrement-column") {
        if (!config["database-id"]) throw new Error("database-id is required");
        if (!config["table-id"]) throw new Error("table-id is required");
        if (!config["row-id"]) throw new Error("row-id is required");
        if (!config.column) throw new Error("column is required");

        const databaseId = config["database-id"];
        const tableId = config["table-id"];
        const rowId = config["row-id"];
        const column = config.column;
        const value = Number(config.value) || 1;
        const min = config.min !== undefined ? Number(config.min) : undefined;
        const max = config.max !== undefined ? Number(config.max) : undefined;

        const cacheData = getCacheData(config.source, config.cache || "localStorage");
        const row = cacheData.find((item: Item) =>
          item.$databaseId === databaseId &&
          item.$tableId === tableId &&
          item.$id === rowId
        );

        if (row && !isPendingTask) {
          const currentValue = Number(row[column]) || 0;

          let newValue = config.operation === "increment-column"
            ? currentValue + value
            : currentValue - value;

          if (min !== undefined) {
            newValue = Math.max(min, newValue);
          }
          if (max !== undefined) {
            newValue = Math.min(max, newValue);
          }

          row[column] = newValue;
          row.$updatedAt = new Date().toISOString().replace('Z', '+00:00');
        }

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            let response: Record<string, any> = {};
            if (config.operation === "increment-column") {
              response = await tablesDB.incrementRowColumn({
                databaseId,
                tableId,
                rowId,
                column,
                value,
                max
              });
            } else if (config.operation === "decrement-column") {
              response = await tablesDB.decrementRowColumn({
                databaseId,
                tableId,
                rowId,
                column,
                value,
                min
              });
            }

            loadingState.stop();
            // fix appwrite bug
            if (!response.$databaseId) response.$databaseId = databaseId;
            if (!response.$tableId) response.$tableId = tableId;
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(60000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(row, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(row, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }
      break;
    case "user-account":
      if (config.operation === "signup-email-password") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.email) throw new Error("email is required");
        if (!config.password) throw new Error("password is required");

        const userId = config["user-id"] || ID.unique();
        const email = config.email;
        const password = config.password;
        const name = config.name || undefined;

        loadingState.start();
        try {
          const response = await account.create({
            userId,
            email,
            password,
            name
          });

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "login-email-password") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.email) throw new Error("email is required");
        if (!config.password) throw new Error("password is required");

        const email = config.email;
        const password = config.password;

        loadingState.start();
        try {
          try {
            await account.deleteSession({ sessionId: "current" });
          } catch { }

          await account.createEmailPasswordSession({
            email,
            password
          });

          const response = await account.get();

          loadingState.stop();
          addItem(structuredClone(response), config.source, config?.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "login-oauth") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.provider) throw new Error("provider is required");

        const providerName = config.provider;
        const provider = providerMap[providerName];
        const success = `${config["success-url"]}?type=oauth` || `${window.location.href}??type=oauth`;
        const failure = config["failure-url"] || window.location.href;

        account.createOAuth2Token({
          provider,
          success,
          failure
        });
        return {};
      }

      if (config.operation === "login-magic-link") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.email) throw new Error("email is required");

        const userId = config["user-id"] || ID.unique();
        const email = config.email;
        const url = `${config.url}?type=magic` || `${window.location.href}?type=magic`;

        loadingState.start();
        try {
          const response = await account.createMagicURLToken({
            userId,
            email,
            url
          });

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "login-email-otp-request") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.email) throw new Error("email is required");

        const userId = config["user-id"] || ID.unique();
        const email = config.email;

        loadingState.start();
        try {
          const response = await account.createEmailToken({
            userId,
            email
          });

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "login-phone-otp-request") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.phone) throw new Error("phone is required");

        const userId = config["user-id"] || ID.unique();
        const phone = cleanPhone(config.phone);

        loadingState.start();
        try {
          const response = await account.createPhoneToken({
            userId,
            phone
          });

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "login-email-otp-confirm" || config.operation === "login-phone-otp-confirm") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config["user-id"]) throw new Error("user-id is required");
        if (!config.secret) throw new Error("secret is required");

        const userId = config["user-id"];
        const secret = config.secret;

        loadingState.start();
        try {
          await safeDeleteCurrentSession();
          await account.createSession({ userId, secret });
          const response = await account.get();

          loadingState.stop();
          addItem(structuredClone(response), config.source, config?.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "logout") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");

        loadingState.start();
        try {
          const response = await account.deleteSession({ sessionId: "current" });

          loadingState.stop();
          removeItem({}, config.source, config?.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "logout-all") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");

        loadingState.start();
        try {
          const response = await account.deleteSessions();

          loadingState.stop();
          removeItem({}, config.source, config?.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "block-account") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");

        loadingState.start();
        try {
          const response = await account.updateStatus();

          loadingState.stop();
          removeItem({}, config.source, config?.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "change-email") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.email) throw new Error("email is required");
        if (!config.password) throw new Error("password is required");

        const email = config.email;
        const password = config.password;

        loadingState.start();
        try {
          const response = await account.updateEmail({ email, password });

          loadingState.stop();
          addItem(structuredClone(response), config.source, config.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "change-name") {
        if (!config.name) throw new Error("name is required");

        const name = config.name;
        const user = {
          name,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await account.updateName({ name });
            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(user, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(user, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "change-password") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.password) throw new Error("password is required");

        const password = config.password;
        const oldPassword = config["old-password"] || undefined;

        loadingState.start();
        try {
          const response = await account.updatePassword({ password, oldPassword });

          loadingState.stop();
          addItem(structuredClone(response), config.source, config.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(60000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "change-phone") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.phone) throw new Error("phone is required");
        if (!config.password) throw new Error("password is required");

        const phone = cleanPhone(config.phone);
        const password = config.password;

        loadingState.start();
        try {
          const response = await account.updatePhone({ phone, password });

          loadingState.stop();
          addItem(structuredClone(response), config.source, config.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(60000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "update-preferences") {
        if (!config.prefs) throw new Error("prefs is required");

        const prefs = config.prefs;
        const user = {
          prefs: prefs,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await account.updatePrefs({ prefs });
            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(user, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(user, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "reset-password-request") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.email) throw new Error("email is required");

        const email = config.email;
        const url = `${config.url}?type=reset` || `${window.location.href}?type=reset`;

        loadingState.start();
        try {
          const response = await account.createRecovery({ email, url });

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "reset-password-confirm") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config.password) throw new Error("password is required");

        const urlParams = new URLSearchParams(window.location.search);
        const userId = config["user-id"] || urlParams.get("userId") || '';
        const secret = config.secret || urlParams.get("secret") || '';
        const password = config.password;

        loadingState.start();
        try {
          const response = await account.updateRecovery({ userId, secret, password });

          loadingState.stop();
          cleanUrlParams();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          cleanUrlParams();
          throw err;
        }
      }

      if (config.operation === "verify-email-request") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");

        const url = `${config.url}?type=verify` || `${window.location.href}?type=verify`;

        loadingState.start();
        try {
          const response = await account.createEmailVerification({ url });

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "verify-phone-request") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");

        loadingState.start();
        try {
          const response = await account.createPhoneVerification();

          loadingState.stop();
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "verify-phone-confirm") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config["user-id"]) throw new Error("user-id is required");
        if (!config.secret) throw new Error("secret is required");

        const userId = config["user-id"];
        const secret = config.secret;

        loadingState.start();
        try {
          const response = await account.updatePhoneVerification({ userId, secret });

          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }
      break;
    case "teams":
      if (config.operation === "create-team") {
        if (!config.name) throw new Error("name is required");

        const teamId = config["team-id"] || ID.unique();
        const name = config.name;
        const roles = config.roles || [];

        const team = {
          $id: teamId,
          name: name,
          $createdAt: config.$createdAt || new Date().toISOString().replace('Z', '+00:00'),
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await teams.create({ teamId, name, roles: roles });

            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(60000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(team, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(team, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "change-name") {
        if (!config["team-id"]) throw new Error("team-id is required");
        if (!config.name) throw new Error("name is required");

        const teamId = config["team-id"];
        const name = config.name;

        const team = {
          $id: teamId,
          name: name,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await teams.updateName({ teamId, name });

            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(team, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(team, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "update-preferences") {
        if (!config["team-id"]) throw new Error("team-id is required");
        if (!config.prefs) throw new Error("prefs is required");

        const teamId = config["team-id"];
        const prefs = config.prefs;
        const team = {
          $id: teamId,
          prefs: prefs,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await teams.updatePrefs({ teamId, prefs });

            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(team, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(team, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "delete-team") {
        if (!config["team-id"]) throw new Error("team-id is required");

        const teamId = config["team-id"];

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await teams.delete({ teamId });

            loadingState.stop();
            removeItem({ $id: teamId }, config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(60000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              removeItem({ $id: teamId }, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            removeItem({ $id: teamId }, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }
      break;
    case "team-memberships":
      if (config.operation === "create-membership") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config["team-id"]) throw new Error("team-id is required");

        const teamId = config["team-id"];
        const roles = config.roles || [];
        const email = config.email || undefined;
        const userId = config["user-id"] || undefined;
        const phone = config.phone || undefined;
        const url = `${config.url}?type=invite` || `${window.location.href}?type=invite`;
        const name = config.name || undefined;

        loadingState.start();
        try {
          const response = await teams.createMembership({ teamId, roles, email, userId, phone, url, name });

          loadingState.stop();
          addItem(structuredClone(response), config.source, config.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(3600000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "change-roles") {
        if (!config["team-id"]) throw new Error("team-id is required");
        if (!config["membership-id"]) throw new Error("membership-id is required");
        if (!config.roles) throw new Error("roles is required");

        const teamId = config["team-id"];
        const membershipId = config["membership-id"];
        const roles = config.roles;

        const membership = {
          teamId: teamId,
          $id: membershipId,
          roles: roles,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await teams.updateMembership({ teamId, membershipId, roles });

            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(3600000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(membership, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(membership, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "delete-membership") {
        if (!config["team-id"]) throw new Error("team-id is required");
        if (!config["membership-id"]) throw new Error("membership-id is required");

        const teamId = config["team-id"];
        const membershipId = config["membership-id"];

        const membership = {
          teamId: teamId,
          $id: membershipId
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await teams.deleteMembership({ teamId, membershipId });

            loadingState.stop();
            removeItem(membership, config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(3600000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(membership, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(membership, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }
      break;
    case "files":
      if (config.operation === "upload-file") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config["bucket-id"]) throw new Error("bucket-id is required");
        if (!config.file || !(config.file instanceof File)) {
          throw new Error("config.file must be a single File instance");
        }

        const bucketId = config["bucket-id"];
        const fileId = config["file-id"] || ID.unique();
        const file = config.file;

        loadingState.start();
        try {
          // === FIX SAFARI (Content-Length: 0) ===
          const arrayBuffer = await file.arrayBuffer();
          const safeFile = new File([arrayBuffer], file.name, { type: file.type });

          const response = await storage.createFile({ bucketId, fileId, file: safeFile, permissions });

          loadingState.stop();
          addItem(structuredClone(response), config.source, config.cache);
          return response;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(60000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "upload-files") {
        if (!networkState.isBackendAvailable) throw new Error("Server unavailable");
        if (!config["bucket-id"]) throw new Error("bucket-id is required");

        const bucketId = config["bucket-id"];
        let files: File[];
        if (config.files instanceof FileList || Array.isArray(config.files)) {
          files = Array.from(config.files);
        } else {
          throw new Error("config.file must be a FileList or an Array of Files");
        }
        if (files.length === 0) throw new Error("files are required");

        loadingState.start();
        const responses = [];
        try {
          for (const file of files) {
            const fileId = ID.unique();

            // === FIX SAFARI (Content-Length: 0) ===
            const arrayBuffer = await file.arrayBuffer();
            const safeFile = new File([arrayBuffer], file.name, { type: file.type });

            const response = await storage.createFile({ bucketId, fileId, file: safeFile, permissions });
            addItem(structuredClone(response), config.source, config.cache);
            responses.push(response);
          }
          loadingState.stop();
          return responses;
        } catch (err: any) {
          loadingState.stop();
          if (err.code === 429) {
            networkState.markRateLimited(60000);
          } else if (err.code) {
            console.error('Error:', err);
          } else {
            networkState.markBackendUnavailable();
          }
          throw err;
        }
      }

      if (config.operation === "change-name") {
        if (!config.name) throw new Error("name is required");
        if (!config["bucket-id"]) throw new Error("bucket-id is required");
        if (!config["file-id"]) throw new Error("file-id is required");

        const bucketId = config["bucket-id"];
        const fileId = config["file-id"];
        const name = config.name;

        const file = {
          bucketId: bucketId,
          $id: fileId,
          name: name,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await storage.updateFile({ bucketId, fileId, name });
            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(file, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(file, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "change-permissions") {
        if (!config["bucket-id"]) throw new Error("bucket-id is required");
        if (!config["file-id"]) throw new Error("file-id is required");

        const bucketId = config["bucket-id"];
        const fileId = config["file-id"];

        const file = {
          bucketId: bucketId,
          $id: fileId,
          $permissions: permissions,
          $updatedAt: new Date().toISOString().replace('Z', '+00:00')
        };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await storage.updateFile({ bucketId, fileId, permissions });
            loadingState.stop();
            addItem(structuredClone(response), config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              addItem(file, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            addItem(file, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }

      if (config.operation === "delete-file") {
        if (!config["bucket-id"]) throw new Error("bucket-id is required");
        if (!config["file-id"]) throw new Error("file-id is required");

        const bucketId = config["bucket-id"];
        const fileId = config["file-id"];

        const file = { bucketId: bucketId, $id: fileId };

        if (networkState.isBackendAvailable) {
          loadingState.start();
          try {
            const response = await storage.deleteFile({ bucketId, fileId });

            loadingState.stop();
            removeItem(file, config.source, config.cache);
            return response;
          } catch (err: any) {
            loadingState.stop();
            if (err.code === 429) {
              networkState.markRateLimited(60000);
            } else if (err.code) {
              console.error('Error:', err);
            } else {
              networkState.markBackendUnavailable();
            }
            if (!isPendingTask && (!err.code || err.code === 429)) {
              removeItem(file, config.source, config.cache);
              config.isPendingTask = true;
              syncQueue.add({ body: config, type: 'data' });
            }
            throw err;
          }
        } else {
          if (!isPendingTask) {
            removeItem(file, config.source, config.cache);
            config.isPendingTask = true;
            syncQueue.add({ body: config, type: 'data' });
            return { status: "ok" };
          } else {
            throw new Error("Server unavailable");
          }
        }
      }
      break;
  }
}
