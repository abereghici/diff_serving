
const App = async () => {
	const { getEntries } = await import('./App.js');
	const {render}= await  import('./Component1');

	console.log(getEntries());

	render();
};

App();