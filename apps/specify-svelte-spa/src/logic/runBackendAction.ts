export interface Action {
  fn: string;
}
export async function runBackendAction(config: Action): Promise<any> {
  return {};
}
