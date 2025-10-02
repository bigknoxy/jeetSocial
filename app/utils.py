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

# Expanded hateful word/phrase list
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
    # Add more as needed
    # Existing slurs and phrases from previous list
    "nigger",
    "chink",
    "spic",
    "gook",
    "wetback",
    "raghead",
    "coon",
    "jigaboo",
    "porch monkey",
    "bitch",
    "slut",
    "whore",
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
    "drop dead",
    "kill yourself",
    "kys",
    "i hate you",
    "you should die",
    "slur1",
    "slur2",
]

HATEFUL_REGEX = re.compile(
    r"(?<!\w)"
    + r"("
    + "|".join(re.escape(word) for word in HATEFUL_WORDS)
    + r")"
    + r"(?!\w)",
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
    return (
        f"{random.choice(ADJECTIVES)}"
        f"{random.choice(ANIMALS)}"
        f"{random.randint(10,99)}"
    )


def normalize_text(text):
    # Decode unicode escapes (e.g. b\u0069got -> bigot)
    import codecs

    try:
        text = codecs.decode(text, "unicode_escape")
    except Exception:
        pass
    text = text.lower()
    homoglyphs = {
        "1": "i",
        "0": "o",
        "3": "e",
        "@": "a",
        "$": "s",
        "|": "i",
        "5": "s",
        "7": "t",
        "4": "a",
        "8": "b",
    }
    for k, v in homoglyphs.items():
        text = text.replace(k, v)
    # Replace punctuation with spaces
    text = re.sub(r"[!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~]", " ", text)
    return text


def is_hate_speech(text):
    """
    Checks if the given text contains hateful words/phrases.
    Returns (is_hate, reason, details):
      - is_hate: bool
      - reason: 'word_list'
      - details: matched word/phrase
    """
    """
    Returns (is_hate, reason, details)
    - is_hate: bool
    - reason: 'word_list'
    - details: matched word/phrase
    """
    normalized = normalize_text(text)
    normalized = normalized.lower()
    # Check multi-word phrases first
    for phrase in HATEFUL_WORDS:
        if " " in phrase:
            # Use regex with word boundaries for multi-word phrases
            pattern = r"(?<!\w)" + re.escape(phrase.lower()) + r"(?!\w)"
            if re.search(pattern, normalized):
                logging.info(f"Post rejected by word list: '{phrase}'")
                return True, "word_list", phrase
    # Check single words with regex
    match = HATEFUL_REGEX.search(normalized)
    if match:
        logging.info(f"Post rejected by word list: '{match.group(0)}'")
        return True, "word_list", match.group(0)
    return False, None, None


def normalize_text_for_filter(text):
    """
    Compatibility alias expected by tests: returns normalized text used by filter tests.
    """
    return normalize_text(text)


def generate_kindness_token(post_id):
    """
    Generate a time-limited kindness token for the given post_id.
    Token format: hex(hmac_sha256(secret, f"{post_id}:{nonce}:{expiry}"))|expiry
    """
    import os
    import hmac
    import hashlib
    import time
    from secrets import token_urlsafe

    secret = os.getenv("SECRET_KEY", "dev-secret")
    expiry = int(time.time()) + 300
    nonce = token_urlsafe(16)
    payload = f"{post_id}:{nonce}:{expiry}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return f"{sig}|{expiry}|{nonce}|{post_id}"


def verify_kindness_token(token_string):
    """
    Verify token and return nonce if valid and not expired. Returns False otherwise.
    Accepts tokens in the format generated by `generate_kindness_token`.
    """
    import os
    import hmac
    import hashlib
    import time

    try:
        sig, expiry_s, nonce, post_id = token_string.split("|")
    except Exception:
        return False
    try:
        expiry = int(expiry_s)
    except Exception:
        return False
    if expiry < int(time.time()):
        return False
    secret = os.getenv("SECRET_KEY", "dev-secret")
    payload = f"{post_id}:{nonce}:{expiry}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected, sig):
        return nonce
    return False


def hash_token_for_storage(token_string):
    """
    Return a sha256 hex digest suitable for storing/unique constraint checks.
    """
    import hashlib

    return hashlib.sha256(token_string.encode("utf-8")).hexdigest()


def is_kind(message):
    """
    Checks if the message contains any kind/uplifting words.
    Returns True if any word in KIND_WORDS is present.
    """
    lowered = message.lower()
    for word in KIND_WORDS:
        if word in lowered:
            return True
    return False
