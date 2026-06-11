/**
 * Tiny zero-dependency terminal styling helpers.
 * Keeps the tour readable on a projector during a live demo.
 */

const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;

const wrap = (open: number, close: number) => (s: string) =>
  useColor ? `\x1b[${open}m${s}\x1b[${close}m` : s;

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  italic: wrap(3, 23),
  underline: wrap(4, 24),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
  white: wrap(97, 39),
};

const W = 76;

export function banner(title: string, subtitle?: string): void {
  const line = '─'.repeat(W);
  console.log('\n' + c.cyan('╭' + line + '╮'));
  console.log(c.cyan('│') + center(c.bold(title), W) + c.cyan('│'));
  if (subtitle) console.log(c.cyan('│') + center(c.dim(subtitle), W) + c.cyan('│'));
  console.log(c.cyan('╰' + line + '╯'));
}

let sceneNo = 0;
export function scene(title: string, blurb?: string): void {
  sceneNo += 1;
  console.log('\n' + c.magenta(`  ▌ ${String(sceneNo).padStart(2, '0')} · `) + c.bold(c.white(title)));
  if (blurb) console.log(c.gray('  ┆ ') + c.gray(blurb));
  console.log(c.gray('  ┆'));
}

export const ok = (msg: string) => console.log(c.gray('  ┆ ') + c.green('✓ ') + msg);
export const info = (msg: string) => console.log(c.gray('  ┆ ') + c.blue('• ') + msg);
export const warn = (msg: string) => console.log(c.gray('  ┆ ') + c.yellow('⚠ ') + msg);
export const fail = (msg: string) => console.log(c.gray('  ┆ ') + c.red('✗ ') + msg);
export const note = (msg: string) => console.log(c.gray('  ┆   ') + c.dim(msg));
export const raw = (msg: string) => console.log(c.gray('  ┆ ') + msg);

export function kv(key: string, value: string): void {
  console.log(c.gray('  ┆ ') + c.cyan(key.padEnd(22)) + ' ' + value);
}

/** A small left-aligned table with a header row. */
export function table(headers: string[], rows: string[][], widths: number[]): void {
  const head = headers.map((h, i) => c.bold(h.padEnd(widths[i] ?? 12))).join(c.gray(' '));
  raw(head);
  raw(c.gray('  ' + widths.map((w) => '─'.repeat(w)).join('──')));
  for (const r of rows) {
    raw(r.map((cell, i) => (cell ?? '').padEnd(widths[i] ?? 12)).join(c.gray(' ')));
  }
}

export function link(label: string, url: string): void {
  console.log(c.gray('  ┆ ') + c.green('↗ ') + label + ' ' + c.underline(c.blue(url)));
}

/** Pretty-print a code-ish payload object with bigints rendered as strings. */
export function payload(obj: unknown): void {
  const json = JSON.stringify(
    obj,
    (_k, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v),
    2,
  );
  for (const ln of json.split('\n')) console.log(c.gray('  ┆   ') + c.dim(ln));
}

function center(s: string, width: number): string {
  // strip ANSI for length measurement
  const visible = s.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, width - visible.length);
  const left = Math.floor(pad / 2);
  return ' '.repeat(left) + s + ' '.repeat(pad - left);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
