import { Router } from 'itty-router'
import shuffle from 'lodash.shuffle'

import { defaultSetupRoles, defaultSpecialRoles } from './defaults'
import { roleMessges, privateMessages } from './messages'
import { logJson, responseError, sendSlackMessage } from './helpers'

Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)]
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

        const numberOfPlayers = users.length
        // deep copying these values so we don't mutate the defualts
        const setup = JSON.parse(
            JSON.stringify(defaultSetupRoles[numberOfPlayers])
        )
        const specialRoles = defaultSpecialRoles[numberOfPlayers]
        const numberOfEvil = setup.filter(x => x === 'evil').length

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
                    message += '- *MERLIN* knows who the *evils* are  \n'
                    if (merlin && !morgana) {
                        message += '- *MERLIN* is ' + merlin.user + ' \n'
                    }
                    if (merlin && morgana) {
                        // Shuffling the 2 roles so they won't have a pattern
                        message +=
                            '- *MERLIN* is either ' +
                            shuffle([merlin.user, morgana.user]).join(' or ') +
                            ' \n'
                            message += '- One of them is *MORGANA* (evil) pretending to be *MERLIN* to confuse you \n'
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
                    if (merlin) {
                        message += '- *MERLIN* knows who the *evils* are '
                        if (player.role !== 'mordred') {
                            message += '(including *you*) '
                            if (mordred) {
                                message += 'except *MORDRED*. '
                            }
                        } else {
                            message += '*except you* '
                        }
                        message += '\n'
                    }
                    break
                case 'oberon':
                    if (merlin)
                        message += '- *MERLIN* knows who the *evils* are (including you) '
                        if (mordred) {
                            message += ', except *MORDRED*. '
                        }
                        message += '\n'
                    break
            }
            message += `\n(${dateString}) \n ------- \n`

            console.log(`LOG message: ${player.user} -> ${message}`)

            // Sending a private message to each user with their specific role message
            await sendSlackMessage(player.user, message)
        })

        
        let broadcastMessage = `:crossed_swords: *Starting a new Avalon Game* (${dateString}) :crossed_swords:\n\n`
        broadcastMessage += `*${numberOfEvil}* out of *${numberOfPlayers}* players are evil.\n\n`
        broadcastMessage += `:red_circle: Special Evil characters: ${evilRoles.join(', ')}.\n`
        broadcastMessage += `:large_blue_circle: Special Good characters: ${goodRoles.join(', ')}.\n\n`

        // Making a list of who's playing this round (shuffling them again)
        broadcastMessage += `Players this round: `
        const shuffledPlayers = shuffle(players)
        shuffledPlayers.forEach(async player => {
            broadcastMessage += ` ${player.user} `
        })
        broadcastMessage += ` \n `

        // Broadcasting the message in the main channel
        await sendSlackMessage(BROADCAST_SLACK_CHANNEL, broadcastMessage)
        return new Response(broadcastMessage)
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
