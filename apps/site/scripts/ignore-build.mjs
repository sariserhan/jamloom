import {execFileSync} from 'node:child_process';

// Vercel: 0 skips, 1 builds. Uncertain history always builds.
let skip = false;
try {
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const current = process.env.VERCEL_GIT_COMMIT_SHA;
  if (/^[a-f0-9]{40}$/.test(previous ?? '') && /^[a-f0-9]{40}$/.test(current ?? '') && previous !== current) {
    const cwd = execFileSync('git', ['rev-parse','--show-toplevel'], {encoding:'utf8',timeout:10000}).trim();
    const git = (...args) => execFileSync('git', ['-c','diff.relative=false',...args], {cwd,encoding:'utf8', timeout:10000, maxBuffer:4*1024*1024, stdio:['ignore','pipe','pipe']});
    const head = git('rev-parse', 'HEAD').trim();
    if (head === current) {
      git('merge-base', '--is-ancestor', previous, current);
      const files = git('diff', '--name-only', '--no-renames', '-z', previous, current, '--').split('\0').filter(Boolean);
      skip = files.length > 0 && files.every(path => /^(docs\/|apps\/ios\/|apps\/desktop-companion\/)/.test(path) || ['TODO.md','README.md','AGENTS.md'].includes(path));
    }
  }
} catch { /* Missing shallow history, timeout or an unknown base must not suppress a release. */ }
console.log(skip ? 'Skip website build: only documentation or native app changes since the previous deployment.' : 'Build website: relevant changes, explicit rebuild, or unverified deployment history.');
process.exitCode = skip ? 0 : 1;
