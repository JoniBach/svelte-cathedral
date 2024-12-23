export const PIECE = {
	// Cathedral: [
	// 	[1, 0],
	// 	[0, 1],
	// 	[1, 1],
	// 	[2, 1],
	// 	[1, 2],
	// 	[1, 3]
	// ],
	Castle: [
		[0, 0],
		[1, 0],
		[0, 1],
		[0, 2],
		[1, 2]
	],
	Infirmiry: [
		[0, 0],
		[1, 0],
		[2, 0],
		[1, 1],
		[1, -1]
	],
	Academy: [
		[0, 0],
		[1, -1],
		[1, 0],
		[2, 0],
		[0, 1]
	],
	Abbey: [
		[0, 0],
		[1, 0],
		[0, 1],
		[1, -1]
	],
	Manor: [
		[0, 0],
		[1, 0],
		[1, 1],
		[2, 0]
	],
	Square: [
		[0, 0],
		[1, 0],
		[0, 1],
		[1, 1]
	],
	Bridge: [
		[0, 0],
		[1, 0],
		[2, 0]
	],
	Inn: [
		[0, 0],
		[1, 0],
		[0, 1]
	],
	Stable: [
		[0, 0],
		[1, 0]
	],
	Tavern: [[0, 0]]
};

const cathedral = [
	[1, 0],
	[0, 1],
	[1, 1],
	[2, 1],
	[1, 2],
	[1, 3]
];

export const CATHEDRAL = {
	name: 'Cathedral',
	cells: cathedral.map((cell) => ({ cell, id: 'Cathedral' })),
	count: 1
};

export let PIECES = Object.keys(PIECE).map((key) => ({
	name: key,
	cells: PIECE[key].map((cell) => ({ cell, id: key })),
	count: ['Tavern', 'Stable', 'Inn'].includes(key) ? 2 : 1
}));

export default PIECES;
