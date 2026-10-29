import { BlockList, isIP } from "node:net";

const blockedAddresses = new BlockList();

for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]
] as const) blockedAddresses.addSubnet(address, prefix, "ipv4");

for (const [address, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10],
  ["ff00::", 8], ["100::", 64], ["2001:db8::", 32], ["2001::", 32]
] as const) blockedAddresses.addSubnet(address, prefix, "ipv6");

function embeddedIpv4(address: string) {
  const normalized = address.toLowerCase();
  const [before, after = ""] = normalized.split("::");
  const head = before ? before.split(":") : [];
  const tail = after ? after.split(":") : [];
  const groups = [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  if (groups.length !== 8) return null;

  const isMapped = groups.slice(0, 6).join(":") === "0:0:0:0:0:ffff";
  const isNat64 = groups.slice(0, 6).join(":") === "64:ff9b:0:0:0:0";
  if (!isMapped && !isNat64) return null;

  const high = Number.parseInt(groups[6], 16);
  const low = Number.parseInt(groups[7], 16);
  if (!Number.isInteger(high) || !Number.isInteger(low)) return null;
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function isBlockedAddress(address: string) {
  const family = isIP(address);
  if (family === 0) return true;
  if (blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6")) return true;

  const embedded = family === 6 ? embeddedIpv4(address) : null;
  return embedded ? blockedAddresses.check(embedded, "ipv4") : false;
}
