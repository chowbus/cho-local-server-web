import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * (c) 2026 Chowbus Engineering Team
 * Released under MIT License
 */`;

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/edge-sdk.umd.js',
      format: 'umd',
      name: 'EdgeSDK',
      banner,
      exports: 'auto',
      globals: {}
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },

  {
    input: 'src/index.js',
    output: {
      file: 'dist/edge-sdk.umd.min.js',
      format: 'umd',
      name: 'EdgeSDK',
      banner,
      exports: 'auto',
      sourcemap: true,
      globals: {}
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/edge-sdk.esm.js',
      format: 'es',
      banner,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/edge-sdk.cjs.js',
      format: 'cjs',
      banner,
      exports: 'auto'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }
];