import { Router } from 'itty-router'
var _ = require('lodash')

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
    assassin: `:dagger_knife: ASSASSIN`,
    oberon: `:ghost: OBERON`,
    morgana: `:female_supervillain: MORGANA`,
    mordred: `:smiling_imp: MORDRED`,
    percival: `:eyes: PERCIVAL`,
    merlin: `:angel: MERLIN`,
}
const privateMessages = {
    evil: evilMessage,
    good: goodMessage,
    assassin: `${roleMessges['assassin']}  ${evilMessage}. You get to assassinate Merlin at the end of the game`,
    oberon: `${roleMessges['oberon']}  ${evilMessage}. You evil but do not know the other evils`,
    morgana: `${roleMessges['morgana']}  ${evilMessage}. You play/pose as MERLIN`,
    mordred: `${roleMessges['mordred']} :red_circle: You are unknown to MERLIN`,
    percival: `${roleMessges['percival']} ${goodMessage}`,
    merlin: `${roleMessges['merlin']} ${goodMessage}`,
}

const sendSlackMessage = async (channel, text) => {
    var message = {
        channel,
        text,
        username: 'Avalon K9',
        //icon_url: 'https://meepletown.com/wp-content/uploads/2012/08/resistanceavalon.jpg',
        //icon_emoji: ":crossed_swords:",
    }
    const options = {
        method: 'POST',
        body: JSON.stringify(message),
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + SLACK_TOKEN,
        },
    }

    console.log('LOG options:', JSON.stringify(options, null, 2))

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
    if (contentType.includes('form')) {
        const formData = await request.formData()
        const payload = Object.fromEntries(formData)

        console.log('LOG payload:', payload)
        console.log('LOG payload:', JSON.stringify(payload, null, 2))

        const text = payload.text;
        var rePattern = new RegExp(/@\S+/gm)
        var userFromText = text.match(rePattern)
        if (!userFromText) userFromText = []
        const allUsers = ['@' + payload.user_name, ...userFromText]

        console.log('LOG allUsers:', JSON.stringify(allUsers, null, 2))

        // Remove duplicate users
        const users = allUsers.filter((value, index) => {
            return allUsers.indexOf(value) === index
        })

        console.log('LOG users:', JSON.stringify(users, null, 2))

        if (users.length < 5) {
            return responseError('You need to be at least 5 players!')
        }
        if (users.length > 10) {
            return responseError('You cannot be more than 10 players!')
        }

        const numberOfPlayers = users.length

        const currentDate = new Date()
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }
        const dateString = currentDate.toLocaleDateString(
            'en-us',
            dateOptions
        );
        let responseMessage = `:crossed_swords: *Starting a new Avalon Game* (${dateString}) :crossed_swords:\n\n`

        const setup = JSON.parse(JSON.stringify(defaultSetupRoles[numberOfPlayers]))
        const specialRoles = JSON.parse(
            JSON.stringify(defaultSpecialRoles[numberOfPlayers])
        )
        const numberOfEvil = setup.filter(x => x === 'evil').length

        responseMessage =
            responseMessage +
            `*${numberOfEvil}* out of *${numberOfPlayers}* players are evil.\n\n`

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
                    const random = _.sample(['mordred', 'morgana'])
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

        const shuffled_users = _.shuffle(users)
        const players = []
        const evilsWithoutMordred = []
        const evilsWithoutOberon = []
        let mordred = false
        let oberon = false
        const merlinAndMorgana = []
        setup.forEach(async role => {
            const user = shuffled_users.pop()
            players.push({
                role,
                user,
            })
            console.log(`LOG user: ${user} is ${role}`)

            switch (role) {
                case 'merlin':
                    merlinAndMorgana.push(user)
                    break
                case 'morgana':
                    evilsWithoutMordred.push(user)
                    evilsWithoutOberon.push(user)
                    merlinAndMorgana.push(user)
                    break
                case 'assassin':
                case 'evil':
                    evilsWithoutMordred.push(user)
                    evilsWithoutOberon.push(user)
                    break
                case 'mordred':
                    mordred = true
                    evilsWithoutOberon.push(user)
                    break
                case 'oberon':
                    oberon = true
                    evilsWithoutMordred.push(user)
                    break
            }
        })

        players.forEach(async player => {
            let message = privateMessages[player.role]
            const evilPlayersWithoutMordred =
                evilsWithoutMordred.length > 1
                    ? evilsWithoutMordred.join(', ')
                    : evilsWithoutMordred[0]
            const evilPlayersWithoutOberon =
                evilsWithoutOberon.length > 1
                    ? evilsWithoutOberon.join(', ')
                    : evilsWithoutOberon[0]
            switch (player.role) {
                case 'merlin':
                    message =
                        message + '\nEvils are: ' + evilPlayersWithoutMordred + ' '
                    if (mordred)
                        message =
                            message +
                            '. \nMordred is with the evils, but hidden. '
                    break
                case 'percival':
                    if (merlinAndMorgana.length === 1) {
                        message = message + '\nMerlin is ' + merlinAndMorgana[0] + ' '
                    } else {
                        message =
                            message +
                            '\nEither ' +
                            merlinAndMorgana.join(' or ') +
                            ' could be Merlin. '
                    }
                    break
                case 'assassin':
                case 'morgana':
                case 'mordred':
                case 'evil':
                    message =
                        message + '\nEvils are: ' + evilPlayersWithoutOberon + ' '
                    if (oberon)
                        message =
                            message + '. \nOberon is in your team, but hidden. '
                    break
            }
            message = message + `\n(${dateString}) \n ------- \n`
            console.log(`LOG message: ${message}`)
            await sendSlackMessage(player.user, message)
        })

        await sendSlackMessage('#avalon', responseMessage)
        return new Response(responseMessage)
    }

    // Serialise the JSON to a string.
    return responseError('Something wrong happend!')
})

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }))

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', e => {
    e.respondWith(router.handle(e.request))
})
