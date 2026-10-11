import { books, readingEvents } from './reading-data';
import { getRatingForBook } from './reviews';

export type AnalyticsBook = {
	bookId: string;
	title: string;
	author: string;
	language: string;
	format: string;
	rating?: number;
	currentlyReading: boolean;
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
		currentlyReading: events.some((event) => event.bookId === book.book_id && event.status === 'reading'),
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
