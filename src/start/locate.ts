/**
 * Where is "here": a typed place, coordinate pair or grid reference, or
 * the device's location. The coordinate parser follows lunamap's
 * (github.com/mdsumner/lunamap, js/search.js), widened from Tasmania to
 * any UTM zone; words go to the OpenStreetMap Nominatim search.
 */

import proj4 from 'proj4';
import { utmZone } from './scopes';

export interface Place {
  lon: number;
  lat: number;
  /** What was understood, for the hint line. */
  label: string;
}

const STRIP = /[\u00b0\u00ba\u02da\u2032\u2033'"`:]/g;
const MINUS = /[\u2212\u2013]/g;

/**
 * A coordinate from text, or null when it does not read as one (words
 * mean an address or a place name).
 *
 *   lon, lat     "147.3257, -42.8821" (the default order when it cannot be told)
 *   lat, lon     "-42.8821 147.3257" when a value over 90 says so, or "lat, lon:" first
 *   DMS / DDM    "42 52 55.6 S 147 19 32.5 E", "S42 52.926 E147 19.542"
 *   UTM / MGA    "526598 5252225 z55" or "MGA55: 526598 E 5252225 N"; without a
 *                zone, the zone of refLon. South of the equator unless "N" follows the zone.
 */
export function parseCoordinate(raw: string, refLon = 0, refLat = -1): Place | null {
  let line = String(raw).split(/\r?\n/).filter((x) => x.trim())[0] || '';
  let hint = '';
  const m = line.match(/^\s*([A-Za-z][^:]*):(.*)$/);
  if (m) { hint = m[1].toLowerCase(); line = m[2]; }
  // A zone written after the numbers ("... z55", "zone 55S") is a hint too.
  const zm = line.match(/\b(?:z|zone)\s*(\d{1,2})\s*([ns])?\s*$/i);
  if (zm) { hint += ` z${zm[1]}${zm[2] ? zm[2].toLowerCase() : ''}`; line = line.slice(0, zm.index); }
  if (/[A-Za-z]{2,}/.test(line)) return null;
  const s = line.replace(STRIP, ' ').replace(MINUS, '-').toUpperCase();
  const toks = s.match(/-?\d+(?:\.\d+)?|[NSEW]/g) || [];
  const nums = toks.filter((t) => !/[NSEW]/.test(t)).map(Number);
  const hasLetters = toks.some((t) => /[NSEW]/.test(t));

  const ll = (lat: number, lon: number, kind: string): Place | null =>
    isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lon, lat, label: kind } : null;

  // Easting and northing: big numbers.
  const big = nums.filter((v) => Math.abs(v) >= 1000);
  if (big.length >= 2) {
    let [e, n] = big;
    if (e > n) [e, n] = [n, e];   // the northing is the 7-digit one
    const hz = hint.match(/(?:z|mga|utm)\s*(\d{1,2})\s*([ns])?/);
    const zone = hz ? +hz[1] : utmZone(refLon);
    const south = hz && hz[2] ? hz[2] === 's' : refLat < 0;
    if (zone < 1 || zone > 60) return null;
    const def = `+proj=utm +zone=${zone}${south ? ' +south' : ''} +ellps=GRS80 +units=m +no_defs`;
    const [lon, lat] = proj4(def, 'EPSG:4326', [e, n]);
    return ll(lat, lon, `UTM zone ${zone}${south ? 'S' : 'N'} ${e} E ${n} N`);
  }

  // Two angles, decimal or degrees-minutes-seconds.
  type Group = { n: number[]; h: string | null; neg?: boolean };
  let groups: Group[] = [];
  if (hasLetters) {
    const prefix = /[NSEW]/.test(toks[0] ?? '');
    let cur: Group = { n: [], h: null };
    for (const t of toks) {
      if (/[NSEW]/.test(t)) {
        if (prefix) { if (cur.n.length || cur.h) groups.push(cur); cur = { n: [], h: t }; }
        else { cur.h = t; groups.push(cur); cur = { n: [], h: null }; }
      } else cur.n.push(+t);
    }
    if (cur.n.length) groups.push(cur);
  } else {
    const parts = line.split(/[,;]/).filter((x) => x.trim());
    if (parts.length === 2) {
      groups = parts.map((p) => ({
        n: (p.replace(STRIP, ' ').match(/-?\d+(?:\.\d+)?/g) || []).map(Number),
        h: null,
        neg: /-/.test(p.replace(MINUS, '-'))
      }));
    } else if (nums.length === 2) groups = [{ n: [nums[0]], h: null }, { n: [nums[1]], h: null }];
    else if (nums.length === 4) groups = [{ n: nums.slice(0, 2), h: null }, { n: nums.slice(2), h: null }];
    else if (nums.length === 6) groups = [{ n: nums.slice(0, 3), h: null }, { n: nums.slice(3), h: null }];
  }
  if (groups.length !== 2 || groups.some((g) => !g.n.length)) return null;
  const vals = groups.map((g) => {
    const d = g.n[0];
    const neg = d < 0 || g.neg || g.h === 'S' || g.h === 'W';
    const v = Math.abs(d) + (g.n[1] || 0) / 60 + (g.n[2] || 0) / 3600;
    return neg ? -v : v;
  });
  let latFirst: boolean;
  if (groups[0].h || groups[1].h) {
    latFirst = groups[0].h === 'N' || groups[0].h === 'S' || groups[1].h === 'E' || groups[1].h === 'W';
  } else if (/lat\s*,?\s*lon/.test(hint)) latFirst = true;
  else if (/lon\s*,?\s*lat/.test(hint)) latFirst = false;
  else if (Math.abs(vals[0]) > 90) latFirst = false;
  else if (Math.abs(vals[1]) > 90) latFirst = true;
  else latFirst = false;
  return latFirst ? ll(vals[0], vals[1], 'lat, lon') : ll(vals[1], vals[0], 'lon, lat');
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Places matching a name or address, best first (OpenStreetMap Nominatim). */
export async function searchPlaces(q: string, limit = 6): Promise<Place[]> {
  const url = `${NOMINATIM}?format=jsonv2&limit=${limit}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`place search: HTTP ${r.status}`);
  const j = await r.json() as { lat: string; lon: string; display_name: string }[];
  return j.map((p) => ({ lon: +p.lon, lat: +p.lat, label: p.display_name }))
    .filter((p) => isFinite(p.lon) && isFinite(p.lat));
}

/** The device's location, or an error saying why not. */
export function deviceLocation(timeoutMs = 10000): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('this browser has no location service')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lon: p.coords.longitude, lat: p.coords.latitude, label: 'your location' }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'location permission was declined' : 'location is not available')),
      { timeout: timeoutMs, maximumAge: 600000 }
    );
  });
}
