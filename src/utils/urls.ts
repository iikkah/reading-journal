const baseUrl = import.meta.env.BASE_URL.endsWith('/')
	? import.meta.env.BASE_URL
	: `${import.meta.env.BASE_URL}/`;

/** Prefix a site-relative path with Astro's configured deployment base. */
export function withBase(path: string): string {
	return `${baseUrl}${path.replace(/^\/+/, '')}`;
}
