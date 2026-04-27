/**
 * profile.service.ts — frontend API client (axios)
 */

import { api } from "../services/api";
import {
  sanitizeProfileAvatarSrc,
  sanitizeProfileExternalUrl,
  sanitizeProfileText,
} from "../lib/profile-security";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ScoreLevel {
  label: string;
  color: string;
  emoji: string;
}

export interface UserScoreData {
  score:          number;
  totalSold:      number;
  totalCancelled: number;
  totalPending:   number;
  updatedAt:      string;
  level:          ScoreLevel;
}

export interface RatingItem {
  id:         number;
  contractId: number;
  raterName:  string;
  stars:      number;
  comment:    string | null;
  createdAt:  string;
}

export interface RatingsData {
  avgStars:     number;
  totalRatings: number;
  ratings:      RatingItem[];
}

export interface ProfileLinks {
  website:   string | null;
  linkedin:  string | null;
  instagram: string | null;
  github:    string | null;
  behance:   string | null;
}

export interface UserProfile {
  userId:      number;
  name:        string;
  email?:      string;
  bio:         string | null;
  avatarUrl:   string | null;
  profession:  string | null;
  location:    string | null;
  slug:        string | null;
  isPublic:    boolean;
  memberSince: string;
  links:       ProfileLinks;
  score: {
    value:          number;
    totalSold:      number;
    totalCancelled: number;
    totalPending:   number;
    level:          ScoreLevel;
  };
  ratings: {
    avgStars:     number;
    totalRatings: number;
    recent:       RatingItem[];
  };
}

export interface UpdateProfilePayload {
  displayName?:   string;
  bio?:           string;
  avatarUrl?:     string | null;
  profession?:    string;
  location?:      string;
  slug?:          string;
  isPublic?:      boolean;
  linkWebsite?:   string | null;
  linkLinkedin?:  string | null;
  linkInstagram?: string | null;
  linkGithub?:    string | null;
  linkBehance?:   string | null;
}

const DEFAULT_SCORE: UserProfile["score"] = {
  value: 0,
  totalSold: 0,
  totalCancelled: 0,
  totalPending: 0,
  level: { label: "Bronze", color: "#cd7f32", emoji: "\u{1F949}" },
};

const DEFAULT_RATINGS: UserProfile["ratings"] = {
  avgStars: 0,
  totalRatings: 0,
  recent: [],
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function asNullableText(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null;
  const clean = sanitizeProfileText(value, max);
  return clean.length > 0 ? clean : null;
}

export function sanitizeProfileSlug(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 60);
}

function normalizeLinks(value: unknown): ProfileLinks {
  const links = asRecord(value);
  return {
    website: sanitizeProfileExternalUrl(links.website),
    linkedin: sanitizeProfileExternalUrl(links.linkedin),
    instagram: sanitizeProfileExternalUrl(links.instagram),
    github: sanitizeProfileExternalUrl(links.github),
    behance: sanitizeProfileExternalUrl(links.behance),
  };
}

function normalizeScore(value: unknown): UserProfile["score"] {
  const score = asRecord(value);
  const level = asRecord(score.level);
  return {
    value: asNumber(score.value, DEFAULT_SCORE.value),
    totalSold: asNumber(score.totalSold, DEFAULT_SCORE.totalSold),
    totalCancelled: asNumber(score.totalCancelled, DEFAULT_SCORE.totalCancelled),
    totalPending: asNumber(score.totalPending, DEFAULT_SCORE.totalPending),
    level: {
      label: sanitizeProfileText(level.label, 40) || DEFAULT_SCORE.level.label,
      color: sanitizeProfileText(level.color, 32) || DEFAULT_SCORE.level.color,
      emoji: sanitizeProfileText(level.emoji, 8) || DEFAULT_SCORE.level.emoji,
    },
  };
}

function normalizeRating(value: unknown): RatingItem | null {
  const item = asRecord(value);
  const id = asNumber(item.id, NaN);
  const contractId = asNumber(item.contractId, NaN);
  if (!Number.isFinite(id) || !Number.isFinite(contractId)) return null;

  return {
    id,
    contractId,
    raterName: sanitizeProfileText(item.raterName, 80) || "Cliente",
    stars: Math.max(0, Math.min(5, asNumber(item.stars, 0))),
    comment: asNullableText(item.comment, 500),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  };
}

function normalizeRatings(value: unknown): UserProfile["ratings"] {
  const ratings = asRecord(value);
  const recentRaw = Array.isArray(ratings.recent) ? ratings.recent : [];
  return {
    avgStars: asNumber(ratings.avgStars, DEFAULT_RATINGS.avgStars),
    totalRatings: asNumber(ratings.totalRatings, DEFAULT_RATINGS.totalRatings),
    recent: recentRaw.map(normalizeRating).filter((item): item is RatingItem => Boolean(item)),
  };
}

