import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { checkIdentity, findMarkers } from './check-identity.mjs';

// Built from parts so this file never holds a marker the guard would refuse.
const toolAddress = (domain) => `${'no'}reply@${domain}`;
const TRAILER = `${['Co', 'Authored', 'By'].join('-')}: Some Tool <${toolAddress('anthropic.com')}>`;
const FOOTER = ['Generated', 'with'].join(' ') + ' [Some Tool](https://example.com/tool)';
const ROBOT = String.fromCodePoint(0x1f916);

const repos = [];

function aRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'rk-identity-'));
  repos.push(dir);
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'core.autocrlf=false',
        '-c',
        'user.name=Test Person',
        '-c',
        'user.email=person@example.com',
        ...args,
      ],
      { cwd: dir, encoding: 'utf8' },
    );
  git('init', '--quiet', '--initial-branch=main');
  return {
    dir,
    commit(file, contents, message) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), contents);
      git('add', file);
      git('commit', '--quiet', '-m', message);
    },
  };
}

afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('the identity guard', () => {
  it('passes a clean commit and file', () => {
    const repo = aRepo();
    repo.commit('src/a.ts', 'export const a = 1;\n', 'T-010: add a');

    expect(checkIdentity({ cwd: repo.dir }).hits).toEqual([]);
  });

  it('refuses a co-author trailer in a commit message', () => {
    const repo = aRepo();
    repo.commit('src/a.ts', 'export const a = 1;\n', `T-010: add a\n\n${TRAILER}`);

    const { hits } = checkIdentity({ cwd: repo.dir });

    expect(hits).toContainEqual(expect.objectContaining({ marker: 'co-author trailer' }));
    expect(hits.every((hit) => hit.place.startsWith('commit '))).toBe(true);
  });

  it('refuses a generated-with footer and a robot-emoji footer in a tracked file', () => {
    const repo = aRepo();
    repo.commit('README.md', `# Title\n\n${ROBOT} ${FOOTER}\n`, 'T-010: add readme');

    const markers = checkIdentity({ cwd: repo.dir }).hits.map(
      (hit) => `${hit.place} ${hit.marker}`,
    );

    expect(markers).toEqual(['README.md generated-with footer', 'README.md robot-emoji footer']);
  });

  it('passes a bare model or tool name and prose that mentions the rule', () => {
    const repo = aRepo();
    const prose = `| Model | Opus 4.8 |\nNever add a "${TRAILER.split(':')[0]}" trailer.\n`;
    repo.commit('notes.md', prose, 'T-010: Opus 4.8 wrote the plan');

    expect(checkIdentity({ cwd: repo.dir }).hits).toEqual([]);
  });

  it('ignores the excluded record trees', () => {
    const repo = aRepo();
    repo.commit('aidlc/audit.md', `${TRAILER}\n`, 'T-010: add audit');

    expect(checkIdentity({ cwd: repo.dir }).hits).toEqual([]);
  });

  it('refuses a tool address as the commit author', () => {
    const repo = aRepo();
    repo.commit('src/a.ts', 'export const a = 1;\n', 'T-010: add a');
    execFileSync(
      'git',
      [
        '-c',
        'core.autocrlf=false',
        'commit',
        '--quiet',
        '--amend',
        '--no-edit',
        `--author=Some Tool <${toolAddress('puku.sh')}>`,
      ],
      {
        cwd: repo.dir,
        env: { ...process.env, GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' },
      },
    );

    expect(checkIdentity({ cwd: repo.dir }).hits).toContainEqual(
      expect.objectContaining({ marker: 'tool no-reply address' }),
    );
  });

  it('reports the line of a marker', () => {
    expect(findMarkers(`one\ntwo\n${TRAILER}\n`)).toEqual([
      { marker: 'co-author trailer', line: 3 },
      { marker: 'tool no-reply address', line: 3 },
    ]);
  });
});
