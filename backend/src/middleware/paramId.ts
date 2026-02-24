import { Request } from "express";

export function paramId(req: Request): string {
  const id = req.params.id;
  if (Array.isArray(id)) return id[0];
  return id;
}

export function paramKey(req: Request): string {
  const key = req.params.key;
  if (Array.isArray(key)) return key[0];
  return key;
}
