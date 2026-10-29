import { env } from '../config/env.js';
import { Title } from '../db/models.js';
import { geminiConfigured } from '../services/gemini.js';
import { ensureVectorIndex } from './retrieve.js';
import { startSync } from './sync.js';

/** Runs once at boot, in the background: make sure the index exists and an empty catalog gets filled. */
export async function bootstrapRag() {
  if (!geminiConfigured() || process.env.RAG_BOOTSTRAP === 'off') return; // RAG_BOOTSTRAP=off: don't auto-fill the catalog (tests, scratch servers)
  const index = await ensureVectorIndex((m) => console.warn(`[rag] ${m}`));
  const empty = (await Title.estimatedDocumentCount()) === 0;
  console.log(`[rag] vector index: ${index}; catalog empty: ${empty}`);
  if (empty) {
    const { started } = await startSync({ budget: env.sync.embedBudget });
    console.log(`[rag] first-run sync ${started ? 'started' : 'already running'}`);
  }
}
