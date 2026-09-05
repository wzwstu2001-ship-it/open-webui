<script lang="ts">
	import { onMount } from 'svelte';
	import { LIGHTRAG_BASE_URL } from '$lib/constants';

	interface GraphNode {
		id: string;
		labels: string[];
		properties: Record<string, unknown>;
	}

	interface GraphEdge {
		id: string;
		type: string | null;
		source: string;
		target: string;
		properties: Record<string, unknown>;
	}

	interface KnowledgeGraph {
		nodes: GraphNode[];
		edges: GraphEdge[];
		is_truncated: boolean;
	}

	let labels: string[] = [];
	let selected = '';
	let graph: KnowledgeGraph | null = null;
	let loading = false;
	let error = '';

	async function loadLabels() {
		try {
			const res = await fetch(`${LIGHTRAG_BASE_URL}/graph/label/list`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			labels = await res.json();
		} catch (e) {
			error = `Failed to load labels: ${e}`;
		}
	}

	async function loadGraph() {
		if (!selected) {
			graph = null;
			return;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch(
				`${LIGHTRAG_BASE_URL}/graphs?label=${encodeURIComponent(selected)}&max_depth=1&max_nodes=100`
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			graph = await res.json();
		} catch (e) {
			error = `Failed to load graph: ${e}`;
		} finally {
			loading = false;
		}
	}

	onMount(loadLabels);
</script>

<div class="p-4">
	<h1 class="text-lg font-semibold mb-4">Knowledge Graph</h1>
	<div class="flex gap-2 mb-4">
		<select
			bind:value={selected}
			on:change={loadGraph}
			class="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-transparent"
		>
			<option value="">Select a label…</option>
			{#each labels as label}
				<option value={label}>{label}</option>
			{/each}
		</select>
	</div>

	{#if error}
		<p class="text-red-500 text-sm">{error}</p>
	{/if}
	{#if loading}
		<p class="text-sm">Loading…</p>
	{/if}
	{#if graph}
		{#if graph.is_truncated}
			<p class="text-sm text-gray-500 mb-2">Graph truncated to the top nodes.</p>
		{/if}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<section>
				<h2 class="font-medium mb-2">Entities ({graph.nodes.length})</h2>
				<ul class="space-y-1">
					{#each graph.nodes as node}
						<li class="border rounded p-2 text-sm">
							<span class="font-medium">{node.id}</span>
							{#if node.labels?.length}
								<span class="text-gray-500">({node.labels.join(', ')})</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
			<section>
				<h2 class="font-medium mb-2">Relations ({graph.edges.length})</h2>
				<ul class="space-y-1">
					{#each graph.edges as edge}
						<li class="border rounded p-2 text-sm">
							<span>{edge.source}</span>
							<span class="text-gray-500">{edge.type ? ` —${edge.type}→ ` : ' → '}</span>
							<span>{edge.target}</span>
						</li>
					{/each}
				</ul>
			</section>
		</div>
	{/if}
</div>
