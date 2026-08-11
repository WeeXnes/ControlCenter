export async function fetchFromOneDev<T>(path: string): Promise<T | null> {
  const internalUrl = `http://100.64.0.5:8543${path}`;
  const externalUrl = `https://code.weexnes.dev${path}`;
  
  try {
    const res = await $fetch.raw<T>(internalUrl, { headers: { Accept: 'application/json' } });
    if (res.status === 204) return null;
    return res._data;
  } catch (err: any) {
    console.warn(`Failed to fetch from internal OneDev API: ${internalUrl}. Retrying with public URL.`);
    try {
      const res = await $fetch.raw<T>(externalUrl, { headers: { Accept: 'application/json' } });
      if (res.status === 204) return null;
      return res._data;
    } catch (err2) {
      console.error(`Failed to fetch from external OneDev API: ${externalUrl}`, err2);
      throw err2;
    }
  }
}
