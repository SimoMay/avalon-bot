interface SetupRoles {
  [key: number]: string[];
}

interface SpecialRoles {
  [key: number]: string[];
}

interface Images {
  [key: string]: string;
}

const defaultSetupRoles: SetupRoles = {
  10: [
    "evil",
    "evil",
    "evil",
    "evil",
    "good",
    "good",
    "good",
    "good",
    "good",
    "good",
  ],
  9: ["evil", "evil", "evil", "good", "good", "good", "good", "good", "good"],
  8: ["evil", "evil", "evil", "good", "good", "good", "good", "good"],
  7: ["evil", "evil", "evil", "good", "good", "good", "good"],
  6: ["evil", "evil", "good", "good", "good", "good"],
  5: ["evil", "evil", "good", "good", "good"],
};

// following the rules here: https://theresistanceavalon.com/rules
const defaultSpecialRoles: SpecialRoles = {
  10: ["merlin", "percival", "assassin", "morgana", "mordred", "oberon"],
  9: ["merlin", "percival", "assassin", "morgana", "mordred"],
  8: ["merlin", "percival", "assassin", "morgana"],
  7: ["merlin", "percival", "assassin", "morgana", "oberon"],
  6: ["merlin", "percival", "assassin", "morgana"],
  5: ["merlin", "assassin", "mordred-or-morgana"],
};

const staticEndpoint = Deno.env.get("STATIC_ENDPOINT");
const images: Images = {
  evil: staticEndpoint + "images/evil.png",
  good: staticEndpoint + "images/good.png",
  assassin: staticEndpoint + "images/assassin.png",
  oberon: staticEndpoint + "images/oberon.png",
  morgana: staticEndpoint + "images/morgana.png",
  mordred: staticEndpoint + "images/mordred.png",
  percival: staticEndpoint + "images/percival.png",
  merlin: staticEndpoint + "images/merlin.png",
};

export { defaultSetupRoles, defaultSpecialRoles, images };
export type { SetupRoles, SpecialRoles };
