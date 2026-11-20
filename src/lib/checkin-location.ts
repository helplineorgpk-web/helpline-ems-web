// Check-in location as stored on an Attendance record, and how the dashboard and exports describe it.

export type CheckinLocation = {
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInAccuracy?: number | null;
  checkInMocked?: boolean | null;
  checkInLocationStatus?: string | null;
};

const MISSING_REASON: Record<string, string> = {
  DENIED: "Location permission not given",
  SERVICES_OFF: "Phone location (GPS) was off",
  UNAVAILABLE: "Phone could not get a location",
};

export function hasCheckinPosition(
  r: CheckinLocation,
): r is CheckinLocation & { checkInLat: number; checkInLng: number } {
  return typeof r.checkInLat === "number" && typeof r.checkInLng === "number";
}

export function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function accuracyLabel(accuracy?: number | null) {
  return typeof accuracy === "number" ? `±${Math.round(accuracy)} m` : "";
}

// Why a record has no position. A null status means the check-in came from an app version without
// location support, or was made before the feature existed.
export function missingLocationReason(r: CheckinLocation) {
  if (r.checkInLocationStatus && MISSING_REASON[r.checkInLocationStatus]) {
    return MISSING_REASON[r.checkInLocationStatus];
  }
  return "Not sent (older app version)";
}
