import { useEffect, useState } from 'react';

export type Route = { name: 'list' } | { name: 'sheet'; id: string };

export function parseHash(hash: string): Route {
  const match = /^#\/c\/([^/]+)$/.exec(hash);
  return match ? { name: 'sheet', id: decodeURIComponent(match[1]) } : { name: 'list' };
}

export function routeToHash(route: Route): string {
  return route.name === 'sheet' ? `#/c/${encodeURIComponent(route.id)}` : '#/';
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
