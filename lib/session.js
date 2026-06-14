import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// React.cache() deduplicates calls within a single React render tree.
// When both layout.js and a page.js call getSession(), only one JWT
// verification + DB lookup actually runs.
export const getSession = cache(() => getServerSession(authOptions));
