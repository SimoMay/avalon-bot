import { Router } from 'itty-router'
import shuffle from 'lodash.shuffle'

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

const goodMessage = ':large_blue_circle: Loyal Servent of Arthur'
const evilMessage = ':red_circle: Minion of Mordred'
const roleMessges = {
    assassin: `:dagger_knife: *ASSASSIN*`,
    oberon: `:ghost: *OBERON*`,
    morgana: `:female_vampire: *MORGANA*`,
    mordred: `:smiling_imp: *MORDRED*`,
    percival: `:eyes: *PERCIVAL*`,
    merlin: `:male_mage: *MERLIN*`,
}
const privateMessages = {
    evil: evilMessage,
    good: goodMessage,
    assassin: `${roleMessges['assassin']} ${evilMessage}. *You get the final decision in the assasination of MERLIN.*`,
    oberon: `${roleMessges['oberon']} ${evilMessage}. *You don't know the other evils, and they don't know about you either.*`,
    morgana: `${roleMessges['morgana']} ${evilMessage}. *You appear/pose as MERLIN to confuse PERCIVAL.*`,
    mordred: `${roleMessges['mordred']} :red_circle: *Your identity is not revealed to MERLIN.*`,
    percival: `${roleMessges['percival']} ${goodMessage}. *You know who is MERLIN.*`,
    merlin: `${roleMessges['merlin']} ${goodMessage}. *If the evil figured you are MERLIN, they win!*`,
}

Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)]
}

const logJson = (json, name) => {
    console.log(`LOG ${name}:`, JSON.stringify(json, null, 2))
}

const sendSlackMessage = async (channel, text) => {
    var message = {
        channel,
        text,
        username: 'Avalon K9',
        link_names: true,
    }
    const options = {
        method: 'POST',
        body: JSON.stringify(message),
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + SLACK_TOKEN,
        },
    }

    //logJson(options, 'options')

    return await fetch('https://slack.com/api/chat.postMessage', options)
}

const responseJson = json => {
    const returnData = JSON.stringify(json, null, 2)

    return new Response(returnData, {
        headers: {
            'Content-Type': 'application/json',
        },
    })
}

const responseError = error => {
    console.error('ERROR:', error)
    return new Response(':skull: ' + error)
}

// Create a new router
const router = Router()

/*
Our index route, a simple hello world.
*/
router.get('/', async () => {
    return new Response('Hello, world! This is Avalon slack bot for K9 house.')
})

