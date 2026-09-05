export function buildLdrUploadForm(chatId: string, files: File[]): FormData {
	const fd = new FormData();
	fd.append('chat_id', chatId);
	for (const f of files) fd.append('files', f);
	return fd;
}
