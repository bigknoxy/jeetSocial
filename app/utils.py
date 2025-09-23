"""
app/utils.py

Utility functions for jeetSocial.
- Username generation
- Hate speech detection
- Kindness detection
- Word/phrase lists for moderation
"""

import random
import re
import logging

ADJECTIVES = [
    "Blue",
    "Green",
    "Red",
    "Yellow",
    "Purple",
    "Orange",
    "Silver",
    "Golden",
    "Wobbly",
    "Fluffy",
    "Sparkly",
    "Goofy",
    "Bouncy",
    "Sassy",
    "Zippy",
    "Giggly",
    "Dizzy",
    "Snazzy",
    "Loopy",
    "Squishy",
    "Jumpy",
    "Quirky",
    "Wiggly",
    "Cheeky",
    "Funky",
    "Snoozy",
    "Peppy",
    "Nifty",
    "Dorky",
    "Spooky",
    "Bubbly",
    "Nutty",
]
ANIMALS = [
    "Fox",
    "Wolf",
    "Bear",
    "Lion",
    "Tiger",
    "Eagle",
    "Shark",
    "Otter",
    "Unicorn",
    "Mermaid",
    "Narwhal",
    "Penguin",
    "Platypus",
    "Llama",
    "Sloth",
    "Dragon",
    "Dinosaur",
    "Octopus",
    "Hamster",
    "Ferret",
    "Moose",
    "Giraffe",
    "Panda",
    "Chinchilla",
    "Goblin",
    "Pixie",
    "Troll",
    "Yeti",
    "Alien",
    "Robot",
    "Zombie",
    "Vampire",
    "Godzilla",
    "Mothra",
    "KingKong",
    "Cthulhu",
    "CookieMonster",
    "Sasquatch",
    "Kraken",
    "LochNess",
    "Gremlin",
    "Chupacabra",
    "Bigfoot",
    "Blob",
    "Jabberwocky",
    "Hydra",
    "SassySquid",
    "SnarkySerpent",
    "DramaLizard",
    "PartyGhoul",
    "WackyWorm",
    "BumbleBeast",
    "GiggleGolem",
    "PranksterPhantom",
]

# Expanded hateful word/phrase list (merged and de-duplicated)
HATEFUL_WORDS = [
    "stupid",
    "idiot",
    "dumb",
    "moron",
    "hate",
    "bigot",
    "racist",
    "sexist",
    "homophobe",
    "loser",
    "worthless",
    "trash",
    "garbage",
    "retard",
    "freak",
    "ugly",
    "fat",
    "disgusting",
    "creep",
    "kill yourself",
    "kys",
    "die",
    "nazi",
    "terrorist",
    "go away",
    "shut up",
    "pathetic",
    "ignorant",
    "clown",
    "jerk",
    "bastard",
    "asshole",
    "bitch",
    "whore",
    "slut",
    "pig",
    "animal",
    "subhuman",
    "vermin",
    "scum",
    "filth",
    "degenerate",
    "unwanted",
    "unlovable",
    "unworthy",
    "failure",
    "no one likes you",
    "nobody likes you",
    "get lost",
    "drop dead",
    "go to hell",
    "burn in hell",
    "die in a fire",
    "fool",
    "imbecile",
    "savage",
    "monster",
    "disease",
    "plague",
    "parasite",
    "cockroach",
    "rat",
    "snake",
    "worm",
    "leech",
    "bloodsucker",
    "menace",
    "threat",
    "danger",
    "evil",
    # offensive slurs and leetspeak variants (kept for moderation coverage)
    "nigger",
    "chink",
    "spic",
    "gook",
    "wetback",
    "raghead",
    "coon",
    "jigaboo",
    "porch monkey",
    "cunt",
    "skank",
    "twat",
    "fag",
    "faggot",
    "dyke",
    "tranny",
    "shemale",
    "kike",
    "hebe",
    "christkiller",
    "infidel",
    "cripple",
    "gimp",
    "spaz",
    "tard",
    "n1gger",
    "nigg3r",
    "b1tch",
    "wh0re",
    "c*nt",
    "f@g",
    "f4ggot",
    "go die",
    "i hate you",
    "you should die",
    "slur1",
    "slur2",
]

HATEFUL_REGEX = re.compile(
    r"\b(" + "|".join(re.escape(word) for word in HATEFUL_WORDS) + r")\b",
    re.IGNORECASE,
)

KIND_WORDS = {
    "kind",
    "support",
    "encourage",
    "uplift",
    "help",
    "cheer",
    "inspire",
    "love",
    "hope",
    "joy",
    "awesome",
    "great",
    "wonderful",
    "amazing",
    "brave",
    "strong",
    "proud",
    "thank you",
    "grateful",
    "gratitude",
    "appreciate",
    "respect",
    "courage",
    "compassion",
    "generous",
    "friendly",
    "smile",
    "happy",
    "peace",
    "positive",
    "positivity",
    "good job",
    "well done",
    "you matter",
    "you are loved",
    "you are enough",
    "keep going",
    "you got this",
}


def generate_username():
    """
    Generates a random, anonymous username for posts.
    Format: <Adjective><Animal><2-digit number>
    """
    return f"{random.choice(ADJECTIVES)}{random.choice(ANIMALS)}{random.randint(10,99)}"


def normalize_text(text):
    """Lowercase and strip punctuation from text for matching."""
    if not isinstance(text, str):
        return ""
    return re.sub(r"[^\w\s]", "", text.lower())


def is_hate_speech(text):
    """
    Returns (is_hate, reason, details)
    - is_hate: bool
    - reason: 'word_list'
    - details: matched word/phrase
    """
    normalized = normalize_text(text)
    match = HATEFUL_REGEX.search(normalized)
    if match:
        logging.info(f"Post rejected by word list: '{match.group(0)}'")
        return True, "word_list", match.group(0)
    return False, None, None


def is_kind(message):
    """
    Checks if the message contains any kind/uplifting words.
    Returns True if any word in KIND_WORDS is present.
    """
    if not isinstance(message, str):
        return False
    lowered = message.lower()
    for word in KIND_WORDS:
        if word in lowered:
            return True
    return False
