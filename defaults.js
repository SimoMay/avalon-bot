const defaultSetupRoles = {
    10:['evil', 'evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'good'],
    9: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'good'],
    8: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good'],
    7: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good'],
    6: ['evil', 'evil', 'good', 'good', 'good', 'good'],
    5: ['evil', 'evil', 'good', 'good', 'good'],
}

const defaultSpecialRoles = {
    10:['merlin', 'percival', 'assassin', 'mordred', 'morgana', 'oberon'], // evil 4x6 good (balance)
    9: ['merlin', 'percival', 'assassin', 'mordred', 'morgana'], // evil 3x6 good (advantage for good)
    8: ['merlin', 'percival', 'assassin', 'mordred'], // evil 3x5 good (balance)
    7: ['merlin', 'percival', 'assassin', 'mordred-or-morgana'], // evil 3x4 good (advantage for evil)
    6: ['merlin', 'percival', 'assassin', 'mordred'], // evil 2x4 good (balance)
    5: ['merlin', 'percival', 'assassin', 'mordred-or-morgana'], // evil 2x3 good (advantage for evil)
}

export { defaultSetupRoles, defaultSpecialRoles }