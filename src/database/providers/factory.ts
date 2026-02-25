import type { ReferenceDataProvider } from "./types";
import { RemotePostgresProvider } from "./remoteProvider";

let provider: ReferenceDataProvider | null = null;

export function createReferenceProvider(): ReferenceDataProvider {
  if (provider) return provider;
  provider = new RemotePostgresProvider();
  return provider;
}

export function resetProvider(): void {
  provider = null;
}
