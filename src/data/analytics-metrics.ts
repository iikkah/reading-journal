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
	completedEvents: number;
	currentlyReadingBooks: number;
	averageRating: number | null;
	completedByYear: CountChart;
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
	const ratedBooks = selectedBooks.filter((book) => book.rating !== undefined);
	const averageRating = ratedBooks.length
		? ratedBooks.reduce((total, book) => total + book.rating!, 0) / ratedBooks.length
		: null;

	const ratingCounts = new Map<number, number>([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
	for (const book of selectedBooks) {
		if (book.rating !== undefined) ratingCounts.set(book.rating, (ratingCounts.get(book.rating) ?? 0) + 1);
	}

	const yearCounts = countBy(completedEvents.flatMap((event) => event.completedYear ? [event.completedYear] : []));
	const authorCounts = countBy(completedEvents.map((event) => event.author));
	const topAuthors = { labels: authorCounts.labels.slice(0, 10), values: authorCounts.values.slice(0, 10) };

	return {
		totalBooks: selectedBooks.length,
		completedEvents: completedEvents.length,
		currentlyReadingBooks: selectedBooks.filter((book) => book.currentlyReading).length,
		averageRating,
		completedByYear: yearCounts,
		ratings: {
			labels: [1, 2, 3, 4, 5].map(String),
			values: [1, 2, 3, 4, 5].map((rating) => ratingCounts.get(rating) ?? 0),
		},
		byLanguage: countBy(selectedBooks.map((book) => book.language)),
		byFormat: countBy(selectedBooks.map((book) => book.format)),
		mostReadAuthors: topAuthors,
	};
}
