import { format } from "date-fns";
import type { Client } from "@/lib/api/clients";

export interface ClientBasicInfo {
  name: string;
  /** Formatted "MMM d, yyyy", or "" when unknown. */
  dob: string;
  address: string;
  phone: string;
}

/** Normalizes the various dateOfBirth shapes (string / Firestore timestamp / Date) to "MMM d, yyyy". */
export function formatClientDob(
  dateOfBirth?: string | { _seconds?: number; _nanoseconds?: number } | Date | null,
): string {
  if (!dateOfBirth) return "";
  let date: Date;
  if (dateOfBirth instanceof Date) {
    date = dateOfBirth;
  } else if (typeof dateOfBirth === "string") {
    date = new Date(dateOfBirth);
  } else if (typeof dateOfBirth === "object" && typeof dateOfBirth._seconds === "number") {
    date = new Date(dateOfBirth._seconds * 1000);
  } else {
    return "";
  }
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy");
}

function formatClientName(client: Client): string {
  return [client.firstName, client.middleName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function formatClientAddress(client: Client): string {
  const primary = client.primaryAddress;
  const parts = primary
    ? [primary.address, primary.countyState, primary.zipCode]
    : [client.address, client.city, client.state, client.zipCode, client.countyState];
  return parts.filter(Boolean).join(", ").trim();
}

/** Pulls the "Name, DOB, address, phone" block shown on HHA notes from a shift's client. */
export function getClientBasicInfo(client?: Client | null): ClientBasicInfo {
  if (!client) {
    return { name: "", dob: "", address: "", phone: "" };
  }
  return {
    name: formatClientName(client) || client.id,
    dob: formatClientDob(client.dateOfBirth),
    address: formatClientAddress(client),
    phone: client.phone ?? "",
  };
}
