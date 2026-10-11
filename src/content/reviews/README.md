# Writing book reviews

Create one Markdown file for a book, using its existing `book_id` as the filename. For example, the review for book `1` belongs in `src/content/reviews/1.md`.

Write the review as ordinary Markdown and add frontmatter with the matching `book_id`. The optional `rating` must be a number from 1 to 5. Astro renders the file inside that book's detail page at `/books/1/`.

```md
---
book_id: "1"
rating: 4 # optional; a whole number from 1 to 5
---

## What stayed with me

Write your review here. Markdown supports **bold**, *italic*, lists, links, and blockquotes.
```

The filename remains the review ID; do not add a separate review ID field. Keep `book_id` aligned with the filename and the matching value in `src/data/books.csv`. Leave out `rating` when you do not want to score a book. A missing rating is accepted and is not shown on the page.
