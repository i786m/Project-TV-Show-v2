// High-level application state
// - `shows`: cached list of shows fetched from the API
// - `showSearchText`: current search query for shows listing
// - `episodesByShowId`: cache of episodes per show
// - `episodeSearchText`: search query within the selected show's episodes
// - `currentView`: toggles between shows listing and episodes listing
// - `selectedShowId`: currently active show whose episodes are shown
// - `selectedEpisodeId`: selected episode in the dropdown (empty = all)
// - `status`/`errorMessage`: loading and error state for the whole app
const state = {
	status: 'idle',
	errorMessage: '',
	currentView: 'shows',
	shows: [],
	showSearchText: '',
	episodesByShowId: {},
	selectedShowId: '',
	episodeSearchText: '',
	selectedEpisodeId: '',
};

const fetchCache = new Map();

const searchResults = document.getElementById('search-results');
const showSearchInput = document.getElementById('show-search');
const showSelectControl = document.getElementById('tv-show-select');
const episodeSelectControl = document.getElementById('episode-select');
const episodeSearchInput = document.getElementById('episode-search');
const backButton = document.getElementById('back-to-shows');
const showsCountText = document.getElementById('shows-count');
const showsToolbar = document.getElementById('shows-toolbar');
const episodesToolbar = document.getElementById('episodes-toolbar');

/*
 * App initialization
 * - Sets loading state and renders status while fetching data
 * - Attaches UI listeners for search and selection controls
 * - Fetches shows from the API and prepares the shows listing
 * - On error, sets an error message and shows it to the user
 */
async function setup() {
	state.status = 'loading';
	renderStatus();

	attachListeners();

	try {
		const tvShows = await fetchTVShows();
		state.shows = tvShows;
		state.status = 'loaded';
		state.currentView = 'shows';

		populateTVShowSelectControl(state.shows);
		render();
	} catch (error) {
		state.status = 'error';
		state.errorMessage = 'Unable to load shows. Please try again.';
		renderStatus();
	}
}

// Wire up DOM event handlers for the select and search input controls
function attachListeners() {
	if (showSearchInput) {
		showSearchInput.addEventListener('input', (event) => {
			state.showSearchText = event.target.value;
			render();
		});
	}

	if (showSelectControl) {
		showSelectControl.addEventListener('change', (event) => {
			const value = event.target.value;
			if (!value) return;
			openShow(Number(value));
		});
	}

	if (episodeSelectControl) {
		episodeSelectControl.addEventListener(
			'change',
			episodeSelectionDidChange
		);
	}

	if (episodeSearchInput) {
		episodeSearchInput.addEventListener('input', episodeSearchDidChange);
	}

	if (backButton) {
		backButton.addEventListener('click', () => {
			state.currentView = 'shows';
			render();
		});
	}
}

async function fetchTVShows() {
	const url = 'https://api.tvmaze.com/shows';
	const data = await getJson(url);

	const alphabeticallyOrdered = data.sort((first, second) => {
		return first.name.localeCompare(second.name, 'en', {
			sensitivity: 'base',
		});
	});

	return alphabeticallyOrdered;
}

