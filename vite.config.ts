import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

import { viteStaticCopy } from 'vite-plugin-static-copy';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backendTarget = process.env.WEBUI_BACKEND_URL || 'http://localhost:8080';

// The /graph page is a thin redirector: SvelteKit prerenders it to
// build/graph.html, but because +layout.js sets ssr=false globally,
// <svelte:head> content is stripped from the prerendered HTML — so
// the usual "<meta http-equiv='refresh'> in <head>" pattern does NOT
// make it into the static file. Without the meta in <head>, the
// browser would render the SPA shell body, then the JS bundle would
// hydrate and run the redirector component, then the user would see
// the redirect — with a visible open-webui frame in between.
//
// This plugin post-processes the prerendered build/graph.html and
// injects a <meta http-equiv="refresh" content="0; url=..."> tag
// directly into <head>. The browser parses <head> BEFORE painting
// any body content, so the meta refresh is honored synchronously
// and no open-webui frame ever appears on screen.
//
// The target URL mirrors LIGHTRAG_BASE_URL in src/lib/constants.ts.
// Keeping the literal here is intentional: the constants file is
// runtime client config; this build-time plugin does not import it
// (would require TS resolution inside vite.config.ts). If
// LIGHTRAG_BASE_URL ever changes, update both places.
function injectGraphMetaRefresh(): Plugin {
	const targetUrl = 'http://127.0.0.1:9621/webui/';
	return {
		name: 'inject-graph-meta-refresh',
		closeBundle() {
			const file = resolve('build/graph.html');
			if (!existsSync(file)) return; // prerender disabled; nothing to do
			const html = readFileSync(file, 'utf8');
			if (html.includes('http-equiv="refresh"')) return; // idempotent
			const meta = `<meta http-equiv="refresh" content="0; url=${targetUrl}">`;
			const updated = html.replace('</head>', `\t\t${meta}\n\t</head>`);
			writeFileSync(file, updated);
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
		injectGraphMetaRefresh()
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
