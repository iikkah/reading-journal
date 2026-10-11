# Writing book reviews

Create one Markdown file for a book, using its existing `book_id` as the filename. For example, the review for book `1` belongs in `src/content/reviews/1.md`.

Write the review as ordinary Markdown. No frontmatter or extra data fields are needed. Astro renders the file inside that book's detail page at `/books/1/`.

```md
## What stayed with me

Write your review here. Markdown supports **bold**, *italic*, lists, links, and blockquotes.
```

Leave out the file when you do not have a review. The book page will show a short empty-state message instead. Keep the numeric ID aligned with `book_id` in `src/data/books.csv`.
