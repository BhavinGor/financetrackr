/**
 * Local auth client shim that keeps the old `supabase.auth.*` surface.
 * Data is persisted in browser localStorage for offline/local use.
 */

type LocalUser = {
  id: string;
  email: string;
  passwordHash: string;
  user_metadata?: { full_name?: string };
};

type LocalSession = {
  access_token: string;
  expires_at: number;
  user: Omit<LocalUser, 'passwordHash'>;
};

type AuthListener = (event: string, session: LocalSession | null) => void;

import { generateId } from '../../utils/id';

const USERS_KEY = 'financetrackr_local_auth_users';
const SESSION_KEY = 'financetrackr_local_auth_session';

const listeners = new Set<AuthListener>();

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const readUsers = (): LocalUser[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeUsers = (users: LocalUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const stripPassword = (user: LocalUser) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const readSession = (): LocalSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as LocalSession;
    if (!session?.expires_at || Date.now() / 1000 > session.expires_at) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

const writeSession = (session: LocalSession | null) => {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
};

const notify = (event: string, session: LocalSession | null) => {
  listeners.forEach((listener) => listener(event, session));
};

const buildSession = (user: LocalUser): LocalSession => ({
  access_token: generateId('token'),
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  user: stripPassword(user),
});

const auth = {
  async getSession() {
    return { data: { session: readSession() } };
  },

  async getUser() {
    const session = readSession();
    return { data: { user: session?.user || null } };
  },

  async signUp({ email, password }: { email: string; password: string }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { data: { user: null, session: null }, error: { message: 'Email and password are required.' } };
    }

    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { data: { user: null, session: null }, error: { message: 'User already exists. Please sign in.' } };
    }

    const passwordHash = await hashPassword(password);
    const user: LocalUser = {
      id: generateId('user'),
      email: normalizedEmail,
      passwordHash,
      user_metadata: {},
    };

    users.push(user);
    writeUsers(users);

    const session = buildSession(user);
    writeSession(session);
    notify('SIGNED_IN', session);

    return { data: { user: session.user, session }, error: null };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    const users = readUsers();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail && u.passwordHash === passwordHash);

    if (!user) {
      return { data: { user: null, session: null }, error: { message: 'Invalid email or password.' } };
    }

    const session = buildSession(user);
    writeSession(session);
    notify('SIGNED_IN', session);

    return { data: { user: session.user, session }, error: null };
  },

  async signOut() {
    writeSession(null);
    notify('SIGNED_OUT', null);
    return { error: null };
  },

  async resetPasswordForEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = readUsers();
    const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);

    if (!exists) {
      return { error: { message: 'No account found for this email.' } };
    }

    return { error: null };
  },

  async updateUser(updates: { password?: string; data?: { full_name?: string } }) {
    const session = readSession();
    if (!session) {
      return { data: { user: null }, error: { message: 'No authenticated user.' } };
    }

    const users = readUsers();
    const idx = users.findIndex((u) => u.id === session.user.id);

    if (idx < 0) {
      return { data: { user: null }, error: { message: 'User not found.' } };
    }

    const current = users[idx];
    users[idx] = {
      ...current,
      passwordHash: updates.password ? await hashPassword(updates.password) : current.passwordHash,
      user_metadata: {
        ...current.user_metadata,
        ...(updates.data || {}),
      },
    };

    writeUsers(users);

    const nextSession: LocalSession = {
      ...session,
      user: stripPassword(users[idx]),
    };

    writeSession(nextSession);
    notify('USER_UPDATED', nextSession);

    return { data: { user: nextSession.user }, error: null };
  },

  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => listeners.delete(callback),
        },
      },
    };
  },
};

export const supabase = { auth };
