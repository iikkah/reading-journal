import type { AnalyticsDataset } from './analytics';

export type AnalyticsFilters = {
	year: string;
	language: string;
	format: string;
	author: string;
	rating: string;
};

export type CountChart = { labels: string[]; values: number[] };

export type AnalyticsResult = {
	totalBooks: number;
	completedBooks: number;
	completedEvents: number;
	currentlyReadingBooks: number;
	averageRating: number | null;
	averageReadingDays: number | null;
	completedByYear: CountChart;
	completedByMonth: CountChart;
	ratings: CountChart;
	byLanguage: CountChart;
	byFormat: CountChart;
	mostReadAuthors: CountChart;
};

const countBy = (values: string[]): CountChart => {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	return { labels: sorted.map(([label]) => label), values: sorted.map(([, count]) => count) };
};

export function calculateAnalytics(dataset: AnalyticsDataset, filters: AnalyticsFilters): AnalyticsResult {
	const selectedBooks = dataset.books.filter((book) => {
		if (filters.language && book.language !== filters.language) return false;
		if (filters.format && book.format !== filters.format) return false;
		if (filters.author && book.author !== filters.author) return false;
		if (filters.rating && String(book.rating ?? '') !== filters.rating) return false;
		if (filters.year && !dataset.events.some((event) => event.bookId === book.bookId && event.completedYear === filters.year)) return false;
		return true;
	});

	const selectedBookIds = new Set(selectedBooks.map((book) => book.bookId));
	const selectedEvents = dataset.events.filter((event) =>
		selectedBookIds.has(event.bookId) && (!filters.year || event.completedYear === filters.year),
	);
	const completedEvents = selectedEvents.filter((event) => event.status === 'read');
	const latestEventByBook = new Map<string, (typeof dataset.events)[number]>();
	for (const event of dataset.events) {
		const current = latestEventByBook.get(event.bookId);
		const eventDate = event.finishedOn || event.startedOn;
		const currentDate = current?.finishedOn || current?.startedOn || '';
		if (!current || eventDate > currentDate || (!eventDate && !currentDate)) latestEventByBook.set(event.bookId, event);
	}
	const currentlyReadingIds = new Set(
		[...latestEventByBook].filter(([, event]) => event.status === 'reading').map(([bookId]) => bookId),
	);
	const ratedBooks = selectedBooks.filter((book) => book.rating !== undefined);
	const averageRating = ratedBooks.length
		? ratedBooks.reduce((total, book) => total + book.rating!, 0) / ratedBooks.length
		: null;
	const readingDurations = completedEvents.flatMap((event) => {
		if (!event.startedOn || !event.finishedOn) return [];
		const start = Date.parse(`${event.startedOn}T00:00:00Z`);
		const finish = Date.parse(`${event.finishedOn}T00:00:00Z`);
		if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) return [];
		return [Math.round((finish - start) / 86_400_000)];
	});

	const ratingCounts = new Map<number, number>([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
	for (const book of selectedBooks) {
		if (book.rating !== undefined) ratingCounts.set(book.rating, (ratingCounts.get(book.rating) ?? 0) + 1);
	}

	const yearCounts = countBy(completedEvents.flatMap((event) => event.completedYear ? [event.completedYear] : []));
	const monthCounts = countBy(completedEvents.flatMap((event) => event.finishedOn ? [event.finishedOn.slice(0, 7)] : []));
	const monthLabels = [...monthCounts.labels].sort();
	const completedByMonth = {
		labels: monthLabels,
		values: monthLabels.map((month) => monthCounts.values[monthCounts.labels.indexOf(month)]),
	};
	const authorCounts = countBy(completedEvents.map((event) => event.author));
	const topAuthors = { labels: authorCounts.labels.slice(0, 10), values: authorCounts.values.slice(0, 10) };

	return {
		totalBooks: selectedBooks.length,
		completedBooks: new Set(completedEvents.map((event) => event.bookId)).size,
		completedEvents: completedEvents.length,
		currentlyReadingBooks: selectedBooks.filter((book) => currentlyReadingIds.has(book.bookId)).length,
		averageRating,
		averageReadingDays: readingDurations.length
			? readingDurations.reduce((total, duration) => total + duration, 0) / readingDurations.length
			: null,
		completedByYear: yearCounts,
		completedByMonth,
		ratings: {
			labels: [1, 2, 3, 4, 5].map(String),
			values: [1, 2, 3, 4, 5].map((rating) => ratingCounts.get(rating) ?? 0),
		},
		byLanguage: countBy(selectedBooks.map((book) => book.language)),
		byFormat: countBy(selectedBooks.map((book) => book.format)),
		mostReadAuthors: topAuthors,
	};
}
