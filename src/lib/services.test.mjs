import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText

  const mod = new Module(filePath)
  mod.filename = filePath
  mod.paths = Module._nodeModulePaths(path.dirname(filePath))
  mod._compile(compiled, filePath)
  return mod.exports
}

const helpers = loadTsModule(fileURLToPath(new URL('./services.ts', import.meta.url)))

assert.equal(helpers.formatDurationRange(30, 60), '30-60 min')
assert.equal(helpers.formatDurationRange(45, 45), '45 min')
assert.equal(helpers.formatServicePrice(null), null)
assert.equal(helpers.formatServicePrice(undefined), null)
assert.equal(helpers.formatServicePrice(250), '250 DH')

assert.equal(helpers.validateServiceInput({
  name: 'Manucure russe',
  min_duration: 45,
  max_duration: 90,
  price: 300,
}), null)

assert.equal(helpers.validateServiceInput({
  name: '',
  min_duration: 45,
  max_duration: 90,
  price: null,
}), 'Nom obligatoire')

assert.equal(helpers.validateServiceInput({
  name: 'Pose',
  min_duration: 0,
  max_duration: 90,
  price: null,
}), 'Duree invalide')

assert.equal(helpers.validateServiceInput({
  name: 'Pose',
  min_duration: 90,
  max_duration: 45,
  price: null,
}), 'La duree max doit etre superieure a la duree min')

assert.equal(helpers.validateServiceInput({
  name: 'Pose',
  min_duration: 45,
  max_duration: 90,
  price: -10,
}), 'Prix invalide')

console.log('services helpers ok')
