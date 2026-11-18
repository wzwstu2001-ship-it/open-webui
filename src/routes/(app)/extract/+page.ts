// /extract is a thin redirector — same idea as /graph (see that file for
// the full reasoning), pointing at the union-agent extractor UI instead of
// the LightRAG Knowledge Graph.
//
// We want it to ship as a static HTML containing
// <meta http-equiv="refresh" content="0; url=..."> in <head>, so the
// browser parses it during HTML parsing and triggers navigation BEFORE any
// body content is painted. That requires SvelteKit to prerender this route
// (the rest of the app is ssr = false / SPA, so without prerender /extract
// would also fall back to the SPA shell — which means the meta refresh only
// takes effect after the client bundles load and the component hydrates,
// and the user sees the open-webui shell flash before the redirect fires).
//
// Prerender one route while the rest of the app stays SPA is supported by
// adapter-static: build emits a real `extract.html` alongside the SPA
// `index.html`, and main.py's SPAStaticFiles (html=True) serves
// `extract.html` for `/extract` requests.
//
// NOTE: the <meta> in <svelte:head> is stripped during prerender because
// src/routes/+layout.js sets ssr = false globally. That is why
// vite.config.ts has a post-build plugin that injects the meta tag into
// build/extract.html directly.
export const prerender = true;
