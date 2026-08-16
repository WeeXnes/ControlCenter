/**
 * Converts an IPv4 string to an unsigned 32-bit integer.
 */
export function ipv4ToNumber(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = ((num << 8) + n) >>> 0;
  }
  return num;
}

/**
 * Checks if a given IPv4 address is within a CIDR subnet block (e.g. 192.168.178.0/24 or 100.64.0.1/16).
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  if (!ip || !cidr) return false;

  const cleanIp = ip.trim().replace(/^::ffff:/, '');
  const cleanCidr = cidr.trim();

  // If CIDR contains comma-separated subnets, check any
  if (cleanCidr.includes(',')) {
    return cleanCidr.split(',').some((sub) => isIpInCidr(cleanIp, sub.trim()));
  }

  // If simple exact IP
  if (!cleanCidr.includes('/')) {
    return cleanIp === cleanCidr;
  }

  const [baseIp, prefixStr] = cleanCidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const targetIpNum = ipv4ToNumber(cleanIp);
  const baseIpNum = ipv4ToNumber(baseIp);

  if (targetIpNum === null || baseIpNum === null) return false;

  if (prefix === 0) return true;

  const mask = ((~0 << (32 - prefix)) >>> 0);
  return (targetIpNum & mask) === (baseIpNum & mask);
}
