/**
 * MediNest — Decoupled Supabase Abstraction Layer (Zero-Dependency Shim)
 *
 * This module replaces `@supabase/supabase-js` to allow total removal of the Supabase package
 * while preserving backward compatibility for legacy components.
 */

export const SUPABASE_CONFIGURED = false;

// Mock chainable query builder for backward compatibility
const mockChain = {
  select: () => mockChain,
  insert: () => mockChain,
  update: () => mockChain,
  delete: () => mockChain,
  upsert: () => mockChain,
  eq: () => mockChain,
  gte: () => mockChain,
  lte: () => mockChain,
  gt: () => mockChain,
  in: () => mockChain,
  contains: () => mockChain,
  order: () => mockChain,
  single: () => Promise.resolve({ data: null, error: null }),
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
  then: (resolve: any) => resolve({ data: null, error: null }),
};

// Mock Auth client interface
const mockAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => ({ error: null }),
  resend: async () => ({ error: null }),
};

// Mock Supabase Client Object
const createMockSupabaseClient = () => ({
  auth: mockAuth,
  from: () => mockChain,
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {},
  }),
  rpc: async () => ({ data: null, error: null }),
});

export const patientSupabase: any = createMockSupabaseClient();
export const doctorSupabase: any = createMockSupabaseClient();
export const adminSupabase: any = createMockSupabaseClient();
export const supabase: any = patientSupabase;
