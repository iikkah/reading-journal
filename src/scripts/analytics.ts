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
	{ canvasId: 'chart-year', emptyId: 'empty-year', filter: 'year', series: (result) => result.completedByYear, label: 'Completed reading events' },
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
				if (select && [...select.options].some((option) => option.value === String(label))) {
					select.value = String(label);
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
	document.getElementById('kpi-completed')!.textContent = String(result.completedEvents);
	document.getElementById('kpi-reading')!.textContent = String(result.currentlyReadingBooks);
	document.getElementById('kpi-rating')!.textContent = result.averageRating === null
		? '—'
		: `${numberFormat.format(result.averageRating)}/5`;

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