// Fetch JSON with caching to ensure a URL is only fetched once per visit
async function getJson(url) {
	if (fetchCache.has(url)) {
		return fetchCache.get(url);
	}

	const request = (async () => {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch: ${url}`);
		}
		return await response.json();
	})();

	fetchCache.set(url, request);
	return request;
}

/*
 * Fetch episodes from TVMaze API
 * Throws on non-OK HTTP responses so callers can handle errors.
 */
async function fetchEpisodes(tvShowID) {
	const url = `https://api.tvmaze.com/shows/${tvShowID}/episodes`;
	return getJson(url);
}

function populateTVShowSelectControl(tvShows) {
	if (!tvShows || !showSelectControl) return;

	showSelectControl.innerHTML = '';

	const placeholder = document.createElement('option');
	placeholder.value = '';
	placeholder.textContent = 'Jump to show';
	showSelectControl.appendChild(placeholder);

	const fragment = document.createDocumentFragment();

	tvShows.forEach((tvShow) => {
		const optionElement = document.createElement('option');
		optionElement.textContent = `${tvShow.name}`;
		optionElement.value = tvShow.id;
		fragment.appendChild(optionElement);
	});

	showSelectControl.appendChild(fragment);
}

// Populate the episode selection dropdown with fetched episodes
// Keeps a default 'All Episodes' option at the top.
function populateEpisodeSelectControl(episodes, selectedEpisodeId = '') {
	if (!episodeSelectControl) return;
	episodeSelectControl.innerHTML = '';

	const defaultOption = document.createElement('option');
	defaultOption.value = '';
	defaultOption.textContent = 'All Episodes';
	episodeSelectControl.appendChild(defaultOption);

	const fragment = document.createDocumentFragment();

	episodes.forEach((episode) => {
		const option = document.createElement('option');
		option.textContent = `${formatEpisodeCode(
			episode.season,
			episode.number
		)} - ${episode.name}`;
		option.value = episode.id;
		fragment.appendChild(option);
	});

	episodeSelectControl.appendChild(fragment);
	episodeSelectControl.value = selectedEpisodeId;
}

async function openShow(tvShowId) {
	state.selectedShowId = String(tvShowId);
	state.currentView = 'episodes';
	state.selectedEpisodeId = '';
	state.episodeSearchText = '';

	if (showSelectControl) {
		showSelectControl.value = String(tvShowId);
	}

	const cachedEpisodes = state.episodesByShowId[tvShowId];

	if (!cachedEpisodes) {
		state.status = 'loading';
		renderStatus();
		const episodes = await fetchEpisodes(tvShowId);
		state.episodesByShowId[tvShowId] = episodes;
		state.status = 'loaded';
	}

	const episodes = state.episodesByShowId[tvShowId] || [];
	populateEpisodeSelectControl(episodes);
	render();
}

// Handler for changes to the episode select control
// - If an episode is selected, displays only that episode
// - If cleared, shows all episodes
function episodeSelectionDidChange(event) {
	state.selectedEpisodeId = event.target.value;
	render();
}

function episodeSearchDidChange(event) {
	state.episodeSearchText = event.target.value;
	state.selectedEpisodeId = '';
	if (episodeSelectControl) {
		episodeSelectControl.value = '';
	}
	render();
}

/*
 * Render application UI based on current `state`.
 * - Loading/error short-circuit
 * - Switches between shows listing and episodes listing
 */
function render() {
	if (state.status === 'loading' || state.status === 'error') {
		renderStatus();
		return;
	}

	if (showsToolbar) {
		showsToolbar.classList.toggle('hidden', state.currentView !== 'shows');
	}

	if (episodesToolbar) {
		episodesToolbar.classList.toggle(
			'hidden',
			state.currentView !== 'episodes'
		);
	}

	if (state.currentView === 'shows') {
		renderShowsView();
	} else {
		renderEpisodesView();
	}
}

function renderShowsView() {
	const rootElem = document.getElementById('root');
	if (!rootElem) return;

	rootElem.innerHTML = '';

	if (showSearchInput && showSearchInput.value !== state.showSearchText) {
		showSearchInput.value = state.showSearchText;
	}

	const searchText = state.showSearchText.toLowerCase().trim();
	const filteredShows = state.shows.filter((show) => {
		if (!searchText) return true;
		const name = show.name.toLowerCase();
		const summary = extractText(show.summary || '').toLowerCase();
		const genres = (show.genres || []).join(' ').toLowerCase();
		return (
			name.includes(searchText) ||
			summary.includes(searchText) ||
			genres.includes(searchText)
		);
	});

	if (showsCountText) {
		const countLabel =
			filteredShows.length === 1
				? 'Found 1 show'
				: `Found ${filteredShows.length} shows`;
		showsCountText.textContent = countLabel;
	}

	const list = document.createElement('div');
	list.className = 'shows-list';

	filteredShows.forEach((show) => {
		const card = document.createElement('article');
		card.className = 'show-card';
		card.tabIndex = 0;
		card.addEventListener('click', () => openShow(show.id));
		card.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				openShow(show.id);
			}
		});

		const posterWrapper = document.createElement('div');
		posterWrapper.className = 'show-poster-wrapper';
		const img = document.createElement('img');
		img.className = 'show-poster';
		if (show.image && show.image.medium) {
			img.src = show.image.medium;
		} else {
			img.src = `https://placehold.co/320x450/2d1b4e/d4c5f9?text=${encodeURIComponent(
				show.name
			)}`;
		}
		img.alt = show.name;
		posterWrapper.appendChild(img);

		const body = document.createElement('div');
		body.className = 'show-body';

		const title = document.createElement('h2');
		title.className = 'show-title';
		const titleButton = document.createElement('button');
		titleButton.type = 'button';
		titleButton.className = 'show-title-button';
		titleButton.textContent = show.name;
		titleButton.addEventListener('click', (event) => {
			event.stopPropagation();
			openShow(show.id);
		});
		title.appendChild(titleButton);

		const summary = document.createElement('p');
		summary.className = 'show-summary';
		summary.textContent = truncateSummary(extractText(show.summary), 420);

		body.appendChild(title);
		body.appendChild(summary);

		const meta = document.createElement('div');
		meta.className = 'show-meta';

		const metaItems = [
			{
				label: 'Rated',
				value:
					show.rating && show.rating.average
						? show.rating.average
						: 'N/A',
			},
			{
				label: 'Genres',
				value:
					show.genres && show.genres.length
						? show.genres.join(' | ')
						: 'N/A',
			},
			{ label: 'Status', value: show.status || 'Unknown' },
			{
				label: 'Runtime',
				value: show.runtime ? `${show.runtime}` : 'N/A',
			},
		];

		metaItems.forEach((item) => {
			const row = document.createElement('p');
			row.className = 'show-meta-row';

			const label = document.createElement('span');
			label.className = 'show-meta-label';
			label.textContent = `${item.label}: `;

			const value = document.createElement('span');
			value.className = 'show-meta-value';
			value.textContent = item.value;

			row.appendChild(label);
			row.appendChild(value);
			meta.appendChild(row);
		});

		card.appendChild(posterWrapper);
		card.appendChild(body);
		card.appendChild(meta);
		list.appendChild(card);
	});

	rootElem.appendChild(list);
}

