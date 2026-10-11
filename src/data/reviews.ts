import { books } from './reading-data';

type ReviewFrontmatter = {
	book_id?: unknown;
	rating?: unknown;
};

type ReviewModule = {
	Content: import('astro/runtime/server/index.js').AstroComponentFactory;
	frontmatter: ReviewFrontmatter;
};

export type BookReview = {
	book_id: string;
	rating?: number;
	Content: ReviewModule['Content'];
};

const reviewFiles = import.meta.glob<ReviewModule>(
	['../content/reviews/*.md', '!../content/reviews/README.md'],
	{ eager: true },
);

const knownBookIds = new Set(books.map((book) => book.book_id));

export const reviews: BookReview[] = Object.entries(reviewFiles)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([path, review]) => {
		const book_id = review.frontmatter.book_id;
		const rating = review.frontmatter.rating;

		if (typeof book_id !== 'string' || !knownBookIds.has(book_id)) {
			throw new Error(`${path}: book_id must match an existing book in books.csv.`);
		}

		if (
			rating !== undefined &&
			(typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)
		) {
			throw new Error(`${path}: rating must be a whole number from 1 to 5.`);
		}

		return { book_id, rating: rating as number | undefined, Content: review.Content };
	});

export function getReviewForBook(bookId: string): BookReview | undefined {
	return reviews.find((review) => review.book_id === bookId);
}

export function getRatingForBook(bookId: string): number | undefined {
	// Reviews are filename-sorted, so this picks the first rated review consistently.
	return reviews.find((review) => review.book_id === bookId && review.rating !== undefined)?.rating;
}
