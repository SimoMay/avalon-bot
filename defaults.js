const defaultSetupRoles = {
    10:['evil', 'evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'good'],
    9: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'good'],
    8: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good'],
    7: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good'],
    6: ['evil', 'evil', 'good', 'good', 'good', 'good'],
    5: ['evil', 'evil', 'good', 'good', 'good'],
}

const defaultSpecialRoles = {
    10:['merlin', 'assassin', 'percival', 'mordred', 'morgana', 'oberon'], // balance
    9: ['merlin', 'assassin', 'percival', 'mordred', 'morgana'], // weaken the good (by removing oberon)
    8: ['merlin', 'assassin', 'percival', 'mordred', 'morgana'], // balance
    7: ['merlin', 'assassin', 'percival', 'mordred-or-morgana'], // weaken the evil
    6: ['merlin', 'assassin', 'percival', 'mordred', 'morgana'], // balance
    5: ['merlin', 'assassin', 'percival', 'mordred-or-morgana'], // weaken the evil
}

export { defaultSetupRoles, defaultSpecialRoles }