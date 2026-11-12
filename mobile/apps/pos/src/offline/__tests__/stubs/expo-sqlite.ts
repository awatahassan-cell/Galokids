export { sqliteStub as default } from '../harness';
import { sqliteStub } from '../harness';
export const openDatabaseAsync = sqliteStub.openDatabaseAsync;
export type SQLiteDatabase = any;
