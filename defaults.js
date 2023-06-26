const defaultSetupRoles = {
    10:['evil', 'evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'good'],
    9: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'good'],
    8: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good', 'good'],
    7: ['evil', 'evil', 'evil', 'good', 'good', 'good', 'good'],
    6: ['evil', 'evil', 'good', 'good', 'good', 'good'],
    5: ['evil', 'evil', 'good', 'good', 'good'],
}

// following the rules here: https://theresistanceavalon.com/rules
const defaultSpecialRoles = {
    10: ['merlin', 'percival', 'assassin', 'morgana', 'mordred', 'oberon'],
    9: ['merlin', 'percival', 'assassin', 'morgana', 'mordred'],
    8: ['merlin', 'percival', 'assassin', 'morgana'],
    7: ['merlin', 'percival', 'assassin', 'morgana', 'oberon'],
    6: ['merlin', 'percival', 'assassin', 'morgana'],
    5: ['merlin', 'assassin', 'mordred-or-morgana'],
}


const images = {
    evil: Deno.env.get('STATIC_ENDPOINT') + 'images/evil.png',
    good: Deno.env.get('STATIC_ENDPOINT') + 'images/good.png',
    assassin: Deno.env.get('STATIC_ENDPOINT') + 'images/assassin.png',
    oberon: Deno.env.get('STATIC_ENDPOINT') + 'images/oberon.png',
    morgana: Deno.env.get('STATIC_ENDPOINT') + 'images/morgana.png',
    mordred: Deno.env.get('STATIC_ENDPOINT') + 'images/mordred.png',
    percival: Deno.env.get('STATIC_ENDPOINT') + 'images/percival.png',
    merlin: Deno.env.get('STATIC_ENDPOINT') + 'images/merlin.png',
}

export { defaultSetupRoles, defaultSpecialRoles, images }
