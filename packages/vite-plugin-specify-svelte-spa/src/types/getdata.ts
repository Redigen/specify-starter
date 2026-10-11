export interface GetData {
  source: "databases" | "user-account" | "teams" | "team-memberships";
  "database-id"?: string;
  "table-id"?: string;
  "row-id"?: string;
  "team-id"?: string;
  "membership-id"?: string;
  query?: GetDataQuery;
  cache?: "localStorage" | "sessionStorage";
  realtime?: boolean;
  "infinite-scroll"?: boolean;
}

export interface GetDataQuery {
  columns?: string[];
  rules?: GetDataRule[];
  order?: GetDataOrder[];
  limit?: number;
  page?: number;
}

export interface GetDataRule {
  and?: GetDataRule[];
  or?: GetDataRule[];
  column: string;
  operator: string;
  value: any;
}

export interface GetDataOrder {
  column: string;
  type: "asc" | "desc" | "random";
}
