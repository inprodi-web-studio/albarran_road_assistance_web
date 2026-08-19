const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:1337/api";

export const resolveMediaUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  try {
    const apiUrl = new URL(apiBaseUrl, window.location.origin);
    return new URL(url, apiUrl.origin).toString();
  } catch {
    return url;
  }
};
