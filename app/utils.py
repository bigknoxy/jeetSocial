import random
import string

ADJECTIVES = [
    "Blue", "Green", "Red", "Yellow", "Purple", "Orange", "Silver", "Golden",
    "Wobbly", "Fluffy", "Sparkly", "Goofy", "Bouncy", "Sassy", "Zippy", "Giggly",
    "Dizzy", "Snazzy", "Loopy", "Squishy", "Jumpy", "Quirky", "Wiggly", "Cheeky",
    "Funky", "Snoozy", "Peppy", "Nifty", "Dorky", "Spooky", "Bubbly", "Nutty"
]
ANIMALS = [
    "Fox", "Wolf", "Bear", "Lion", "Tiger", "Eagle", "Shark", "Otter",
    "Unicorn", "Mermaid", "Narwhal", "Penguin", "Platypus", "Llama", "Sloth", "Dragon",
    "Dinosaur", "Octopus", "Hamster", "Ferret", "Moose", "Giraffe", "Panda", "Chinchilla",
    "Goblin", "Pixie", "Troll", "Yeti", "Alien", "Robot", "Zombie", "Vampire",
    "Godzilla", "Mothra", "KingKong", "Cthulhu", "CookieMonster", "Sasquatch", "Kraken", "LochNess",
    "Gremlin", "Chupacabra", "Bigfoot", "Blob", "Jabberwocky", "Hydra", "SassySquid", "SnarkySerpent",
    "DramaLizard", "PartyGhoul", "WackyWorm", "BumbleBeast", "GiggleGolem", "PranksterPhantom"
]

HATEFUL_WORDS = {
    # General hate/offensive
    "hate", "kill", "die", "dumb", "stupid", "idiot", "moron", "retard", "loser",
    # Racist slurs (examples, not exhaustive)
    "nigger", "chink", "spic", "gook", "wetback", "raghead", "coon", "jigaboo", "porch monkey",
    # Sexist/misogynist
    "bitch", "slut", "whore", "cunt", "skank", "twat",
    # Homophobic/transphobic
    "fag", "faggot", "dyke", "tranny", "shemale",
    # Religious hate
    "kike", "hebe", "christkiller", "infidel",
    # Other slurs/offensive
    "cripple", "gimp", "spaz", "tard",
    # Variations/misspellings
    "n1gger", "nigg3r", "b1tch", "wh0re", "c*nt", "f@g", "f4ggot",
    # Offensive phrases
    "go die", "drop dead", "kill yourself", "kys", "i hate you", "you should die",
    # Placeholder for extension
    "slur1", "slur2"
}


def generate_username():
    return f"{random.choice(ADJECTIVES)}{random.choice(ANIMALS)}{random.randint(10,99)}"


import os

USE_HATESONAR = os.getenv('USE_HATESONAR', 'false').lower() == 'true'

if USE_HATESONAR:
    from hatesonar import Sonar
    sonar = Sonar()

def is_hateful(message):
    if USE_HATESONAR:
        result = sonar.ping(text=message)
        label = result['top_class']
        return label == 'hate_speech' or label == 'offensive_language'
    else:
        lowered = message.lower()
        for word in HATEFUL_WORDS:
            if word in lowered:
                return True
        return False
