import Cookies from "js-cookie";

const AUTH_COOKIE = "offers_auth";

export interface AuthCredentials {
  username: string;
  password: string;
}

export const authService = {
  login: (username: string, password: string): boolean => {
    const credentials = btoa(`${username}:${password}`);
    Cookies.set(AUTH_COOKIE, credentials, { expires: 7 });
    return true;
  },

  logout: (): void => {
    Cookies.remove(AUTH_COOKIE);
  },

  isAuthenticated: (): boolean => {
    return !!Cookies.get(AUTH_COOKIE);
  },

  getCredentials: (): AuthCredentials | null => {
    const credentials = Cookies.get(AUTH_COOKIE);
    if (!credentials) return null;

    try {
      const decoded = atob(credentials);
      const [username, password] = decoded.split(":");
      return { username, password };
    } catch {
      return null;
    }
  },

  getAuthHeader: (): string | null => {
    const credentials = Cookies.get(AUTH_COOKIE);
    if (!credentials) return null;
    return `Basic ${credentials}`;
  },
};
