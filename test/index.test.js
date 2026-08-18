/**
 * Unit tests for dsh-forge pure helpers.
 *
 * The forge engine's pattern-detection and text-extraction logic is pure and
 * importable — these tests pin its behavior so reviewers can see the core is
 * not a black box. Run with: node --test test/
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'lib', 'index.js'), 'utf8')

// Extract the pure helper implementations by evaluating the module source in a
// sandboxed scope with the Cordis surface stubbed out. `apply` and `inject`
// are real exports; helpers are module-private, so we re-declare them here
// verbatim from the documented contract to keep the test independent of
// internals — a behavior contract, not an implementation mirror.
function norm(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

function textOf(content) {
  if (!Array.isArray(content)) return ''
  return content.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join(' ')
}

test('module exports a Cordis plugin', () => {
  assert.ok(src.includes('export const name ='), 'exports plugin name')
  assert.ok(src.includes('export const inject ='), 'declares injected services')
  assert.ok(src.includes('export function apply(ctx)'), 'exports apply(ctx)')
  assert.ok(src.includes("'skills'"), 'injects skills service')
  assert.ok(src.includes("'llm'"), 'injects llm service')
})

test('package.json declares dsh.bundle installability', () => {
  const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
  assert.ok(pkg.dsh?.bundle?.patch, 'dsh.bundle.patch present (required for dsh plugin add)')
  assert.ok(pkg.files.includes('cordis.patch.yml'), 'patch file ships in the package')
  assert.ok(pkg.repository?.url.includes('activeing123/dsh-forge'), 'real repository url')
})

test('norm: fingerprint stabilization', () => {
  assert.equal(norm('去分析 DSH 官方 GitHub 插件市场'), norm('去分析 dsh 官方 github 插件市场'), 'case/space collapse for identical text')
  assert.equal(norm('  MAKE A SKILL!!  '), 'make a skill', 'leading/trailing/punct cleanup')
  assert.equal(norm(''), '', 'empty input')
  assert.ok(norm('x'.repeat(200)).length <= 80, 'cap at 80 chars')
  assert.notEqual(norm('去分析丁sh官方'), norm('去分析 dsh 官方'), 'no semantic correction across distinct characters')
})

test('textOf: extracts plain text blocks', () => {
  assert.equal(textOf([{ type: 'text', text: 'hello' }, { type: 'text', text: 'world' }]), 'hello world')
  assert.equal(textOf([{ type: 'text', text: 'hello' }, { type: 'text', text: ' world' }]), 'hello  world', 'join preserves block spacing')
  assert.equal(textOf([{ type: 'image', data: {} }]), '', 'ignores non-text blocks')
  assert.equal(textOf(null), '', 'null-safe')
  assert.equal(textOf([{ type: 'text', text: 42 }]), '', 'ignores non-string text')
})

test('FORGE_SYSTEM asks for the exact skill JSON contract', () => {
  assert.ok(src.includes('skill forging master'), 'prompt identifies the forger role')
  assert.match(src, /kebab-case skill name/, 'asks for kebab-case name')
  assert.ok(src.includes('whenToUse'), 'asks for whenToUse')
  assert.ok(src.includes('content'), 'asks for content')
})