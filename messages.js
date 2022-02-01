const goodMessage = ':large_blue_circle: Loyal Servent of Arthur'
const evilMessage = ':red_circle: Minion of Mordred'
const roleMessges = {
    evil: evilMessage,
    good: goodMessage,
    assassin: `:dagger_knife: *ASSASSIN*`,
    oberon: `:ghost: *OBERON*`,
    morgana: `:female_vampire: *MORGANA*`,
    mordred: `:smiling_imp: *MORDRED*`,
    percival: `:eyes: *PERCIVAL*`,
    merlin: `:male_mage: *MERLIN*`,
}
const privateMessages = {
    evil: roleMessges['evil'],
    good: roleMessges['good'],
    assassin: `${roleMessges['assassin']} ${evilMessage}. *You get the final decision in the assasination of MERLIN.*`,
    oberon: `${roleMessges['oberon']} ${evilMessage}. *You don't know the other evils, and they don't know about you either.*`,
    morgana: `${roleMessges['morgana']} ${evilMessage}. *You appear/pose as MERLIN to confuse PERCIVAL.*`,
    mordred: `${roleMessges['mordred']} :red_circle: *Your identity is not revealed to MERLIN.*`,
    percival: `${roleMessges['percival']} ${goodMessage}. *You know who is MERLIN.*`,
    merlin: `${roleMessges['merlin']} ${goodMessage}. *You know who the evils are. IMPORTANT if the evil figured you are MERLIN, they win!*`,
}

export { roleMessges, privateMessages, goodMessage, evilMessage }
