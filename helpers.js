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

export { logJson, responseJson, responseError, sendSlackMessage }