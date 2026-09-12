<script lang="ts">
	import { LIGHTRAG_BASE_URL } from '$lib/constants';

	// /graph is a thin redirector: navigate the tab to the LightRAG
	// WebUI's Knowledge Graph page. The user-facing entry point is the
	// sidebar link in UserMenu.svelte, which points DIRECTLY at this URL
	// (a top-level browser navigation, not a SvelteKit client-side route
	// change) — that is what eliminates the "open-webui shell briefly
	// appears before the redirect fires" flicker reported on 2026-09-13.
	//
	// This /graph route is kept as a fallback for users who land here
	// via direct URL / bookmark / back-forward. We use
	// `<meta http-equiv="refresh">` inside `<svelte:head>` rather than
	// onMount + window.location.replace, because the browser parses
	// <head> BEFORE painting any <body> content, so navigation is
	// synchronous and no open-webui frame ever flashes on screen.
	const lightragWebuiUrl = `${LIGHTRAG_BASE_URL}/webui/`;
</script>

<svelte:head>
	<meta http-equiv="refresh" content="0; url={lightragWebuiUrl}" />
</svelte:head>

<!--
	Fallback body: shown only if the browser ignores the meta refresh
	(very rare — some accessibility / privacy extensions disable meta
	refresh; no-JS environments are not a concern here since SvelteKit
	itself is a JS app). One plain link so the user has a manual
	escape hatch.
-->
<div class="flex flex-col h-full p-4 gap-4 items-center justify-center">
	<p class="text-sm text-gray-500 dark:text-gray-400">
		Redirecting to LightRAG Knowledge Graph…
	</p>
	<a
		href={lightragWebuiUrl}
		class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
	>
		Click here if you are not redirected ↗
	</a>
</div>
