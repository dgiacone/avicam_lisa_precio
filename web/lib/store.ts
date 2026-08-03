import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { PriceList } from "./parseXlsx";

const STORE_PATH = join("/tmp", "lista-latest.json");

export function saveLatestList(data: PriceList): void {
  writeFileSync(STORE_PATH, JSON.stringify(data), "utf-8");
}

export function loadLatestList(): PriceList | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as PriceList;
  } catch {
    return null;
  }
}