router.post('/slack/slash', async request => {
    const contentType = request.headers.get('content-type') || ''
    // Slack send data in a "form"
    if (contentType.includes('form')) {
        const formData = await request.formData()
        const payload = Object.fromEntries(formData)

        logJson(payload, 'payload')

        // "text" field is what the user wrote after the slash command (in this case anything after /avalon)
        const text = payload.text
        // Regex to retrieve all the mentioned users, they start with @
        var rePattern = new RegExp(/@\S+/gm)
        var userFromText = text.match(rePattern)
        if (!userFromText) userFromText = []
        const matchedUsers = [`@${payload.user_name}`, ...userFromText] // payload.user_name is the user who issued the slack command

        logJson(matchedUsers, 'matchedUsers')

        // Remove duplicate users
        const users = matchedUsers.filter((value, index) => {
            return matchedUsers.indexOf(value) === index
        })

        logJson(users, 'users')

        // Game validation, Avalon has min 5 players and 10 max
        if (users.length < parseInt(MIN_PLAYERS)) {
            return responseError('You need to be at least 5 players!')
        }
        if (users.length > parseInt(MAX_PLAYERS)) {
            return responseError('You cannot be more than 10 players!')
        }

        const currentDate = new Date()
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }
        const dateString = currentDate.toLocaleDateString('en-us', dateOptions)
        let responseMessage = `:crossed_swords: *Starting a new Avalon Game* (${dateString}) :crossed_swords:\n\n`

        const numberOfPlayers = users.length
        // deep coping these values so we don't mutate the defualts
        const setup = JSON.parse(
            JSON.stringify(defaultSetupRoles[numberOfPlayers])
        )
        const specialRoles = JSON.parse(
            JSON.stringify(defaultSpecialRoles[numberOfPlayers])
        )
        const numberOfEvil = setup.filter(x => x === 'evil').length

        responseMessage += `*${numberOfEvil}* out of *${numberOfPlayers}* players are evil.\n\n`

        // Replacing "evil" & "good" with specialRoles (if needed)
        const goodRoles = []
        const evilRoles = []
        specialRoles.forEach((role, index) => {
            switch (role) {
                case 'merlin':
                case 'percival':
                    setup.splice(setup.indexOf('good'), 1, role)
                    goodRoles.push(roleMessges[role])
                    break
                case 'assassin':
                case 'mordred':
                case 'morgana':
                case 'oberon':
                    setup.splice(setup.indexOf('evil'), 1, role)
                    evilRoles.push(roleMessges[role])
                    break
                case 'mordred-or-morgana':
                    // randomize which special role will be played this round
                    const random = ['mordred', 'morgana'].random()
                    setup.splice(setup.indexOf('evil'), 1, random)
                    evilRoles.push(roleMessges[random])
                    break
            }
        })
        const evils = evilRoles.length > 1 ? evilRoles.join(', ') : evilRoles[0]
        const goods = goodRoles.length > 1 ? goodRoles.join(', ') : goodRoles[0]

        responseMessage += `:red_circle: Special Evil characters: ${evils}.\n`
        responseMessage += `:large_blue_circle: Special Good characters: ${goods}.\n\n`

        // Shuffling the users order
        const shuffledUsers = shuffle(users)

        // Giving each user a role
        const players = []
        setup.forEach(async role => {
            const user = shuffledUsers.pop()
            players.push({
                role,
                user,
            })
            console.log(`LOG user: ${user} is ${role}`)
        })

        // Setting some variables to be used later
        const mordred = players.find(e => e.role === 'mordred')
        const oberon = players.find(e => e.role === 'oberon')
        const merlin = players.find(e => e.role === 'merlin')
        const percival = players.find(e => e.role === 'percival')
        const morgana = players.find(e => e.role === 'morgana')
        const evilPlayers = players.filter(e =>
            ['evil', 'assassin', 'mordred', 'morgana', 'oberon'].includes(
                e.role
            )
        )
        const evilsButMordred = evilPlayers
            .filter(e => e.role !== 'mordred')
            .map(e => e.user)
        const evilsButOberon = evilPlayers
            .filter(e => e.role !== 'oberon')
            .map(e => e.user)

        logJson(evilPlayers, 'evilPlayers')
        logJson(evilsButMordred, 'evilsButMordred')
        logJson(evilsButOberon, 'evilsButOberon')

        // Sending private messages to each player based on the role (and other players roles)
        players.forEach(async player => {
            let message = `You are ${privateMessages[player.role]}\n`
            switch (player.role) {
                case 'merlin':
                    // MERLIN can see all evil players, but not MORDRED
                    message +=
                        '- *Evils* are: ' 
                        + evilsButMordred.filter(e => e !== player.user).join(' ') 
                        + ' \n'
                    if (mordred)
                        message +=
                            '- *MORDERED* is with the evils, but *hidden*. \n'
                    if (percival && morgana)
                        message +=
                            '- *PERCIVAL* is *confused* between you and *MORGANA*. \n'
                    else if (percival && !morgana)
                        message += '- *PERCIVAL* knows you are *MERLIN*. \n'
                    break
                case 'percival':
                    // PERCIVAL can see who MERLIN is, if MORGANA playing then will see both
                    if (merlin && !morgana) {
                        message += '- *MERLIN* is ' + merlin.user + ' \n'
                    }
                    if (merlin && morgana) {
                        // Shuffling the 2 roles so they won't have a pattern
                        message +=
                            '- *MERLIN* is either ' +
                            shuffle([merlin.user, morgana.user]).join(' or ') +
                            ' \n'
                    }
                    break
                case 'assassin':
                case 'morgana':
                case 'mordred':
                case 'evil':
                    // All evils (exluding OBERON) see each others, except the evil OBERON sees no one
                    message +=
                        '- *Evils* are: ' +
                        evilsButOberon.filter(e => e !== player.user).join(' ') +
                        ' \n'
                    if (percival && player.role === 'morgana')
                        message +=
                            '- *PERCIVAL* is *confused* between you and *MERLIN*. \n'
                    if (oberon)
                        message += '- *OBERON* is in your team, but *hidden*. \n'
                    if (merlin && player.role !== 'mordred')
                        message += '- *MERLIN* knows you are evil. \n'
                    break
                case 'oberon':
                    if (merlin)
                        message += '- *MERLIN* knows you are evil. \n'
                    break
            }
            message += `\n(${dateString}) \n ------- \n`

            console.log(`LOG message: ${player.user} -> ${message}`)

            // Sending a private message to each user with their specific role message
            await sendSlackMessage(player.user, message)
        })

        // Making a list of who's playing this round (shuffling them again)
        responseMessage += `Players this round: `
        const shuffledPlayers = shuffle(players)
        shuffledPlayers.forEach(async player => {
            responseMessage += ` ${player.user} `
        })
        responseMessage += ` \n `

        // Broadcasting the message in the main channel
        await sendSlackMessage(BROADCAST_SLACK_CHANNEL, responseMessage)
        return new Response(responseMessage)
    }

    // If we didn't get a "form", respond with an error
    return responseError('Something wrong happend!')
})

/*
This route will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).
*/
router.all('*', () => new Response('404, not found!', { status: 404 }))

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', e => {
    e.respondWith(router.handle(e.request))
})
