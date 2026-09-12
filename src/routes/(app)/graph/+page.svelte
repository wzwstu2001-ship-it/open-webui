<script lang="ts">
	import { onMount } from 'svelte';
	import { LIGHTRAG_BASE_URL } from '$lib/constants';

	let lightragOnline: boolean | null = null;
	let iframeLoaded = false;

	const lightragWebuiUrl = `${LIGHTRAG_BASE_URL}/webui/`;

	async function checkLightragHealth() {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 3000);
			// `/graph/label/list` is open-mode (no auth) and is the cheapest
			// reachability probe that exercises the same CORS path the iframe
			// will use.
			const res = await fetch(`${LIGHTRAG_BASE_URL}/graph/label/list`, {
				signal: controller.signal
			});
			clearTimeout(timeout);
			lightragOnline = res.ok;
		} catch {
			lightragOnline = false;
		}
	}

	function handleIframeLoad(event: Event) {
		iframeLoaded = true;
		// Attempt to pre-set the LightRAG WebUI tab to Knowledge Graph.
		// LightRAG persists `currentTab` via Zustand's localStorage adapter
		// under key `lightrag-settings`; mutating it before first paint makes
		// the SPA land on the graph view instead of the default Documents tab.
		//
		// This works only when the iframe is same-origin with the parent
		// (e.g. during development with both on localhost). In the production
		// cross-origin case (Open WebUI on its own host, LightRAG on :9621),
		// the iframe is a different origin and `contentWindow.localStorage`
		// throws SecurityError — we silently fall through and the user clicks
		// the "Knowledge Graph" tab inside the iframe once, after which
		// Zustand's persist adapter remembers it for subsequent visits.
		const iframe = event.currentTarget as HTMLIFrameElement;
		const win = iframe.contentWindow;
		if (!win) return;
		try {
			const raw = win.localStorage.getItem('lightrag-settings');
			const settings = raw ? JSON.parse(raw) : { state: {}, version: 0 };
			settings.state = settings.state || {};
			settings.state.currentTab = 'knowledge-graph';
			win.localStorage.setItem('lightrag-settings', JSON.stringify(settings));
		} catch {
			// Cross-origin: ignore. The iframe will load with its default tab;
			// the user picks Knowledge Graph once.
		}
	}

	onMount(() => {
		checkLightragHealth();
	});
</script>

<div class="flex flex-col h-full p-4 gap-4">
	<div class="flex items-center gap-3 flex-wrap">
		<h1 class="text-lg font-semibold">Knowledge Graph</h1>
		<a
			href={lightragWebuiUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
		>
			Open full LightRAG graph in new tab ↗
		</a>
		{#if lightragOnline === false}
			<span
				class="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
			>
				LightRAG service unavailable at {LIGHTRAG_BASE_URL}
			</span>
		{:else if lightragOnline === true && iframeLoaded}
			<span
				class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
			>
				LightRAG graph ready
			</span>
		{/if}
	</div>

	<!--
		Primary visualisation: the full LightRAG WebUI embedded as an iframe,
		taking the whole main area below the toolbar. LightRAG owns the
		Sigma.js + graphology renderer; reusing it keeps the visualisation
		in sync with upstream without re-implementing colour mapping,
		degree-based sizing, FA2 layout, or pan/zoom controls.

		LightRAG does not set X-Frame-Options / CSP frame-ancestors, so this
		embeds cleanly. The iframe uses the same open-mode HTTP API no other
		call needs (no auth header), so no extra plumbing required.
	-->
	<section
		class="flex-1 min-h-[60vh] lg:min-h-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
	>
		{#if lightragOnline === false}
			<div
				class="flex flex-col items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400 p-6 text-center gap-2"
			>
				<p class="font-medium">LightRAG service is not reachable.</p>
				<p>
					Start the LightRAG backend at <code>{LIGHTRAG_BASE_URL}</code> and
					reload.
				</p>
			</div>
		{:else}
			<iframe
				src={lightragWebuiUrl}
				title="LightRAG Knowledge Graph"
				class="w-full h-full border-0"
				on:load={handleIframeLoad}
			></iframe>
		{/if}
	</section>
</div>
