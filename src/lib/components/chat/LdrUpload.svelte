<script lang="ts">
	import { chatId } from '$lib/stores';
	import { toast } from 'svelte-sonner';
	import { LDR_BASE_URL } from '$lib/constants';
	import { buildLdrUploadForm } from './LdrUpload';

	let uploading = false;
	let fileInput: HTMLInputElement;

	async function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (!files.length) return;
		if (!$chatId) {
			toast.error('Start or select a chat before uploading documents.');
			return;
		}
		uploading = true;
		try {
			const fd = buildLdrUploadForm($chatId, files);
			const res = await fetch(`${LDR_BASE_URL}/library/api/collections/chat/upload`, {
				method: 'POST',
				body: fd
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body?.error ?? `Upload failed (${res.status})`);
				return;
			}
			toast.success(`Uploaded ${files.length} document(s) to this chat.`);
		} catch (e) {
			toast.error(`Upload error: ${e}`);
		} finally {
			uploading = false;
		}
	}
</script>

<div class="px-2">
	<input bind:this={fileInput} type="file" multiple hidden on:change={onPick} />
	<button
		type="button"
		disabled={uploading}
		on:click={() => fileInput?.click()}
		class="rounded-full px-3 py-1 text-xs font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
	>
		{uploading ? 'Uploading…' : 'Upload to chat'}
	</button>
</div>
