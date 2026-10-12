import Chart from 'chart.js/auto';
import type { AnalyticsDataset } from '../data/analytics';
import { calculateAnalytics, type AnalyticsFilters, type CountChart } from '../data/analytics-metrics';

type AnalyticsPayload = { dataset: AnalyticsDataset };
type ChartFilter = keyof AnalyticsFilters;
type ChartDefinition = {
	canvasId: string;
	emptyId: string;
	filter: ChartFilter;
	indexAxis?: 'x' | 'y';
	series: (result: ReturnType<typeof calculateAnalytics>) => CountChart;
	label: string;
};

const payloadElement = document.querySelector<HTMLElement>('#analytics-data');
const payload = payloadElement?.dataset.payload;
if (!payload) throw new Error('Analytics data was not embedded in the page.');

const { dataset } = JSON.parse(payload) as AnalyticsPayload;
const filterKeys: ChartFilter[] = ['year', 'language', 'format', 'author', 'rating'];
const filters: AnalyticsFilters = { year: '', language: '', format: '', author: '', rating: '' };

const chartDefinitions: ChartDefinition[] = [
	{ canvasId: 'chart-year', emptyId: 'empty-year', filter: 'year', series: (result) => result.completedByMonth, label: 'Completed reading events' },
	{ canvasId: 'chart-ratings', emptyId: 'empty-ratings', filter: 'rating', series: (result) => result.ratings, label: 'Unique books' },
	{ canvasId: 'chart-language', emptyId: 'empty-language', filter: 'language', series: (result) => result.byLanguage, label: 'Unique books' },
	{ canvasId: 'chart-format', emptyId: 'empty-format', filter: 'format', series: (result) => result.byFormat, label: 'Unique books' },
	{ canvasId: 'chart-authors', emptyId: 'empty-authors', filter: 'author', indexAxis: 'y', series: (result) => result.mostReadAuthors, label: 'Completed reading events' },
];

const charts = new Map<string, Chart>();
Chart.defaults.color = '#62665e';
Chart.defaults.font.family = 'Arial, sans-serif';

for (const definition of chartDefinitions) {
	const canvas = document.getElementById(definition.canvasId) as HTMLCanvasElement | null;
	if (!canvas) continue;

	const chart = new Chart(canvas, {
		type: 'bar',
		data: {
			labels: [],
			datasets: [{
				label: definition.label,
				data: [],
				backgroundColor: '#789078',
				hoverBackgroundColor: '#47634d',
				borderRadius: 4,
				maxBarThickness: 34,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: definition.indexAxis ?? 'x',
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context) => `${definition.label}: ${context.parsed[definition.indexAxis === 'y' ? 'x' : 'y']}`,
					},
				},
			},
			scales: {
				x: { beginAtZero: true, ticks: { precision: 0 }, grid: { display: definition.indexAxis === 'y' } },
				y: { beginAtZero: true, ticks: { precision: 0 }, grid: { display: definition.indexAxis !== 'y' } },
			},
			onClick: (_event, activeElements, activeChart) => {
				const point = activeElements[0];
				if (!point) return;
				const label = activeChart.data.labels?.[point.index];
				if (label === undefined) return;
				const select = document.getElementById(`filter-${definition.filter}`) as HTMLSelectElement | null;
			const filterValue = definition.canvasId === 'chart-year' ? String(label).slice(0, 4) : String(label);
			if (select && [...select.options].some((option) => option.value === filterValue)) {
				select.value = filterValue;
					select.dispatchEvent(new Event('change'));
				}
			},
		},
	});
	charts.set(definition.canvasId, chart);
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function render(): void {
	const result = calculateAnalytics(dataset, filters);
	document.getElementById('kpi-books')!.textContent = String(result.totalBooks);
	document.getElementById('kpi-completed-books')!.textContent = String(result.completedBooks);
	document.getElementById('kpi-completed')!.textContent = String(result.completedEvents);
	document.getElementById('kpi-reading')!.textContent = String(result.currentlyReadingBooks);
	document.getElementById('kpi-rating')!.textContent = result.averageRating === null
		? '—'
		: `${numberFormat.format(result.averageRating)}/5`;
	document.getElementById('kpi-duration')!.textContent = result.averageReadingDays === null
		? '—'
		: numberFormat.format(result.averageReadingDays);

	for (const definition of chartDefinitions) {
		const chart = charts.get(definition.canvasId);
		const empty = document.getElementById(definition.emptyId);
		if (!chart || !empty) continue;

		const series = definition.series(result);
		const hasData = series.values.some((value) => value > 0);
		chart.data.labels = hasData ? series.labels : [];
		chart.data.datasets[0].data = hasData ? series.values : [];
		chart.update();
		(chart.canvas as HTMLCanvasElement).hidden = !hasData;
		empty.hidden = hasData;
	}
}

for (const key of filterKeys) {
	const select = document.getElementById(`filter-${key}`) as HTMLSelectElement | null;
	select?.addEventListener('change', () => {
		filters[key] = select.value;
		render();
	});
}

document.getElementById('clear-filters')?.addEventListener('click', () => {
	for (const key of filterKeys) {
		const select = document.getElementById(`filter-${key}`) as HTMLSelectElement | null;
		if (select) select.value = '';
		filters[key] = '';
	}
	render();
});

render();

const searchInput = document.getElementById('book-search') as HTMLInputElement | null;
const sortSelect = document.getElementById('book-sort') as HTMLSelectElement | null;
const tableBody = document.querySelector<HTMLTableSectionElement>('#book-analysis-table tbody');
const analysisEmpty = document.getElementById('book-analysis-empty');

function updateBookAnalysis(): void {
	if (!tableBody || !analysisEmpty) return;
	const query = searchInput?.value.trim().toLocaleLowerCase() ?? '';
	const rows = [...tableBody.rows];
	const matchingRows = rows.filter((row) =>
		(row.dataset.title ?? '').includes(query) || (row.dataset.author ?? '').includes(query),
	);
	const key = sortSelect?.value ?? 'title';
	matchingRows.sort((left, right) => {
		const leftValue = left.dataset[key] ?? '';
		const rightValue = right.dataset[key] ?? '';
		if (!leftValue) return rightValue ? 1 : 0;
		if (!rightValue) return -1;
		if (key === 'title') return leftValue.localeCompare(rightValue);
		return rightValue.localeCompare(leftValue, undefined, { numeric: true });
	});
	for (const row of rows) row.hidden = !matchingRows.includes(row);
	for (const row of matchingRows) tableBody.append(row);
	analysisEmpty.hidden = matchingRows.length > 0;
}

searchInput?.addEventListener('input', updateBookAnalysis);
sortSelect?.addEventListener('change', updateBookAnalysis);
updateBookAnalysis();
