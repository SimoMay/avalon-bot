import { Hono } from "https://deno.land/x/hono@v3.2.6/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { serveStatic } from "https://deno.land/x/hono@v3.2.6/middleware.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";

import {
  defaultSetupRoles,
  defaultSpecialRoles,
  images,
} from "./lib/defaults.ts";
import { privateMessages, roleMessges } from "./lib/messages.ts";
import { logJson, sendSlackMessage } from "./lib/helpers.ts";
import shuffle from "./lib/shuffle.ts";

declare global {
  interface Array<T> {
    random(): T;
  }
}
Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};

const app = new Hono();

/*
Our index route, a simple hello world.
*/
app.get(
  "/",
  (c) => c.text("Hello, world! This is Avalon slack bot for K9 house. v1.6.2"),
);

app.post("/slack/slash", async (c) => {
  const contentType = c.req.header("content-type") || "";
  // Slack send data in a "form"
  if (contentType.includes("form")) {
    const payload = await c.req.parseBody();

    logJson(payload, "payload");

    // "text" field is what the user wrote after the slash command (in this case anything after /avalon)
    const text = payload.text;
    if (typeof text !== "string") {
      return c.text("You need to write something after the slash command!");
    }

    // Regex to retrieve all the mentioned users, they start with @
    let userFromText: string[] = [];
    const rePattern = new RegExp(/@\S+/gm);
    userFromText = text.match(rePattern) || [];
    const matchedUsers = [`@${payload.user_name}`, ...userFromText]; // payload.user_name is the user who issued the slack command

    logJson(matchedUsers, "matchedUsers");

    // Remove duplicate users
    const users = matchedUsers.filter((value, index) => {
      return matchedUsers.indexOf(value) === index;
    });

    logJson(users, "users");

    // Game validation, Avalon has min 5 players and 10 max
    const minPlayers = parseInt(Deno.env.get("MIN_PLAYERS") || "5");
    const maxPlayers = parseInt(Deno.env.get("MAX_PLAYERS") || "10");
    if (users.length < minPlayers) {
      return c.text(
        `You need to be at least ${minPlayers} players!`,
      );
    }
    if (users.length > maxPlayers) {
      return c.text(
        `You cannot be more than ${maxPlayers} players!`,
      );
    }

    // in case players don't want to the default roles, they can write after the slash which special roles to include
    const statedRoles: string[] = [];
    // if they want to play with Mordred they can write: mordred, +md or +mrd
    if (text.search(/mordred|\+md|\+mrd/i) > -1) {
      statedRoles.push("mordred");
    }
    // if they want to play with Morgana they can write: morgana, +mg or +mrg
    if (text.search(/morgana|\+mg|\+mrg/i) > -1) {
      statedRoles.push("morgana");
    }
    // if they want to play with Percival they can write: percival, +p or +pr
    if (text.search(/percival|\+p|\+pr/i) > -1) {
      statedRoles.push("percival");
    }
    // if they want to play with Oberon they can write: oberon, +o or +ob
    if (text.search(/oberon|\+o|\+ob/i) > -1) {
      statedRoles.push("oberon");
    }
    // if they want to play with no special roles they can write: basic, no special or --
    if (text.search(/basic|no special|\-\-/i) > -1) {
      statedRoles.push("basic");
    }
    // We can't have morgana without percival
    if (
      statedRoles.indexOf("morgana") > -1 &&
      statedRoles.indexOf("percival") === -1
    ) {
      statedRoles.push("percival");
    }
    logJson(statedRoles, "statedRoles");

    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString("en-us", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const numberOfPlayers = users.length;
    // deep copying these values so we don't mutate the defualts
    const setup: string[] = JSON.parse(
      JSON.stringify(defaultSetupRoles[numberOfPlayers]),
    );
    let specialRoles = defaultSpecialRoles[numberOfPlayers];
    if (statedRoles.length > 0) {
      // if players wants no special roles, we empty the whole array
      if (statedRoles.indexOf("basic") > -1) {
        statedRoles.splice(0, statedRoles.length);
      }
      // Every game must have a Merlin and Assassin
      statedRoles.push("merlin");
      statedRoles.push("assassin");
      specialRoles = statedRoles;
    }
    const numberOfEvil = setup.filter((x: string) => x === "evil").length;

    // Replacing "evil" & "good" with specialRoles (if needed)
    const goodRoles: string[] = [];
    const evilRoles: string[] = [];
    specialRoles.forEach((role) => {
      switch (role) {
        case "merlin":
        case "percival":
          setup.splice(setup.indexOf("good"), 1, role);
          goodRoles.push(roleMessges[role]);
          break;
        case "assassin":
        case "mordred":
        case "morgana":
        case "oberon":
          if (setup.indexOf("evil") > -1) {
            setup.splice(setup.indexOf("evil"), 1, role);
            evilRoles.push(roleMessges[role]);
          }
          break;
        case "mordred-or-morgana":
          // randomize which special role will be played this round
          if (setup.indexOf("evil") > -1) {
            const random = ["mordred", "morgana"].random();
            setup.splice(setup.indexOf("evil"), 1, random);
            evilRoles.push(roleMessges[random]);
            // We can't have morgana without percival
            if (random === "morgana") {
              setup.splice(setup.indexOf("good"), 1, "percival");
              goodRoles.push(roleMessges["percival"]);
            }
          }
          break;
      }
    });

    // Shuffling the users order
    const shuffledUsers = shuffle(users);

    // Pick a random king
    const kingIndex = Math.floor(Math.random() * users.length);

    interface Player {
      role: string;
      user: string;
      isKing: boolean;
    }
    const players: Player[] = [];

    // Giving each user a role
    setup.forEach((role, index) => {
      const user = shuffledUsers.pop();
      const isKing = index === kingIndex;
      players.push({
        role,
        user,
        isKing,
      });
      console.log(`LOG user: ${user} is ${role}`);
    });

    // Setting some variables to be used later
    const mordred = players.find((e) => e.role === "mordred");
    const oberon = players.find((e) => e.role === "oberon");
    const merlin = players.find((e) => e.role === "merlin");
    const percival = players.find((e) => e.role === "percival");
    const morgana = players.find((e) => e.role === "morgana");
    const evilPlayers = players.filter((e) =>
      ["evil", "assassin", "mordred", "morgana", "oberon"].includes(
        e.role,
      )
    );
    const evilsButMordred = evilPlayers
      .filter((e) => e.role !== "mordred")
      .map((e) => e.user);
    const evilsButOberon = evilPlayers
      .filter((e) => e.role !== "oberon")
      .map((e) => e.user);

    logJson(evilPlayers, "evilPlayers");
    logJson(evilsButMordred, "evilsButMordred");
    logJson(evilsButOberon, "evilsButOberon");

    // Sending private messages to each player based on the role (and other players roles)
    const numberOfEmptySpaces = Deno.env.get("NUMBER_OF_EMPTY_SPACES") || "50";
    for (const player of players) {
      let premessage =
        `\nScroll down to see your role :point_down: :point_down: :point_down: :point_down: \n`;
      for (
        let i = 0;
        i < parseInt(numberOfEmptySpaces);
        i++
      ) {
        premessage += ` \n`;
      }
      premessage += `:point_down: \n`;
      await sendSlackMessage(player.user, premessage);

      // posting an image of the role
      await sendSlackMessage(
        player.user,
        roleMessges[player.role],
        images[player.role],
      );

      let message = `\nYou are ${privateMessages[player.role]}\n`;
      if (player.isKing) {
        message += "\nYou are the :crown: *KING* for this round\n";
      }

      switch (player.role) {
        case "merlin":
          // MERLIN can see all evil players, but not MORDRED
          message += "- *Evils* are: ";
          message += evilsButMordred
            .filter((e) => e !== player.user)
            .join("  ");
          message += " \n";
          if (mordred) {
            message += "- *MORDERED* is with the evils, but *hidden*. \n";
          }
          if (percival && morgana) {
            message +=
              "- *PERCIVAL* is *confused* between you and *MORGANA*. \n";
          } else if (percival && !morgana) {
            message += "- *PERCIVAL* knows you are *MERLIN*. \n";
          }
          break;
        case "percival":
          // PERCIVAL can see who MERLIN is, if MORGANA playing then will see both
          if (merlin && !morgana) {
            message += "- *MERLIN* is " + merlin.user + " \n";
          }
          if (merlin && morgana) {
            // Shuffling the 2 roles so they won't have a pattern
            message += "- *MERLIN* is either ";
            message += shuffle([merlin.user, morgana.user]).join(
              " or ",
            );
            message += " \n";
            message +=
              "- One of them is *MORGANA* (evil) pretending to be *MERLIN* to confuse you \n";
          }
          message += "- *MERLIN* knows who the *evils* are  \n";
          break;
        case "assassin":
        case "morgana":
        case "mordred":
        case "evil":
          // All evils (exluding OBERON) see each others, except the evil OBERON sees no one
          message += "- *Evils* are: " +
            evilsButOberon
              .filter((e) => e !== player.user)
              .join("  ") +
            " \n";
          if (percival && player.role === "morgana") {
            message +=
              "- *PERCIVAL* is *confused* between you and *MERLIN*. \n";
          }
          if (oberon) {
            message += "- *OBERON* is in your team, but *hidden*. \n";
          }
          if (merlin) {
            message += "- *MERLIN* knows who the *evils* are ";
            if (player.role !== "mordred") {
              message += "(including *you*) ";
              if (mordred) {
                message += "except *MORDRED*. ";
              }
            } else {
              message += "*except you* ";
            }
            message += "\n";
          }
          break;
        case "oberon":
          if (merlin) {
            message += "- *MERLIN* knows who the *evils* are (including you) ";
            if (mordred) message += ", except *MORDRED*. ";
          }
          message += "\n";
          break;
      }
      for (
        let i = 0;
        i < parseInt(numberOfEmptySpaces);
        i++
      ) {
        message += ` \n`;
      }
      message +=
        `\nScroll up to see your role :point_up: :point_up: :point_up: :point_up: \n`;

      console.log(`LOG message: ${player.user} -> ${message}`);

      // Sending a private message to each user with their specific role message
      await sendSlackMessage(player.user, message);
    }

    console.log("Done sending private messages");

    let broadcastMessage = "-----------------------------";
    for (let i = 0; i < 4; i++) {
      broadcastMessage += ` \n`;
    }
    broadcastMessage +=
      `:crossed_swords: *Starting a new Avalon Game* (${dateString}) :crossed_swords:\n\n`;
    broadcastMessage +=
      `*${numberOfEvil}* out of *${numberOfPlayers}* players are evil.\n\n`;
    broadcastMessage += `:red_circle: Special Evil characters: `;
    broadcastMessage += evilRoles.join(", ");
    broadcastMessage += `. \n`;
    broadcastMessage += `:large_blue_circle: Special Good characters: `;
    broadcastMessage += goodRoles.join(", ");
    broadcastMessage += `. \n\n`;

    // Making a list of who's playing this round (shuffling them again)
    broadcastMessage += `Players this round: `;
    const shuffledPlayers = shuffle(players);
    shuffledPlayers.forEach((player) => {
      broadcastMessage += ` ${player.user} `;
    });
    broadcastMessage += ` \n `;

    const king = shuffledPlayers.find((p) => p.isKing);
    broadcastMessage += `:crown: *KING* for this round is: ${king.user} \n\n`;

    let story = "\n\n\n:star: :star: :star: \n\n";
    story += `As the night falls on *Avalon*, \n\n`;
    story +=
      `Hidden among *Arthur*'s brave warriors are *MORDRED*'s unscrupulous minions.\n`;
    story +=
      `These forces of evil are few in number (:red_circle: only *${numberOfEvil}*) but have knowledge of each other and remain hidden from all`;
    if (merlin) {
      story += ` but one of *Arthur*'s servants.\n\n`;
      story += `${
        roleMessges["merlin"]
      } alone knows the agents of evil, but he must speak of this only in riddles. If his true identity is discovered :dagger_knife: *all will be lost*.\n\n`;
      if (mordred) {
        story +=
          `*MERLIN* is powerful, but his powers fall short when it comes to ${
            roleMessges["mordred"]
          } himself. Only *MORDRED* stays hidden in the shadow, never revealing his evil intentions.\n\n`;
      }
    } else {
      story += `.\n\n`;
    }
    if (percival) {
      story += `Fear not, as one of *Arthur*'s loyal servants is ${
        roleMessges["percival"]
      }, with his knowledge of the identity of *MERLIN*. Using that knowledge is *key* to protecting *MERLIN*.\n\n`;
      if (morgana) {
        story +=
          `Although *MORDRED*'s minions are not to be underestimated, as they also have ${
            roleMessges["morgana"]
          }, with her unique power to reveal herself as *MERLIN*, making it difficult for *PERCIVAL* to know which is which.\n\n`;
      }
    }
    if (oberon) {
      story += `${
        roleMessges["oberon"]
      } has sided with the force of evil, but his loyalty is invisible to other *MORDRED*'s minions, nor does he gain knowledge of them either.\n\n`;
    }
    story +=
      `\n- Will goodness prevail? Or will Avalon fall under *MORDRED*'s dark shadow?`;

    broadcastMessage += story;

    // Broadcasting the message in the main channel
    const slackChannel = Deno.env.get("BROADCAST_SLACK_CHANNEL");
    if (slackChannel) {
      console.log(
        "Sending Broadcast message to channel " +
          Deno.env.get("BROADCAST_SLACK_CHANNEL"),
      );

      await sendSlackMessage(slackChannel, broadcastMessage);
    }

    return c.text(broadcastMessage);
  }

  // If we didn't get a "form", respond with an error
  return c.text("Error! No form received", 400);
});

// Static route for serving images
app.use("/images/*", serveStatic({ root: "./" }));

// 404 handler
app.notFound((c) => {
  return c.text("404 Message, You lost buddy?", 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`${err}`);
  return c.text("Error! Something went very wrong", 500);
});

serve(app.fetch);