function renderEpisodesView() {
	const rootElem = document.getElementById('root');
	if (!rootElem) return;

	const showId = state.selectedShowId;
	const show = state.shows.find(
		(candidate) => String(candidate.id) === String(showId)
	);

	if (!showId) {
		rootElem.textContent = 'Select a show to view episodes.';
		return;
	}

	const episodes = state.episodesByShowId[showId] || [];

	if (episodeSelectControl) {
		populateEpisodeSelectControl(episodes, state.selectedEpisodeId);
	}

	if (
		episodeSearchInput &&
		episodeSearchInput.value !== state.episodeSearchText
	) {
		episodeSearchInput.value = state.episodeSearchText;
	}

	if (
		episodeSelectControl &&
		episodeSelectControl.value !== state.selectedEpisodeId
	) {
		episodeSelectControl.value = state.selectedEpisodeId;
	}

	const searchText = state.episodeSearchText.toLowerCase().trim();
	let filteredEpisodes = episodes;

	if (state.selectedEpisodeId) {
		filteredEpisodes = episodes.filter(
			(episode) => String(episode.id) === state.selectedEpisodeId
		);
	} else if (searchText) {
		filteredEpisodes = episodes.filter((episode) => {
			const plainSummary = extractText(episode.summary || '');
			return (
				episode.name.toLowerCase().includes(searchText) ||
				plainSummary.toLowerCase().includes(searchText)
			);
		});
	}

	if (searchResults) {
		const total = episodes.length;
		searchResults.textContent = `Displaying ${filteredEpisodes.length} of ${total} episodes`;
	}

	makePageForEpisodes(filteredEpisodes, show ? show.name : 'Episodes');
}

