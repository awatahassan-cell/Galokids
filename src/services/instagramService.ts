import { API_BASE_URL } from '../config/api';

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  username?: string;
}

const INSTAGRAM_CACHE_KEY = 'galokids_instagram_posts_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

/**
 * The shop's latest Instagram posts.
 *
 * Fetched from our own API rather than from Instagram directly. Calling
 * Instagram from the browser needs the access token in the browser, which
 * meant publishing it: it travelled in the public settings response and then
 * again in the request URL, where anyone could read it out of the page or the
 * network tab and use the account. The token stays on the server now.
 *
 * The local cache is kept — it saves a round trip on every page view — but it
 * now holds only the posts, which were public to begin with.
 */
export async function fetchInstagramFeed(): Promise<InstagramPost[]> {
  try {
    const cached = localStorage.getItem(INSTAGRAM_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.posts)) {
        return parsed.posts;
      }
    }
  } catch {
    // A broken cache entry is not worth failing over; fetch instead.
  }

  try {
    const res = await fetch(`${API_BASE_URL}/instagram/feed`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const posts: InstagramPost[] = data
      .filter((item: any) => item && item.id && item.mediaUrl)
      .map((item: any) => ({
        id: String(item.id),
        caption: item.caption || '',
        mediaType: item.mediaType || 'IMAGE',
        mediaUrl: item.mediaUrl,
        permalink: item.permalink || 'https://instagram.com/galokids.iq',
        timestamp: item.timestamp,
        username: item.username || 'galokids.iq',
      }));

    try {
      localStorage.setItem(INSTAGRAM_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), posts }));
    } catch {
      // A full or unavailable localStorage costs a round trip, nothing more.
    }

    return posts;
  } catch {
    // Instagram being unreachable is not the shop being broken: the strip
    // falls back to the catalogue.
    return [];
  }
}
