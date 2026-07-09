const VAULT_PATH_KEY = "jot:vaultPath";

export function getVaultPath(): string | null {
  return localStorage.getItem(VAULT_PATH_KEY);
}

export function setVaultPath(path: string): void {
  localStorage.setItem(VAULT_PATH_KEY, path);
}

export function clearVaultPath(): void {
  localStorage.removeItem(VAULT_PATH_KEY);
}
