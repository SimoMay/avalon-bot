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
    oberon: `${roleMessges['oberon']} ${evilMessage}. *You evil but do not know the other evils are.*`,
    morgana: `${roleMessges['morgana']} ${evilMessage}. *You act/pose as MERLIN.*`,
    mordred: `${roleMessges['mordred']} :red_circle: *You are unknown to MERLIN.*`,
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

    logJson(options, 'options')

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
        const allUsers = ['@' + payload.user_name, ...userFromText] // payload.user_name is the user who issued the slack command

        logJson(allUsers, 'allUsers')

        // Remove duplicate users
        const users = allUsers.filter((value, index) => {
            return allUsers.indexOf(value) === index
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

        responseMessage =
            responseMessage +
            `*${numberOfEvil}* out of *${numberOfPlayers}* players are evil.\n\n`

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

        responseMessage =
            responseMessage +
            `:red_circle: Special Evil characters: ${evils}.\n`
        responseMessage =
            responseMessage +
            `:large_blue_circle: Special Good characters: ${goods}.\n`

        // Shuffling the users order
        const shuffledUsers = shuffle(users)

        const players = []
        const evilsButMordred = []
        const evilsButOberon = []
        const merlinAndMorgana = []
        let mordred = false
        let oberon = false
        // Giving each user a role
        setup.forEach(async role => {
            const user = shuffledUsers.pop()
            players.push({
                role,
                user,
            })
            console.log(`LOG user: ${user} is ${role}`)

            // setting up special variables to be used later
            switch (role) {
                case 'merlin':
                    merlinAndMorgana.push(user)
                    break
                case 'morgana':
                    evilsButMordred.push(user)
                    evilsButOberon.push(user)
                    merlinAndMorgana.push(user)
                    break
                case 'assassin':
                case 'evil':
                    evilsButMordred.push(user)
                    evilsButOberon.push(user)
                    break
                case 'mordred':
                    mordred = true
                    evilsButOberon.push(user)
                    break
                case 'oberon':
                    oberon = true
                    evilsButMordred.push(user)
                    break
            }
        })

        const evilsButMordredText =
            (evilsButMordred.length > 1 ? evilsButMordred.join(' ') : evilsButMordred[0]) + ' '
        const evilsButOberonText =
            (evilsButOberon.length > 1 ? evilsButOberon.join(' ') : evilsButOberon[0]) + ' '
        players.forEach(async player => {
            let message = `You are ${privateMessages[player.role]}`
            switch (player.role) {
                case 'merlin':
                    // MERLIN can see all evil players, but not MORDRED
                    message =
                        message +
                        '\nEvils are: ' +
                        evilsButMordredText.replace(`${player.user} `, '') +
                        ' '
                    if (mordred)
                        message =
                            message +
                            ' \nMORDERED is with the evils, but hidden. '
                    break
                case 'percival':
                    // PERCIVAL can see who MERLIN is, if MORGANA playing then will see both
                    if (merlinAndMorgana.length === 1) {
                        message =
                            message + '\nMERLIN is ' + merlinAndMorgana[0] + ' '
                    } else {
                        // Shuffling the 2 roles so they won't have a pattern
                        message =
                            message +
                            '\nMERLIN is either ' +
                            shuffle(merlinAndMorgana).join(' or ') +
                            ' '
                    }
                    break
                case 'assassin':
                case 'morgana':
                case 'mordred':
                case 'evil':
                    // All evils (exluding OBERON) see each others, except the evil OBERON sees no one
                    message =
                        message +
                        '\nEvils are: ' +
                        evilsButOberonText.replace(`${player.user} `, '') +
                        ' '
                    if (oberon)
                        message =
                            message + ' \nOBERON is in your team, but hidden. '
                    break
            }
            message = message + `\n(${dateString}) \n ------- \n`

            console.log(`LOG message: ${player.user} -> ${message}`)

            // Sending a private message to each user with their specific role message
            await sendSlackMessage(player.user, message)
        })

        // Making a list of who's playing this round (shuffling them again)
        responseMessage = responseMessage + `Players this round: `
        const shuffledPlayers = shuffle(players)
        shuffledPlayers.forEach(async player => {
            responseMessage = responseMessage + ` ${player.user} `
        })
        responseMessage = responseMessage + ` \n `

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
