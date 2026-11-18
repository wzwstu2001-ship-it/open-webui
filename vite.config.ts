import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

import { viteStaticCopy } from 'vite-plugin-static-copy';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backendTarget = process.env.WEBUI_BACKEND_URL || 'http://localhost:8080';

// The /graph and /extract pages are thin redirectors: SvelteKit prerenders
// them to build/graph.html / build/extract.html, but because +layout.js sets
// ssr=false globally, <svelte:head> content is stripped from the prerendered
// HTML — so the usual "<meta http-equiv='refresh'> in <head>" pattern does NOT
// make it into the static file. Without the meta in <head>, the browser would
// render the SPA shell body, then the JS bundle would hydrate and run the
// redirector component, then the user would see the redirect — with a visible
// open-webui frame in between.
//
// This plugin post-processes those prerendered files and injects a
// <meta http-equiv="refresh" content="0; url=..."> tag directly into <head>.
// The browser parses <head> BEFORE painting any body content, so the meta
// refresh is honored synchronously and no open-webui frame ever appears.
//
// The target URLs mirror LIGHTRAG_BASE_URL / UNION_AGENT_BASE_URL in
// src/lib/constants.ts. Keeping the literals here is intentional: the
// constants file is runtime client config; this build-time plugin does not
// import it (would require TS resolution inside vite.config.ts). If either
// constant ever changes, update both places.
const REDIRECT_PAGES = [
	{ file: 'build/graph.html', target: 'http://127.0.0.1:9621/webui/' },
	{ file: 'build/extract.html', target: 'http://127.0.0.1:8090/' }
];

function injectRedirectMetaRefresh(): Plugin {
	return {
		name: 'inject-redirect-meta-refresh',
		closeBundle() {
			for (const { file, target } of REDIRECT_PAGES) {
				const path = resolve(file);
				if (!existsSync(path)) continue; // prerender disabled; nothing to do
				const html = readFileSync(path, 'utf8');
				if (html.includes('http-equiv="refresh"')) continue; // idempotent
				const meta = `<meta http-equiv="refresh" content="0; url=${target}">`;
				const updated = html.replace('</head>', `\t\t${meta}\n\t</head>`);
				writeFileSync(path, updated);
			}
		}
	};
}

export default defineConfig({
	plugins: [
		sveltekit(),
		viteStaticCopy({
			targets: [
				{
					src: 'node_modules/onnxruntime-web/dist/*.jsep.*',

					dest: 'wasm'
				}
			]
		}),
		injectRedirectMetaRefresh()
	],
	define: {
		APP_VERSION: JSON.stringify(process.env.npm_package_version),
		APP_BUILD_HASH: JSON.stringify(process.env.APP_BUILD_HASH || 'dev-build')
	},
	build: {
		sourcemap: true
	},
	server: {
		proxy: {
			'/api': {
				target: backendTarget,
				changeOrigin: true,
				ws: true
			},
			'/ollama': {
				target: backendTarget,
				changeOrigin: true
			},
			'/openai': {
				target: backendTarget,
				changeOrigin: true
			},
			'/oauth': {
				target: backendTarget,
				changeOrigin: true
			},
			'/ws': {
				target: backendTarget,
				changeOrigin: true,
				ws: true
			}
		}
	},
	worker: {
		format: 'es'
	},
	esbuild: {
		pure: process.env.ENV === 'dev' ? [] : ['console.log', 'console.debug', 'console.error']
	}
});
