export interface TableInfo {
  key: string;
  label: string;
  group: string;
  file: string;
  rowCount: number;
}

export interface ReferenceDataRepository {
  listTables(): Promise<TableInfo[]>;
  getTable(key: string): Promise<unknown>;
  putTable(key: string, data: unknown): Promise<void>;
}
