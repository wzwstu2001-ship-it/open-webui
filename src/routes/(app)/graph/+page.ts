// /graph is a thin redirector — we want it to ship as a static HTML
// containing <meta http-equiv="refresh" content="0; url=..."> in
// <head>, so the browser parses it during HTML parsing and triggers
// navigation BEFORE any body content is painted. That requires
// SvelteKit to prerender this route (the rest of the app is
// ssr = false / SPA, so without prerender /graph would also fall
// back to the SPA shell — which means the meta refresh only takes
// effect after the client bundles load and the component hydrates,
// and the user sees the open-webui shell flash before the redirect
// fires).
//
// Prerender one route while the rest of the app stays SPA is
// supported by adapter-static: build emits a real `graph.html`
// alongside the SPA `index.html`, and main.py's SPAStaticFiles
// fallback serves `graph.html` for `/graph` requests before falling
// back to the SPA shell.
export const prerender = true;
