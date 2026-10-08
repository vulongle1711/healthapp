"use client";

import type { FoodAnalysis } from "@/types/nutrition";
import type { ExerciseEstimate } from "@/types/exercise";
import type { DayParse } from "@/lib/ai/schemas";

export class FriendlyError extends Error {}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new FriendlyError("You seem to be offline. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new FriendlyError(data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export const analyzeFoodText = (text: string) => post<FoodAnalysis>("/api/ai/food", { text });
export const analyzeExerciseText = (text: string) =>
  post<{ items: ExerciseEstimate[]; clarification: string | null; source: "ai" | "offline" }>("/api/ai/exercise", { text });
export const analyzeDayText = (text: string) => post<DayParse & { source: "ai" | "offline" }>("/api/ai/day", { text });
export const askCoach = (question: string) => post<{ answer: string; source: "ai" | "offline" }>("/api/ai/coach", { question });

/** Downscale a photo in the browser before upload (max 1280 px, JPEG ~0.82). */
export async function compressImage(file: File, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
}

export async function analyzeFoodPhoto(file: File, note?: string): Promise<FoodAnalysis> {
  const blob = await compressImage(file);
  const form = new FormData();
  form.append("image", new File([blob], "meal.jpg", { type: blob.type || "image/jpeg" }));
  if (note) form.append("note", note);
  let res: Response;
  try {
    res = await fetch("/api/ai/food", { method: "POST", body: form });
  } catch {
    throw new FriendlyError("Upload failed. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new FriendlyError(data?.error ?? "We couldn't analyze that photo.");
  return data as FoodAnalysis;
}

/** "HH:MM" for now in the browser's zone. */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Today's date at the given local "HH:MM" as ISO. Times in the future roll back to now. */
export function todayAt(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime() > Date.now() + 60_000 ? new Date().toISOString() : d.toISOString();
}
