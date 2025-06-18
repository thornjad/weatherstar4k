import Setting from './utils/setting.mjs';

document.addEventListener('DOMContentLoaded', () => {
	init();
});

const settings = {};

const init = () => {
	// create settings see setting.mjs for defaults
	settings.wide = new Setting('wide', {
		name: 'Widescreen',
		defaultValue: false,
		changeAction: wideScreenChange,
	});
	settings.refreshTime = new Setting('refreshTime', {
		type: 'select',
		defaultValue: 600_000,
		values: [
			[30_000, 'TESTING'],
			[300_000, '5 minutes'],
			[600_000, '10 minutes'],
			[900_000, '15 minutes'],
			[1_800_000, '30 minutes'],
		],
		visible: false,
	});

	// generate html objects
	const settingHtml = Object.values(settings).map((d) => d.generate());

	// write to page
	const settingsSection = document.querySelector('#settings');
	settingsSection.innerHTML = '';
	settingsSection.append(...settingHtml);
};

const wideScreenChange = (value) => {
	const container = document.querySelector('#divTwc');
	if (value) {
		container.classList.add('wide');
	} else {
		container.classList.remove('wide');
	}
};

export default settings;
