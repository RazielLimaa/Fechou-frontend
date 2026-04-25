/**
 * profile.service.ts — frontend API client (axios)
 */

import { api } from "../services/api";

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
  const res = await api.get<UserProfile>("/api/profile/me");
  return res.data;
}

export async function updateMyProfile(data: UpdateProfilePayload): Promise<UserProfile> {
  const res = await api.patch<UserProfile>("/api/profile/me", data);
  return res.data;
}

export async function getPublicProfile(slugOrId: string | number): Promise<UserProfile> {
  const res = await api.get<UserProfile>(`/api/profile/public/${slugOrId}`);
  return res.data;
}

// ─── Avaliações ───────────────────────────────────────────────────────────────

export async function getMyRatings(): Promise<RatingsData> {
  const res = await api.get<RatingsData>("/api/ratings/me");
  return res.data;
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
