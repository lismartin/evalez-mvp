import assert from "node:assert/strict";
import { isBlockedAddress } from "./address-policy.ts";

const blocked = [
  "0.1.2.3", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.1.1", "172.16.0.1",
  "192.0.0.1", "192.0.2.1", "192.88.99.1", "192.168.1.1", "198.18.0.1", "198.51.100.1",
  "203.0.113.1", "224.0.0.1", "240.0.0.1", "::", "::1", "fc00::1", "fe80::1",
  "fec0::1", "ff00::1", "100::1", "2001:db8::1", "2001::1", "::ffff:127.0.0.1",
  "64:ff9b::a9fe:a9fe", "not-an-address"
];

for (const address of blocked) assert.equal(isBlockedAddress(address), true, `${address} must be blocked`);

for (const address of [
  "8.8.8.8", "11.0.0.1", "100.128.0.1", "172.15.255.255", "172.32.0.0", "192.169.0.1",
  "223.255.255.255", "2001:4860:4860::8888", "2606:4700:4700::1111", "::ffff:8.8.8.8",
  "64:ff9b::808:808"
]) assert.equal(isBlockedAddress(address), false, `${address} must be allowed`);

console.log("Correctas: política de direcciones IPv4 e IPv6.");
