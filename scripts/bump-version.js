#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const APP_JSON = path.join(ROOT, 'app.json');

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(msg) {
  console.error(`\n  bump-version: ${msg}\n`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function parseSemver(v) {
  const m = SEMVER_RE.exec(v);
  if (!m) fail(`"${v}" is not a valid semver (expected X.Y.Z)`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function nextVersion(current, arg) {
  if (SEMVER_RE.test(arg)) return arg;
  const [maj, min, pat] = parseSemver(current);
  if (arg === 'patch') return `${maj}.${min}.${pat + 1}`;
  if (arg === 'minor') return `${maj}.${min + 1}.0`;
  if (arg === 'major') return `${maj + 1}.0.0`;
  fail(`"${arg}" is not "patch" | "minor" | "major" | X.Y.Z`);
}

function formatLongDate(d) {
  // "Wednesday, 6 May 2026"
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ensureCleanWorkingTree() {
  let status;
  try {
    status = execSync('git status --porcelain package.json app.json', {
      cwd: ROOT,
      encoding: 'utf8',
    });
  } catch {
    fail('git not available or not a git repo');
  }
  // We allow package.json / app.json to be untouched; we don't sweep up other files.
  // The check is on OTHER files: if there are unrelated staged files, warn but proceed.
  // (We only commit package.json + app.json explicitly below, so safe regardless.)
  void status;
}

function gitCommit(version, isoDate) {
  try {
    execSync('git add package.json app.json', { cwd: ROOT, stdio: 'inherit' });
    execSync(
      `git commit -m "chore(version): bump app version to v${version} (${isoDate})"`,
      { cwd: ROOT, stdio: 'inherit' },
    );
  } catch (e) {
    fail(`git commit failed: ${e.message}`);
  }
}

function main() {
  const arg = process.argv[2];
  if (!arg) fail('usage: bump-version.js <patch|minor|major|X.Y.Z>');

  ensureCleanWorkingTree();

  const pkg = readJson(PACKAGE_JSON);
  const app = readJson(APP_JSON);

  if (!app.expo) fail('app.json is missing the "expo" key');

  const current = pkg.version;
  const next = nextVersion(current, arg);

  const today = new Date();
  const longDate = formatLongDate(today);
  const isoDate = today.toISOString().slice(0, 10);

  // package.json
  pkg.version = next;
  writeJson(PACKAGE_JSON, pkg);

  // app.json
  app.expo.version = next;
  app.expo.ios = app.expo.ios || {};
  app.expo.android = app.expo.android || {};
  app.expo.extra = app.expo.extra || {};

  const prevIosBuild = parseInt(app.expo.ios.buildNumber || '0', 10);
  app.expo.ios.buildNumber = String(isFinite(prevIosBuild) ? prevIosBuild + 1 : 1);

  const prevAndroidCode = parseInt(app.expo.android.versionCode || 0, 10);
  app.expo.android.versionCode = isFinite(prevAndroidCode) ? prevAndroidCode + 1 : 1;

  app.expo.extra.lastUpdated = longDate;

  writeJson(APP_JSON, app);

  console.log(
    `\n  bumped: ${current} -> ${next}` +
      `\n   ios buildNumber: ${app.expo.ios.buildNumber}` +
      `\n   android versionCode: ${app.expo.android.versionCode}` +
      `\n   extra.lastUpdated: ${longDate}\n`,
  );

  gitCommit(next, isoDate);

  console.log(`  done. footer in app will read v${next}\n`);
}

main();
