import booksCsv from './books.csv?raw';
import eventsCsv from './reading_events.csv?raw';

export type Book = {
	book_id: string;
	title: string;
	author: string;
	publication_year?: string;
	isbn?: string;
	format?: string;
	notes?: string;
	language?: string;
};

export type ReadingEvent = {
	event_id: string;
	book_id: string;
	started_on: string;
	finished_on: string;
	status: 'read' | 'reading' | 'abandoned';
};

function parseCsv(text: string, file: string): Array<{ rowNumber: number; values: Record<string, string> }> {
	text = text.replace(/^\uFEFF/, '').trimEnd();
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (quoted) {
			if (character === '"' && text[index + 1] === '"') {
				field += '"';
				index += 1;
			} else if (character === '"') {
				quoted = false;
			} else {
				field += character;
			}
		} else if (character === '"' && field.length === 0) {
			quoted = true;
		} else if (character === ',') {
			row.push(field);
			field = '';
		} else if (character === '\n' || character === '\r') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			if (character === '\r' && text[index + 1] === '\n') index += 1;
		} else {
			field += character;
		}
	}

	if (quoted) throw new Error(`${file}: an opening quote is missing its closing quote.`);
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	const [headerRow, ...dataRows] = rows;
	if (!headerRow) throw new Error(`${file}: CSV file is missing a header row.`);
	const headers = headerRow.map((header) => header.trim());
	if (new Set(headers).size !== headers.length) throw new Error(`${file}: column names must be unique.`);

	return dataRows
		.map((cells, index) => {
			if (cells.every((cell) => cell.trim() === '')) return null;
			if (cells.length !== headers.length) {
				throw new Error(`${file}, row ${index + 2}: expected ${headers.length} fields, found ${cells.length}.`);
			}
			return {
				rowNumber: index + 2,
				values: Object.fromEntries(headers.map((header, column) => [header, cells[column].trim()])),
			};
		})
		.filter((entry): entry is { rowNumber: number; values: Record<string, string> } => entry !== null);
}

function required(values: Record<string, string>, field: string, file: string, row: number): string {
	const value = values[field];
	if (!value) throw new Error(`${file}, row ${row}: "${field}" is required.`);
	return value;
}

function validateDate(value: string, field: string, file: string, row: number): void {
	if (!value) return;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(`${file}, row ${row}: "${field}" must use YYYY-MM-DD or be blank.`);
	}
	const date = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		throw new Error(`${file}, row ${row}: "${field}" is not a real calendar date.`);
	}
}

function uniqueId(id: string, seen: Set<string>, file: string, row: number): void {
	if (seen.has(id)) throw new Error(`${file}, row ${row}: duplicate ID "${id}".`);
	seen.add(id);
}

const bookRows = parseCsv(booksCsv, 'books.csv');
const eventRows = parseCsv(eventsCsv, 'reading_events.csv');
const bookIds = new Set<string>();

export const books: Book[] = bookRows.map(({ values, rowNumber }) => {
	const book_id = required(values, 'book_id', 'books.csv', rowNumber);
	uniqueId(book_id, bookIds, 'books.csv', rowNumber);
	return {
		book_id,
		title: required(values, 'title', 'books.csv', rowNumber),
		author: required(values, 'author', 'books.csv', rowNumber),
		publication_year: values.publication_year || undefined,
		isbn: values.isbn || undefined,
		format: values.format || undefined,
		notes: values.notes || undefined,
		language: values.language || undefined,
	};
});

const eventIds = new Set<string>();
export const readingEvents: ReadingEvent[] = eventRows.map(({ values, rowNumber }) => {
	const event_id = required(values, 'event_id', 'reading_events.csv', rowNumber);
	const book_id = required(values, 'book_id', 'reading_events.csv', rowNumber);
	uniqueId(event_id, eventIds, 'reading_events.csv', rowNumber);
	if (!bookIds.has(book_id)) {
		throw new Error(`reading_events.csv, row ${rowNumber}: book_id "${book_id}" does not exist in books.csv.`);
	}

	const started_on = values.started_on ?? '';
	const finished_on = values.finished_on ?? '';
	validateDate(started_on, 'started_on', 'reading_events.csv', rowNumber);
	validateDate(finished_on, 'finished_on', 'reading_events.csv', rowNumber);
	if (started_on && finished_on && finished_on < started_on) {
		throw new Error(`reading_events.csv, row ${rowNumber}: finished_on cannot be before started_on.`);
	}

	const status = required(values, 'status', 'reading_events.csv', rowNumber);
	if (!['read', 'reading', 'abandoned'].includes(status)) {
		throw new Error(`reading_events.csv, row ${rowNumber}: status must be read, reading, or abandoned.`);
	}

	return { event_id, book_id, started_on, finished_on, status: status as ReadingEvent['status'] };
});
