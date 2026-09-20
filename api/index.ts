/**
 * Vercel entry point.
 *
 * The whole Express app is exported as a single function. Hobby allows at
 * most 12 Serverless Functions per deployment and this API has ~20 routes, so
 * mounting the app once is both simpler and the only thing that fits.
 */
import { createApp } from '../server/app';

export default createApp();
