# Avalon Bot

A Slack bot assistant that helps you organize the board game
`The Resistance: Avalon`, written in `Deno` and `TypeScript`.

`Avalon` is a party board game of social deduction. Link to the game:
https://boardgamegeek.com/boardgame/128882/resistance-avalon

When starting a game of `Avalon` with the bot, each player will receive a direct message letting them know which character
they’ll be playing, and an image, also will mention any extra information the player
needs to know. (Special powers, etc)

In the main channel, the bot will mention the players, and how many players are in the
game, good vs evil ratio, and who is the king/leader for the first round.

## Setup

Rename `.env.example` to `.env` and fill in the values.

To start the server:

```
deno run --allow-env --allow-read --allow-net index.ts
```

Deploy and add the app to your Slack workspace/channel

## Usage

### Start a game of Avalon

Simply go to the channel and type:

```
/avalon @player1 @player2 @player3...
```

### Overriding the default setup

The bot will use the default/recommended setup for the game mentioned in the
link here: https://theresistanceavalon.com/rules

#### Here is how to force certain characters to be in the game:

Example:

```
/avalon morgana +ob @player1 @player2 @player3...
```

The names of the characters can be at the beginning of the command,
and can also be after the player names.

List of characters that can be forced:

- Percival: `percival` or `+p` or `+pr`
- Oberon: `oberon` or `+o` or `+ob`
- Mordred: `mordred` or `+md` or `+mrd`
- Morgana: `morgana` or `+mg` or `+mrg` (Percival will be added to the game)
- To play with no special characters: `basic` or `no special` or `--` (Merlin
  and Assassin will still be in the game)

## Happy playing!
