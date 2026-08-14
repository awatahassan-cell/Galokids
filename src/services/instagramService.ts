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

export async function fetchInstagramFeed(accessToken?: string): Promise<InstagramPost[]> {
  if (!accessToken || !accessToken.trim()) {
    return [];
  }

  const cleanToken = accessToken.trim();

  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(INSTAGRAM_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.posts)) {
        return parsed.posts;
      }
    }
  } catch {
    // ignore cache error
  }

  try {
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&limit=12&access_token=${encodeURIComponent(cleanToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Instagram Graph API returned status:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.data)) {
      return [];
    }

    const posts: InstagramPost[] = data.data.map((item: any) => ({
      id: item.id,
      caption: item.caption || '',
      mediaType: item.media_type,
      mediaUrl: item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url,
      permalink: item.permalink || 'https://instagram.com/galokids.iq',
      timestamp: item.timestamp,
      username: item.username || 'galokids.iq',
    }));

    // Cache the successful response
    try {
      localStorage.setItem(INSTAGRAM_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        posts,
      }));
    } catch {
      // ignore
    }

    return posts;
  } catch (err) {
    console.error('Failed to fetch Instagram live feed:', err);
    return [];
  }
}