export function normalizeUserProfile(value: unknown): UserProfile {
  const profile = asRecord(value);
  const name = sanitizeProfileText(profile.name, 120) || "Usuario";
  const rawSlug = asNullableText(profile.slug, 60);

  return {
    userId: asNumber(profile.userId, 0),
    name,
    email: typeof profile.email === "string" ? sanitizeProfileText(profile.email, 254) : undefined,
    bio: asNullableText(profile.bio, 500),
    avatarUrl: sanitizeProfileAvatarSrc(profile.avatarUrl),
    profession: asNullableText(profile.profession, 120),
    location: asNullableText(profile.location, 120),
    slug: rawSlug ? sanitizeProfileSlug(rawSlug) : null,
    isPublic: typeof profile.isPublic === "boolean" ? profile.isPublic : false,
    memberSince: typeof profile.memberSince === "string" ? profile.memberSince : new Date().toISOString(),
    links: normalizeLinks(profile.links),
    score: normalizeScore(profile.score),
    ratings: normalizeRatings(profile.ratings),
  };
}

function cleanUrlField(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return sanitizeProfileExternalUrl(value) ?? null;
}

export function normalizeUpdateProfilePayload(data: UpdateProfilePayload): UpdateProfilePayload {
  return {
    displayName: data.displayName === undefined ? undefined : sanitizeProfileText(data.displayName, 120),
    bio: data.bio === undefined ? undefined : sanitizeProfileText(data.bio, 500),
    profession: data.profession === undefined ? undefined : sanitizeProfileText(data.profession, 120),
    location: data.location === undefined ? undefined : sanitizeProfileText(data.location, 120),
    slug: data.slug === undefined ? undefined : sanitizeProfileSlug(data.slug),
    avatarUrl: data.avatarUrl === undefined ? undefined : sanitizeProfileAvatarSrc(data.avatarUrl),
    isPublic: data.isPublic,
    linkWebsite: cleanUrlField(data.linkWebsite),
    linkLinkedin: cleanUrlField(data.linkLinkedin),
    linkInstagram: cleanUrlField(data.linkInstagram),
    linkGithub: cleanUrlField(data.linkGithub),
    linkBehance: cleanUrlField(data.linkBehance),
  };
}

// ─── Score ────────────────────────────────────────────────────────────────────

export async function getMyScore(): Promise<UserScoreData> {
  const res = await api.get<UserScoreData>("/api/score/me");
  return res.data;
}

export async function recalculateScore(): Promise<{ score: number; level: ScoreLevel }> {
  const res = await api.post<{ score: number; level: ScoreLevel }>("/api/score/recalculate");
  return res.data;
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<UserProfile> {
  const res = await api.get<unknown>("/api/profile/me");
  return normalizeUserProfile(res.data);
}

export async function updateMyProfile(data: UpdateProfilePayload): Promise<UserProfile> {
  const res = await api.patch<unknown>("/api/profile/me", normalizeUpdateProfilePayload(data));
  return normalizeUserProfile(res.data);
}

export async function getPublicProfile(slugOrId: string | number): Promise<UserProfile> {
  const safeSlugOrId = encodeURIComponent(String(slugOrId).trim());
  const res = await api.get<unknown>(`/api/profile/public/${safeSlugOrId}`);
  return normalizeUserProfile(res.data);
}

// ─── Avaliações ───────────────────────────────────────────────────────────────

export async function getMyRatings(): Promise<RatingsData> {
  const res = await api.get<unknown>("/api/ratings/me");
  const ratings = normalizeRatings(res.data);
  return {
    avgStars: ratings.avgStars,
    totalRatings: ratings.totalRatings,
    ratings: ratings.recent,
  };
}

export async function getRatingByContract(
  contractId: number,
  publicToken?: string,
): Promise<{
  rated: boolean;
  stars?: number;
  comment?: string | null;
  raterName?: string;
  createdAt?: string;
}> {
  const normalizedToken = (publicToken ?? "").trim().toLowerCase();
  if (!normalizedToken) {
    return { rated: false };
  }

  try {
    const res = await api.get<{
      rated: boolean;
      stars?: number;
      comment?: string | null;
      raterName?: string;
      createdAt?: string;
    }>(`/api/ratings/contract/${contractId}?publicToken=${encodeURIComponent(normalizedToken)}`);
    return res.data;
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    if (status === 403) {
      return { rated: false };
    }
    throw error;
  }
}

export async function submitRating(data: {
  contractId: number;
  userId:     number;
  raterName:  string;
  stars:      number;
  comment?:   string;
}): Promise<{ ok: boolean; ratingId: number }> {
  const res = await api.post<{ ok: boolean; ratingId: number }>("/api/ratings", data);
  return res.data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
