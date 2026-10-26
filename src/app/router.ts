import { useState, useEffect, useCallback } from 'react';

export function normalizePath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '' || clean === '/') {
    return '/';
  }
  return clean;
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return normalizePath(window.location.pathname);
  });

  useEffect(() => {
    const clean = normalizePath(window.location.pathname);
    if (window.location.pathname !== clean) {
      window.history.replaceState(null, '', clean);
    }

    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = normalizePath(to);
    if (target !== currentPath) {
      window.history.pushState(null, '', target);
      setCurrentPath(target);
    }
  }, [currentPath]);

  return { currentPath, navigate };
}
