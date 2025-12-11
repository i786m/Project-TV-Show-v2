// High-level application state
// - `episodes`: cached list of episodes fetched from the API
// - `searchText`: current search query entered by the user
// - `selectedId`: episode id selected from the dropdown (empty = all)
// - `status`: loading status for the app UI (idle/loading/loaded/error)
// - `errorMessage`: user-friendly error message when loading fails
const state = {
	episodes: [],
	searchText: '',
	selectedId: '',
	status: 'idle',
	errorMessage: '',
};

const searchResults = document.getElementById('search-results');
const selectControl = document.getElementById('episode-select');
const searchInput = document.getElementById('episode-search');

/*
 * App initialization
 * - Sets loading state and renders status while fetching data
 * - Attaches UI listeners for search and selection controls
 * - Fetches episodes from the API and populates the select control
 * - On error, sets an error message and shows it to the user
 */
async function setup() {
	state.status = 'loading';
	renderStatus();

	attachListeners();

	try {
		const episodes = await fetchEpisodes();
		state.episodes = episodes;
		state.status = 'loaded';
		populateSelect(episodes);
		render();
	} catch (error) {
		state.status = 'error';
		state.errorMessage = 'Unable to load episodes. Please try again.';
		renderStatus();
	}
}

// Wire up DOM event handlers for the select and search input controls
function attachListeners() {
	if (selectControl) {
		selectControl.addEventListener('change', selectionDidChange);
	}

	if (searchInput) {
		searchInput.addEventListener('input', searchDidChange);
	}
}

/*
 * Fetch episodes from TVMaze API
 * Throws on non-OK HTTP responses so callers can handle errors.
 */
async function fetchEpisodes() {
	const response = await fetch('https://api.tvmaze.com/shows/82/episodes');
	if (!response.ok) {
		throw new Error('Failed to fetch episodes');
	}
	return response.json();
}

// Populate the episode selection dropdown with fetched episodes
// Keeps a default 'All Episodes' option at the top.
function populateSelect(episodes) {
	if (!selectControl) return;
	selectControl.innerHTML = '';

	const defaultOption = document.createElement('option');
	defaultOption.value = '';
	defaultOption.textContent = 'All Episodes';
	selectControl.appendChild(defaultOption);

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

	selectControl.appendChild(fragment);
	selectControl.value = '';
}

// Handler for changes to the episode select control
// - If an episode is selected, displays only that episode
// - If cleared, shows all episodes
function selectionDidChange(event) {
	const value = event.target.value;
	const total = state.episodes.length;
	state.selectedId = value;

	if (value === '') {
		searchResults.textContent = `Displaying all ${total} episodes`;
		makePageForEpisodes(state.episodes);
	} else {
		const episodeID = Number(value);
		const episode = state.episodes.find(
			(episode) => episode.id === episodeID
		);
		const list = episode ? [episode] : [];
		searchResults.textContent = `Displaying ${list.length} of ${total} episodes`;
		makePageForEpisodes(list);
	}
}

// Update search text state and re-render results on user input
function searchDidChange(event) {
	state.searchText = event.target.value;
	render();
}

/*
 * Render application UI based on current `state`.
 * - If loading or error, show status message
 * - If search text is empty, show all episodes
 * - Otherwise, filter episodes by name or summary and display matches
 */
function render() {
	if (state.status === 'loading' || state.status === 'error') {
		renderStatus();
		return;
	}

	const searchText = state.searchText.toLowerCase();
	const total = state.episodes.length;

	const selectControl = document.getElementById('episode-select');
	if (
		selectControl &&
		selectControl.value !== '' &&
		state.searchText !== ''
	) {
		selectControl.value = '';
	}

	if (searchText === '') {
		searchResults.textContent = `Displaying all ${total} episodes`;
		makePageForEpisodes(state.episodes);
		return;
	}

	const filteredEpisodes = state.episodes.filter((episode) => {
		const plainSummary = extractText(episode.summary || '');
		return (
			episode.name.toLowerCase().includes(searchText) ||
			plainSummary.toLowerCase().includes(searchText)
		);
	});

	searchResults.textContent = `Displaying ${filteredEpisodes.length} of ${total} episodes`;
	makePageForEpisodes(filteredEpisodes);
}

/*
 * Build and display the episode result grid
 * - Creates an accessible card for each episode in `episodeList`
 * - Adds a footer attributing the data source
 */
function makePageForEpisodes(episodeList) {
	const rootElem = document.getElementById('root');
	rootElem.innerHTML = '';

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
		rootElem.textContent = 'Loading episodes…';
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
	const temp = document.createElement('div');
	temp.innerHTML = htmlString;
	return temp.textContent || '';
}

// Truncate a summary to `maxLength` characters and append an ellipsis
function truncateSummary(text, maxLength) {
	if (!text) return '';
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trim()}…`;
}

window.onload = setup;
