import { books, readingEvents } from './reading-data';
import { getRatingForBook, getReviewForBook } from './reviews';

export type AnalyticsBook = {
	bookId: string;
	title: string;
	author: string;
	language: string;
	format: string;
	rating?: number;
	status?: 'read' | 'reading' | 'abandoned';
	startedOn?: string;
	finishedOn?: string;
	readingDays?: number;
	readingEventCount: number;
	hasNotesOrReview: boolean;
};

export type AnalyticsEvent = {
	eventId: string;
	bookId: string;
	status: 'read' | 'reading' | 'abandoned';
	startedOn: string;
	finishedOn: string;
	completedYear?: string;
	author: string;
	language: string;
	format: string;
};

export type AnalyticsDataset = {
	books: AnalyticsBook[];
	events: AnalyticsEvent[];
};

const bookById = new Map(books.map((book) => [book.book_id, book]));

const latestEventByBook = new Map<string, (typeof readingEvents)[number]>();
for (const event of readingEvents) {
	const current = latestEventByBook.get(event.book_id);
	const eventDate = event.finished_on || event.started_on;
	const currentDate = current?.finished_on || current?.started_on || '';
	if (!current || eventDate > currentDate || (!eventDate && !currentDate)) {
		latestEventByBook.set(event.book_id, event);
	}
}

function elapsedCalendarDays(startedOn: string, finishedOn: string): number | undefined {
	if (!startedOn || !finishedOn) return undefined;
	const start = Date.parse(`${startedOn}T00:00:00Z`);
	const finish = Date.parse(`${finishedOn}T00:00:00Z`);
	if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) return undefined;
	return Math.round((finish - start) / 86_400_000);
}

const events: AnalyticsEvent[] = readingEvents.map((event) => {
	const book = bookById.get(event.book_id);
	if (!book) throw new Error(`Reading event ${event.event_id} has no matching book.`);

	return {
		eventId: event.event_id,
		bookId: event.book_id,
		status: event.status,
		startedOn: event.started_on,
		finishedOn: event.finished_on,
		completedYear: event.status === 'read' && event.finished_on ? event.finished_on.slice(0, 4) : undefined,
		author: book.author,
		language: book.language || 'Unknown',
		format: book.format || 'Unknown',
	};
});

export const analyticsDataset: AnalyticsDataset = {
	books: books.map((book) => ({
		bookId: book.book_id,
		title: book.title,
		author: book.author,
		language: book.language || 'Unknown',
		format: book.format || 'Unknown',
		rating: getRatingForBook(book.book_id),
		status: latestEventByBook.get(book.book_id)?.status,
		startedOn: latestEventByBook.get(book.book_id)?.started_on || undefined,
		finishedOn: latestEventByBook.get(book.book_id)?.finished_on || undefined,
		readingDays: (() => {
			const event = latestEventByBook.get(book.book_id);
			return event ? elapsedCalendarDays(event.started_on, event.finished_on) : undefined;
		})(),
		readingEventCount: events.filter((event) => event.bookId === book.book_id).length,
		hasNotesOrReview: Boolean(book.notes || getReviewForBook(book.book_id)),
	})),
	events,
};

export const analyticsFilterOptions = {
	years: [...new Set(events.flatMap((event) => event.completedYear ? [event.completedYear] : []))].sort(),
	languages: [...new Set(books.map((book) => book.language || 'Unknown'))].sort(),
	formats: [...new Set(books.map((book) => book.format || 'Unknown'))].sort(),
	authors: [...new Set(books.map((book) => book.author))].sort(),
	ratings: [1, 2, 3, 4, 5],
};
