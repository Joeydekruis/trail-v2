import { BOARD_COLUMN_IDS, type BoardColumnId } from "./boardColumns.logic";

export function isBoardColumnId(value: string): value is BoardColumnId {
  return (BOARD_COLUMN_IDS as readonly string[]).includes(value);
}
