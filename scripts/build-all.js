#!/usr/bin/env node
/**
 * Regenerate EVERY generated artefact in the hub, in dependency order:
 *
 *   1. build-project-data.js       per project → projects/<slug>/data.{json,js}
 *   2. build-project-dashboard.js  per project → projects/<slug>/index.html
 *   3. build-hub-data.js           once        → hub.json, hub.js
 *   4. build-landing.js            once        → index.html
 *
 * Previously this ran only steps 1 and 3, so `npm run build` left the HTML
 * stale and each caller had to remember two more commands.
 *
 * Run this as the LAST step before committing, from a clean working tree. The
 * generators describe whatever is on disk, so building with uncommitted renames
 * or half-finished project moves bakes a repo state that does not exist into
 * files everyone else pulls.
 *
 * Note: several outputs embed date-relative metrics ("N in the last 7 days",
 * "7d pass rate"), so the same source data yields a different file on a
 * different day. That is why these artefacts conflict between branches built at
 * different times, and why they are only truly correct when built at publish
 * time rather than committed per-branch.
 *
 * Usage: node scripts/build-all.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HUB_ROOT = path.resolve(__dirname, '..');
const PROJECTS_ROOT = path.join(HUB_ROOT, 'projects');

function listProjects() {
  if (!fs.existsSync(PROJECTS_ROOT)) return [];
  return fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    stdio: 'inherit',
    cwd: HUB_ROOT,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const projects = listProjects();
if (projects.length === 0) {
  console.log('[build-all] No projects yet under projects/. Skipping per-project data.');
} else {
  for (const name of projects) {
    run('build-project-data.js', [`--project=${name}`]);
    run('build-project-dashboard.js', [`--project=${name}`]);
  }
}
run('build-hub-data.js', []);
run('build-landing.js', []);
console.log(`[build-all] done — ${projects.length} project(s), hub data + landing page.`);
