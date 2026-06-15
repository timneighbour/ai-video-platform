/**
 * SSRF Guard (ISS-033)
 * =====================
 * Validates user-supplied URLs before fetching them server-side.
 * Blocks requests to private IP ranges, loopback, link-local, and
 * non-HTTPS schemes to prevent Server-Side Request Forgery attacks.
 *
 * Usage:
 *   import { assertSafeUrl } from "./ssrf-guard";
 *   assertSafeUrl(userSuppliedUrl); // throws if unsafe
 *   const response = await fetch(userSuppliedUrl);
 */

import dns from "dns/promises";
import net from "net";

/** Convert dotted-decimal IPv4 to a 32-bit unsigned integer */
function ipToUint32(ip: string): number {
  const parts = ip.split(".").map(Number);
  // Use unsigned right-shift to keep it as unsigned 32-bit
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** Check if an IPv4 address falls within a CIDR range */
function inCidr(ip: string, cidrBase: string, prefixLen: number): boolean {
  const ipInt = ipToUint32(ip);
  const baseInt = ipToUint32(cidrBase);
  const mask = prefixLen === 0 ? 0 : (0xFFFFFFFF << (32 - prefixLen)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** Returns true if the IPv4 address is in a private / reserved range */
function isPrivateIpv4(ip: string): boolean {
  return (
    inCidr(ip, "127.0.0.0", 8)   ||  // Loopback
    inCidr(ip, "10.0.0.0", 8)    ||  // Private Class A
    inCidr(ip, "172.16.0.0", 12) ||  // Private Class B
    inCidr(ip, "192.168.0.0", 16)||  // Private Class C
    inCidr(ip, "169.254.0.0", 16)||  // Link-local / AWS metadata
    inCidr(ip, "100.64.0.0", 10) ||  // Carrier-grade NAT
    inCidr(ip, "0.0.0.0", 8)    ||  // "This" network
    inCidr(ip, "240.0.0.0", 4)      // Reserved
  );
}

/**
 * Synchronous URL validation — checks scheme, hostname format, and known-bad patterns.
 * Does NOT do DNS resolution (use assertSafeUrlAsync for that).
 */
export function assertSafeUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`SSRF Guard: invalid URL: ${rawUrl}`);
  }

  // Only allow HTTPS (and HTTP in dev for localhost testing)
  const allowedSchemes = process.env.NODE_ENV === "development"
    ? ["https:", "http:"]
    : ["https:"];
  if (!allowedSchemes.includes(parsed.protocol)) {
    throw new Error(`SSRF Guard: disallowed scheme '${parsed.protocol}' in URL: ${rawUrl}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback hostnames
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    throw new Error(`SSRF Guard: loopback hostname blocked: ${rawUrl}`);
  }

  // Block cloud metadata endpoints
  if (hostname === "169.254.169.254" || hostname === "metadata.google.internal" || hostname === "metadata.azure.com") {
    throw new Error(`SSRF Guard: cloud metadata endpoint blocked: ${rawUrl}`);
  }

  // Block raw IPv4 addresses in private ranges (quick check without DNS)
  if (net.isIPv4(hostname) && isPrivateIpv4(hostname)) {
    throw new Error(`SSRF Guard: private IP address blocked: ${rawUrl}`);
  }

  return parsed;
}

/**
 * Async URL validation — performs DNS resolution and checks resolved IPs.
 * Use this for higher-security contexts where DNS rebinding is a concern.
 */
export async function assertSafeUrlAsync(rawUrl: string): Promise<URL> {
  const parsed = assertSafeUrl(rawUrl); // sync checks first

  // Resolve the hostname and check all returned IPs
  try {
    const addresses = await dns.resolve4(parsed.hostname).catch(() => [] as string[]);
    for (const ip of addresses) {
      if (isPrivateIpv4(ip)) {
        throw new Error(`SSRF Guard: hostname '${parsed.hostname}' resolves to private IP ${ip}: ${rawUrl}`);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("SSRF Guard:")) throw err;
    // DNS resolution failure is non-fatal — let the fetch fail naturally
  }

  return parsed;
}
