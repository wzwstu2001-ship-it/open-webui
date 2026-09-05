import { describe, expect, it } from 'vitest';
import { buildLdrUploadForm } from './LdrUpload';

describe('buildLdrUploadForm', () => {
	it('appends chat_id and every file to the FormData', () => {
		const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];
		const fd = buildLdrUploadForm('chat-1', files);
		expect(fd.get('chat_id')).toBe('chat-1');
		expect(fd.getAll('files')).toHaveLength(2);
	});
});
