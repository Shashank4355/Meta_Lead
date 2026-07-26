// Persistence dispatcher.
//
// Route handlers and the pipeline import data functions from here. The actual
// implementation is chosen once, at module load, from the runtime config:
//   - hasSupabase() → Supabase (Postgres) persistence  (store-supabase.ts)
//   - otherwise      → seeded in-memory store            (store-memory.ts)
//
// Both modules export the identical function surface, so swapping is transparent
// to callers. This is the single seam for persistence.

import { hasSupabase } from './config';
import * as mem from './store-memory';
import * as sb from './store-supabase';

const impl = hasSupabase() ? sb : mem;

export const listLeads = impl.listLeads;
export const getLead = impl.getLead;
export const getLeadByIdInternal = impl.getLeadByIdInternal;
export const createLead = impl.createLead;
export const updateLead = impl.updateLead;
export const createCallAttempt = impl.createCallAttempt;
export const updateCallAttempt = impl.updateCallAttempt;
export const findCallAttemptByProviderId = impl.findCallAttemptByProviderId;
export const getCallAttemptById = impl.getCallAttemptById;
export const getAnalytics = impl.getAnalytics;
export const listMetaAccounts = impl.listMetaAccounts;
export const getMetaAccountByPageId = impl.getMetaAccountByPageId;
export const createMetaAccount = impl.createMetaAccount;
export const deleteMetaAccount = impl.deleteMetaAccount;
export const getAgentConfig = impl.getAgentConfig;
export const updateAgentConfig = impl.updateAgentConfig;
export const getNotificationConfig = impl.getNotificationConfig;
export const updateNotificationConfig = impl.updateNotificationConfig;
