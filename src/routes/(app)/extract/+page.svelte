<script lang="ts">
	import { onMount } from 'svelte';
	import { UNION_AGENT_BASE_URL } from '$lib/constants';

	// /extract is a thin redirector: navigate the tab to the 规程抽取器
	// (union-agent) UI, which runs as its own local process on :8090.
	// Same design as /graph → LightRAG: the meta refresh sits in <head> so
	// the browser fires the navigation while parsing the HTML, before any
	// body content is painted.
	//
	// The sidebar entry points HERE (a same-origin path) rather than
	// straight at :8090, so that a bookmark or a pasted URL also lands on
	// the extractor. The actual jump is done by the meta refresh injected
	// into build/extract.html at build time (see vite.config.ts).
	const extractUrl = `${UNION_AGENT_BASE_URL}/`;

	// 兜底：若这一页是以 SPA 外壳（build/index.html）被送达的 —— 后端只把
	// 无扩展名路径落到 index.html，那张预渲染的 extract.html 就没被用上 ——
	// <meta refresh> 是由 JS 动态插入的，浏览器不一定认。onMount 里显式跳一次，
	// 保证「点侧边栏 → 到抽取器」这条路径任何情况下都通。
	onMount(() => {
		if (window.location.href !== extractUrl) {
			window.location.replace(extractUrl);
		}
	});
</script>

<svelte:head>
	<meta http-equiv="refresh" content="0; url={extractUrl}" />
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
		Redirecting to 规程抽取器…
	</p>
	<a
		href={extractUrl}
		class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
	>
		Click here if you are not redirected ↗
	</a>
</div>
