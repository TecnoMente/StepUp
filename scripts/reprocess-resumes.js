#!/usr/bin/env node
// Reprocess resumes by POSTing to the running local API endpoint
// Usage: node scripts/reprocess-resumes.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = process.env.API_URL || 'http://localhost:3000/api/generate/resume';
const MAX_RETRIES = 60; // retry up to ~5 minutes if server is starting
const RETRY_DELAY_MS = 5000;

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function postReprocess(sessionId) {
  const body = { sessionId };
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Session ${sessionId} -> HTTP ${res.status}: ${text}`);
      return false;
    }
    console.log(`Session ${sessionId} reprocessed: HTTP ${res.status}`);
    return true;
  } catch (err) {
    console.error(`Session ${sessionId} -> network error:`, err.message || err);
    throw err;
  }
}

async function run() {
  try {
    // Find sessions that likely need reprocessing: have a resumeJson but missing resumePdfOptions
    const sessions = await prisma.session.findMany({
      where: {
        resumeJson: { not: null },
        resumePdfOptions: null,
      },
      select: { id: true },
    });

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found that need reprocessing. Exiting.');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${sessions.length} sessions to reprocess.`);

    for (const s of sessions) {
      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        try {
          const ok = await postReprocess(s.id);
          if (ok) break; // success for this session
          // if not ok, do not retry immediately; break to avoid infinite loop
          break;
        } catch (err) {
          attempts++;
          console.log(`Retrying session ${s.id} in ${RETRY_DELAY_MS}ms (${attempts}/${MAX_RETRIES})`);
          await sleep(RETRY_DELAY_MS);
        }
      }
      if (attempts >= MAX_RETRIES) console.error(`Gave up reprocessing session ${s.id} after ${MAX_RETRIES} attempts`);
    }

    await prisma.$disconnect();
    console.log('Reprocessing complete.');
  } catch (err) {
    console.error('Error running reprocessor:', err);
    try { await prisma.$disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
