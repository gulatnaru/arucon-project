export type AssetFilePort<TFile> = {
  readonly uri: string;
  exists: boolean;
  size: number;
  bytes(): Promise<Uint8Array<ArrayBuffer>>;
  copy(destination: TFile): void;
  delete(): void;
};

export type AssetBytesOptions<TFile> = {
  platform: string;
  bundleUri: string;
  source: TFile;
  hash: string | null;
  type: string;
  createCacheFile(name: string): TFile;
  uniqueSuffix(): string;
};

function isWithinDirectory(uri: string, directoryUri: string): boolean {
  const prefix = directoryUri.endsWith('/') ? directoryUri : `${directoryUri}/`;
  return uri.startsWith(prefix);
}

export async function readAssetBytes<TFile extends AssetFilePort<TFile>>(
  options: AssetBytesOptions<TFile>,
): Promise<Uint8Array<ArrayBuffer>> {
  const { source } = options;
  try {
    return await source.bytes();
  } catch (error) {
    if (options.platform !== 'ios' || !isWithinDirectory(source.uri, options.bundleUri)) {
      throw error;
    }
  }

  const reusable = !!options.hash;
  const safeHash = options.hash?.replaceAll(/[^a-zA-Z0-9._-]/gu, '_');
  const cacheName = reusable
    ? `arucon-glb-${safeHash}.${options.type}`
    : `arucon-glb-uncached-${options.uniqueSuffix()}.${options.type}`;
  const cached = options.createCacheFile(cacheName);
  try {
    if (cached.exists && cached.size !== source.size) cached.delete();
    if (!cached.exists) source.copy(cached);
    return await cached.bytes();
  } finally {
    if (!reusable && cached.exists) cached.delete();
  }
}
