import { Router } from 'itty-router'
import shuffle from 'lodash.shuffle'

import { defaultSetupRoles, defaultSpecialRoles, images } from './defaults'
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
    return new Response(
        'Hello, world! This is Avalon slack bot for K9 house. v1.0.9'
    )
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
                    if (setup.indexOf('evil') > -1) {
                        setup.splice(setup.indexOf('evil'), 1, role)
                        evilRoles.push(roleMessges[role])
                    }
                    break
                case 'mordred-or-morgana':
                    // randomize which special role will be played this round
                    if (setup.indexOf('evil') > -1) {
                        const random = ['mordred', 'morgana'].random()
                        setup.splice(setup.indexOf('evil'), 1, random)
                        evilRoles.push(roleMessges[random])
                    }
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
        for (const player of players) {            
            await sendSlackMessage(player.user, roleMessges[player.role], images[player.role])

            let message = `\nYou are ${privateMessages[player.role]}\n`
            switch (player.role) {
                case 'merlin':
                    // MERLIN can see all evil players, but not MORDRED
                    message += '- *Evils* are: '
                    message += evilsButMordred
                        .filter(e => e !== player.user)
                        .join('  ')
                    message += ' \n'
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
                        message += '- *MERLIN* is either '
                        message += shuffle([merlin.user, morgana.user]).join(
                            ' or '
                        )
                        message += ' \n'
                        message +=
                            '- One of them is *MORGANA* (evil) pretending to be *MERLIN* to confuse you \n'
                    }
                    message += '- *MERLIN* knows who the *evils* are  \n'
                    break
                case 'assassin':
                case 'morgana':
                case 'mordred':
                case 'evil':
                    // All evils (exluding OBERON) see each others, except the evil OBERON sees no one
                    message +=
                        '- *Evils* are: ' +
                        evilsButOberon
                            .filter(e => e !== player.user)
                            .join('  ') +
                        ' \n'
                    if (percival && player.role === 'morgana')
                        message +=
                            '- *PERCIVAL* is *confused* between you and *MERLIN*. \n'
                    if (oberon)
                        message +=
                            '- *OBERON* is in your team, but *hidden*. \n'
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
                    if (merlin) {
                        message +=
                            '- *MERLIN* knows who the *evils* are (including you) '
                        if (mordred) message += ', except *MORDRED*. '
                    }
                    message += '\n'
                    break
            }
            for (let i = 0; i < 60; i++) {
                message += ` \n`
            }
            message += `\nScroll up to see your role :point_up: :point_up: :point_up: :point_up: \n`

            console.log(`LOG message: ${player.user} -> ${message}`)

            // Sending a private message to each user with their specific role message
            await sendSlackMessage(player.user, message)
        }

        let broadcastMessage = '-----------------------------'
        for (let i = 0; i < 5; i++) {
            broadcastMessage += ` \n`
        }
        broadcastMessage += `:crossed_swords: *Starting a new Avalon Game* (${dateString}) :crossed_swords:\n\n`
        broadcastMessage += `*${numberOfEvil}* out of *${numberOfPlayers}* players are evil.\n\n`
        broadcastMessage += `:red_circle: Special Evil characters: `
        broadcastMessage += evilRoles.join(', ')
        broadcastMessage += `. \n`
        broadcastMessage += `:large_blue_circle: Special Good characters: `
        broadcastMessage += goodRoles.join(', ')
        broadcastMessage += `. \n\n`

        // Making a list of who's playing this round (shuffling them again)
        broadcastMessage += `Players this round: `
        const shuffledPlayers = shuffle(players)
        shuffledPlayers.forEach(async player => {
            broadcastMessage += ` ${player.user} `
        })
        broadcastMessage += ` \n `

        let story = '\n\n\n\n\n\n:star: :star: :star: \n\n'
        story += `As the night falls on *Avalon*, \n\n`
        story += `Hidden among *Arthur*'s brave warriors are *MORDRED*'s unscrupulous minions.\n`
        story += `These forces of evil are few in number (:red_circle: only *${numberOfEvil}*) but have knowledge of each other and remain hidden from all`
        if (merlin) {
            story += ` but one of *Arthur*'s servants.\n\n`
            story += `${roleMessges['merlin']} alone knows the agents of evil, but he must speak of this only in riddles. If his true identity is discovered :dagger_knife: *all will be lost*.\n\n`
            if (mordred) {
                story += `*MERLIN* is powerful, but his powers fall short when it comes to ${roleMessges['mordred']} himself. Only *MORDRED* stays hidden in the shadow, never revealing his evil intentions.\n\n`
            }
        } else {
            story += `.\n\n`
        }
        if (percival) {
            story += `Fear not, as one of *Arthur*'s loyal servants is ${roleMessges['percival']}, with his knowledge of the identity of *MERLIN*. Using that knowledge is *key* to protecting *MERLIN*.\n\n`
            if (morgana) {
                story += `Although *MORDRED*'s minions are not to be underestimated, as they also have ${roleMessges['morgana']}, with her unique power to reveal herself as *MERLIN*, making it difficult for *PERCIVAL* to know which is which.\n\n`
            }
        }
        if (oberon) {
            story += `${roleMessges['oberon']} has sided with the force of evil, but his loyalty is invisible to other *MORDRED*'s minions, nor does he gain knowledge of them either.\n\n`
        }
        story += `\n\n- Will goodness prevail? Or will Avalon fall under *MORDRED*'s dark shadow?`

        broadcastMessage += story

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
