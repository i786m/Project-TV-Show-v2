// Initialize page on load: fetch episodes and render them
function setup() {
	const allEpisodes = getAllEpisodes();
	makePageForEpisodes(allEpisodes);
}

// Build and render the episode grid with all episode cards and footer attribution
function makePageForEpisodes(episodeList) {
	const rootElem = document.getElementById('root');
	rootElem.innerHTML = '';

	const episodesGrid = document.createElement('div');
	episodesGrid.className = 'episodes-grid';

	episodeList.forEach((episode) => {
		// Create article card wrapped in a link
		const cardLink = document.createElement('a');
		cardLink.href = episode.url;
		cardLink.target = '_blank';
		cardLink.rel = 'noreferrer noopener';
		cardLink.className = 'episode-card-link';

		const card = document.createElement('article');
		card.className = 'episode-card';

		// Build image element with themed placeholder fallback
		const image = document.createElement('img');
		if (episode.image && episode.image.medium) {
			image.src = episode.image.medium;
		} else {
			image.src = `https://placehold.co/600x400/2d1b4e/d4c5f9?text=${episode.name.replace(/ /g, '+')}`;
		}
		image.alt = `${episode.image && episode.image.medium ? episode.name + ' thumbnail' : 'Placeholder Image for ' + episode.name}`;
		card.appendChild(image);

		// Build card body with header (title + episode code) and summary
		const body = document.createElement('div');
		body.className = 'episode-body';

		// Header section: episode title and episode code
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

		// Summary: clean HTML, truncate by character length
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

	// Footer: data source attribution with TVMaze link
	const footer = document.createElement('footer');
	footer.className = 'page-footer';
	const attribution = document.createElement('p');
	attribution.className = 'attribution';
	attribution.innerHTML =
		'Data originally from <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">TVMaze.com</a>.';
	footer.appendChild(attribution);
	rootElem.appendChild(footer);
}

// Format season and episode numbers with zero-padding (e.g., S01E07)
function formatEpisodeCode(seasonNumber, episodeNumber) {
	const season = String(seasonNumber).padStart(2, '0');
	const number = String(episodeNumber).padStart(2, '0');
	return `S${season}-E${number}`;
}

// Strip HTML tags from a string to get plain text
function extractText(htmlString) {
	if (!htmlString) return '';
	const temp = document.createElement('div');
	temp.innerHTML = htmlString;
	return temp.textContent || '';
}

// Truncate text to a maximum character length with ellipsis
function truncateSummary(text, maxLength) {
	if (!text) return '';
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trim()}…`;
}

window.onload = setup;
