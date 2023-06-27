interface MessageBlock {
  type: string;
  title?: {
    type: string;
    text: string;
  };
  image_url?: string;
  alt_text?: string;
}

const logJson = (json: [] | Record<never, unknown>, name: string) => {
  console.log(`LOG ${name}:`, JSON.stringify(json, null, 2));
};

const sendSlackMessage = async (
  channel: string,
  text: string,
  image: string | null = null,
) => {
  let blocks: MessageBlock[] = [];
  if (image) {
    blocks = [
      {
        "type": "image",
        "title": {
          "type": "plain_text",
          "text": text,
        },
        "image_url": image,
        "alt_text": text,
      },
      {
        "type": "divider",
      },
    ];
  }

  const message = {
    channel: Deno.env.get("NODE_ENV") === "development"
      ? Deno.env.get("TEST_SLACK_USERNAME")
      : channel,
    text,
    username: "Avalon K9",
    link_names: true,
    mrkdwn: true,
    blocks,
  };

  return await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    body: JSON.stringify(message),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + Deno.env.get("SLACK_TOKEN"),
    },
  });
};

export { logJson, sendSlackMessage };