/*
 * Build and display the episode result grid
 * - Creates an accessible card for each episode in `episodeList`
 * - Adds a footer attributing the data source
 */
function makePageForEpisodes(episodeList, showName = '') {
	const rootElem = document.getElementById('root');
	if (!rootElem) return;

	rootElem.innerHTML = '';

	if (showName) {
		const heading = document.createElement('h1');
		heading.className = 'page-title';
		heading.textContent = showName;
		rootElem.appendChild(heading);
	}

	const episodesGrid = document.createElement('div');
	episodesGrid.className = 'episodes-grid';

	episodeList.forEach((episode) => {
		const cardLink = document.createElement('a');
		cardLink.href = episode.url;
		cardLink.target = '_blank';
		cardLink.rel = 'noreferrer noopener';
		cardLink.className = 'episode-card-link';

		const card = document.createElement('article');
		card.className = 'episode-card';

		const image = document.createElement('img');
		if (episode.image && episode.image.medium) {
			image.src = episode.image.medium;
		} else {
			image.src = `https://placehold.co/600x400/2d1b4e/d4c5f9?text=${episode.name.replace(
				/ /g,
				'+'
			)}`;
		}
		image.alt = `${
			episode.image && episode.image.medium
				? episode.name + ' thumbnail'
				: 'Placeholder Image for ' + episode.name
		}`;
		card.appendChild(image);

		const body = document.createElement('div');
		body.className = 'episode-body';

		const header = document.createElement('div');
		header.className = 'episode-header';

		const title = document.createElement('h2');
		title.className = 'episode-name';
		title.textContent = episode.name;

		const code = document.createElement('p');
		code.className = 'episode-code';
		code.textContent = formatEpisodeCode(episode.season, episode.number);

		header.appendChild(title);
		header.appendChild(code);

		const summary = document.createElement('div');
		summary.className = 'episode-summary';
		summary.textContent = truncateSummary(
			extractText(episode.summary),
			200
		);

		body.appendChild(header);
		body.appendChild(summary);
		card.appendChild(body);

		cardLink.appendChild(card);
		episodesGrid.appendChild(cardLink);
	});

	rootElem.appendChild(episodesGrid);

	const footer = document.createElement('footer');
	footer.className = 'page-footer';
	const attribution = document.createElement('p');
	attribution.className = 'attribution';
	attribution.textContent = 'Data originally from ';
	const link = document.createElement('a');
	link.href = 'https://www.tvmaze.com/';
	link.target = '_blank';
	link.rel = 'noreferrer';
	link.textContent = 'TVMaze.com';
	attribution.appendChild(link);
	attribution.appendChild(document.createTextNode('.'));
	footer.appendChild(attribution);
	rootElem.appendChild(footer);
}

// Display a top-level loading or error status message in `root`
function renderStatus() {
	const rootElem = document.getElementById('root');
	if (!rootElem) return;

	if (state.status === 'loading') {
		rootElem.textContent = 'Loading…';
	} else if (state.status === 'error') {
		rootElem.textContent =
			state.errorMessage || 'An error occurred while loading episodes.';
	}
}

// Helper to format season/episode numbers as S##-E##
function formatEpisodeCode(seasonNumber, episodeNumber) {
	const season = String(seasonNumber).padStart(2, '0');
	const number = String(episodeNumber).padStart(2, '0');
	return `S${season}-E${number}`;
}

// Strip HTML tags from a string and return plain text
function extractText(htmlString) {
	if (!htmlString) return '';

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlString, 'text/html');
		return (doc.body && doc.body.textContent) ? doc.body.textContent : '';
	} catch (e) {
		// Fallback: return a best-effort plain string without using innerHTML
		return String(htmlString).replace(/<[^>]*>/g, '');
	}
}

// Truncate a summary to `maxLength` characters and append an ellipsis
function truncateSummary(text, maxLength) {
	if (!text) return '';
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trim()}…`;
}

window.onload = setup;
