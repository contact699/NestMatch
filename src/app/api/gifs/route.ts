import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

interface CuratedGif {
  id: string
  url: string
  preview: string
  tags: string[]
}

// Curated popular reaction GIFs with rich tags for search
// All URLs are publicly accessible GIPHY/Tenor media CDN links
const CURATED_GIFS: CuratedGif[] = [
  // Positive reactions
  { id: 'thumbs-up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', preview: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif', tags: ['thumbs up', 'yes', 'good', 'approve', 'like', 'ok', 'agree', 'nice', 'great', 'positive'] },
  { id: 'clapping', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif', preview: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/200w.gif', tags: ['clap', 'clapping', 'applause', 'bravo', 'congrats', 'well done', 'great', 'awesome'] },
  { id: 'ok-sign', url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', preview: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/200w.gif', tags: ['ok', 'okay', 'sure', 'fine', 'alright', 'good', 'agree', 'perfect'] },
  { id: 'yes-nod', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', preview: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif', tags: ['yes', 'nod', 'agree', 'correct', 'right', 'affirmative', 'absolutely'] },
  { id: 'deal', url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', preview: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/200w.gif', tags: ['deal', 'handshake', 'agree', 'done', 'yes', 'partnership', 'business'] },
  { id: 'high-five', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/200w.gif', tags: ['high five', 'teamwork', 'celebrate', 'yes', 'awesome', 'great job'] },

  // Negative reactions
  { id: 'no-shake', url: 'https://media.giphy.com/media/1zSz5MVw4zKg0/giphy.gif', preview: 'https://media.giphy.com/media/1zSz5MVw4zKg0/200w.gif', tags: ['no', 'nope', 'disagree', 'shake', 'negative', 'refuse', 'deny', 'wrong'] },
  { id: 'facepalm', url: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif', preview: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/200w.gif', tags: ['facepalm', 'smh', 'disappointed', 'fail', 'ugh', 'really', 'mistake', 'frustrated'] },
  { id: 'thumbs-down', url: 'https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/giphy.gif', preview: 'https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/200w.gif', tags: ['thumbs down', 'no', 'bad', 'dislike', 'boo', 'disapprove', 'negative'] },
  { id: 'eye-roll', url: 'https://media.giphy.com/media/Rhhr8D5mKSX7O/giphy.gif', preview: 'https://media.giphy.com/media/Rhhr8D5mKSX7O/200w.gif', tags: ['eye roll', 'annoyed', 'whatever', 'really', 'sarcastic', 'ugh', 'bored'] },

  // Greetings
  { id: 'hello', url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif', preview: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/200w.gif', tags: ['hello', 'hi', 'hey', 'wave', 'greet', 'welcome', 'howdy'] },
  { id: 'welcome', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', preview: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/200w.gif', tags: ['welcome', 'hello', 'greeting', 'invite', 'come in', 'open'] },
  { id: 'bye', url: 'https://media.giphy.com/media/42D3CxaINsAFemFuId/giphy.gif', preview: 'https://media.giphy.com/media/42D3CxaINsAFemFuId/200w.gif', tags: ['bye', 'goodbye', 'see you', 'later', 'wave', 'farewell', 'leaving'] },
  { id: 'good-morning', url: 'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', preview: 'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/200w.gif', tags: ['good morning', 'morning', 'wake up', 'sunrise', 'coffee', 'start'] },

  // Happy / Excited
  { id: 'excited', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', preview: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif', tags: ['excited', 'happy', 'joy', 'yay', 'woohoo', 'pumped', 'thrilled', 'ecstatic'] },
  { id: 'celebration', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', preview: 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif', tags: ['celebrate', 'celebration', 'party', 'confetti', 'hooray', 'yay', 'win', 'victory'] },
  { id: 'happy-dance', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5APm0/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5APm0/200w.gif', tags: ['happy', 'dance', 'dancing', 'joy', 'celebrate', 'fun', 'groove', 'move'] },
  { id: 'party', url: 'https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/giphy.gif', preview: 'https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/200w.gif', tags: ['party', 'celebrate', 'fun', 'lit', 'wild', 'weekend', 'friday'] },
  { id: 'woohoo', url: 'https://media.giphy.com/media/31lPv5L3aIvTi/giphy.gif', preview: 'https://media.giphy.com/media/31lPv5L3aIvTi/200w.gif', tags: ['woohoo', 'yay', 'excited', 'happy', 'jump', 'celebrate', 'joy'] },

  // Laughter
  { id: 'laughing', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', preview: 'https://media.giphy.com/media/10JhviFuU2gWD6/200w.gif', tags: ['laugh', 'laughing', 'lol', 'funny', 'hilarious', 'haha', 'comedy', 'rofl'] },
  { id: 'lol', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/200w.gif', tags: ['lol', 'laugh', 'funny', 'haha', 'hilarious', 'crack up', 'dying'] },
  { id: 'crying-laughing', url: 'https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif', preview: 'https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/200w.gif', tags: ['crying', 'laughing', 'tears', 'funny', 'lol', 'rofl', 'so funny', 'dead'] },

  // Sad / Emotional
  { id: 'sad', url: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif', preview: 'https://media.giphy.com/media/d2lcHJTG5Tscg/200w.gif', tags: ['sad', 'cry', 'crying', 'tears', 'upset', 'unhappy', 'depressed', 'emotional'] },
  { id: 'hug', url: 'https://media.giphy.com/media/XpgOZHuDfIkoM/giphy.gif', preview: 'https://media.giphy.com/media/XpgOZHuDfIkoM/200w.gif', tags: ['hug', 'comfort', 'love', 'support', 'care', 'there there', 'embrace', 'cuddle'] },
  { id: 'miss-you', url: 'https://media.giphy.com/media/UQaRUOLveyjNC/giphy.gif', preview: 'https://media.giphy.com/media/UQaRUOLveyjNC/200w.gif', tags: ['miss you', 'miss', 'longing', 'sad', 'away', 'come back', 'lonely'] },

  // Love / Heart
  { id: 'love', url: 'https://media.giphy.com/media/l4FGpP4lxGGgK5CBW/giphy.gif', preview: 'https://media.giphy.com/media/l4FGpP4lxGGgK5CBW/200w.gif', tags: ['love', 'heart', 'romance', 'adore', 'like', 'crush', 'valentine', 'affection'] },
  { id: 'heart-eyes', url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/200w.gif', tags: ['heart eyes', 'love', 'wow', 'beautiful', 'gorgeous', 'amazing', 'crush', 'stunning'] },
  { id: 'kiss', url: 'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif', preview: 'https://media.giphy.com/media/G3va31oEEnIkM/200w.gif', tags: ['kiss', 'love', 'mwah', 'smooch', 'xoxo', 'romantic'] },

  // Surprise / Shock
  { id: 'shocked', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', preview: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/200w.gif', tags: ['shocked', 'surprise', 'omg', 'what', 'wow', 'gasp', 'unbelievable', 'jaw drop'] },
  { id: 'mind-blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/giphy.gif', preview: 'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/200w.gif', tags: ['mind blown', 'wow', 'amazing', 'whoa', 'incredible', 'insane', 'brain', 'explosion'] },
  { id: 'omg', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', preview: 'https://media.giphy.com/media/5VKbvrjxpVJCM/200w.gif', tags: ['omg', 'oh my god', 'surprise', 'shocked', 'what', 'no way', 'really'] },

  // Thinking / Confused
  { id: 'thinking', url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif', preview: 'https://media.giphy.com/media/a5viI92PAF89q/200w.gif', tags: ['thinking', 'hmm', 'wonder', 'consider', 'pondering', 'curious', 'question', 'maybe'] },
  { id: 'confused', url: 'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif', preview: 'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/200w.gif', tags: ['confused', 'what', 'huh', 'lost', 'dont understand', 'puzzled', 'question'] },
  { id: 'shrug', url: 'https://media.giphy.com/media/JRhS6WoswF8FxE0g2R/giphy.gif', preview: 'https://media.giphy.com/media/JRhS6WoswF8FxE0g2R/200w.gif', tags: ['shrug', 'idk', 'dont know', 'whatever', 'maybe', 'who knows', 'unsure'] },

  // Cool / Confident
  { id: 'cool', url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', preview: 'https://media.giphy.com/media/62PP2yEIAZF6g/200w.gif', tags: ['cool', 'sunglasses', 'smooth', 'chill', 'relax', 'swagger', 'boss', 'confident'] },
  { id: 'mic-drop', url: 'https://media.giphy.com/media/3o7qDSOvkaCOJ3MNLa/giphy.gif', preview: 'https://media.giphy.com/media/3o7qDSOvkaCOJ3MNLa/200w.gif', tags: ['mic drop', 'drop', 'boss', 'done', 'finished', 'win', 'boom', 'nailed it'] },
  { id: 'flex', url: 'https://media.giphy.com/media/3o85xIO33l7RlmLR4I/giphy.gif', preview: 'https://media.giphy.com/media/3o85xIO33l7RlmLR4I/200w.gif', tags: ['flex', 'strong', 'muscle', 'power', 'gym', 'workout', 'gains', 'beast'] },

  // Thank you / Gratitude
  { id: 'thank-you', url: 'https://media.giphy.com/media/3oEjHWXddcCOGZNRe8/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHWXddcCOGZNRe8/200w.gif', tags: ['thank you', 'thanks', 'grateful', 'appreciate', 'ty', 'gratitude', 'blessed'] },
  { id: 'bow', url: 'https://media.giphy.com/media/3o752kYR190K4jvwGI/giphy.gif', preview: 'https://media.giphy.com/media/3o752kYR190K4jvwGI/200w.gif', tags: ['bow', 'thank you', 'respect', 'honor', 'grateful', 'humble', 'appreciate'] },

  // Waiting / Patience
  { id: 'waiting', url: 'https://media.giphy.com/media/QBd2kLB5qDmysEXre9/giphy.gif', preview: 'https://media.giphy.com/media/QBd2kLB5qDmysEXre9/200w.gif', tags: ['waiting', 'wait', 'patient', 'bored', 'clock', 'time', 'hurry up'] },
  { id: 'hurry', url: 'https://media.giphy.com/media/3o7ZeEZUzRjyvWuuIg/giphy.gif', preview: 'https://media.giphy.com/media/3o7ZeEZUzRjyvWuuIg/200w.gif', tags: ['hurry', 'fast', 'quick', 'run', 'rush', 'come on', 'speed', 'late'] },

  // Eating / Food
  { id: 'eating', url: 'https://media.giphy.com/media/jKaFXbKyZFja0/giphy.gif', preview: 'https://media.giphy.com/media/jKaFXbKyZFja0/200w.gif', tags: ['eating', 'food', 'hungry', 'yum', 'delicious', 'nom', 'snack', 'meal', 'dinner', 'lunch'] },
  { id: 'coffee', url: 'https://media.giphy.com/media/DrJm6F9poo4aA/giphy.gif', preview: 'https://media.giphy.com/media/DrJm6F9poo4aA/200w.gif', tags: ['coffee', 'morning', 'tired', 'caffeine', 'drink', 'tea', 'wake up', 'energy'] },
  { id: 'pizza', url: 'https://media.giphy.com/media/4ayiIWaq2VULC/giphy.gif', preview: 'https://media.giphy.com/media/4ayiIWaq2VULC/200w.gif', tags: ['pizza', 'food', 'hungry', 'yum', 'cheese', 'dinner', 'eat', 'delicious'] },

  // Animals
  { id: 'cute-cat', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', preview: 'https://media.giphy.com/media/ICOgUNjpvO0PC/200w.gif', tags: ['cat', 'cute', 'kitty', 'adorable', 'pet', 'animal', 'meow', 'kitten'] },
  { id: 'cute-dog', url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', preview: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/200w.gif', tags: ['dog', 'cute', 'puppy', 'adorable', 'pet', 'animal', 'woof', 'good boy'] },

  // Roommate / Housing themed
  { id: 'moving', url: 'https://media.giphy.com/media/xUySTVQyBQfC5ZjdC0/giphy.gif', preview: 'https://media.giphy.com/media/xUySTVQyBQfC5ZjdC0/200w.gif', tags: ['moving', 'move', 'new home', 'house', 'apartment', 'boxes', 'packing', 'roommate'] },
  { id: 'home', url: 'https://media.giphy.com/media/l0MYLePFMI1m69fpu/giphy.gif', preview: 'https://media.giphy.com/media/l0MYLePFMI1m69fpu/200w.gif', tags: ['home', 'house', 'cozy', 'relax', 'comfort', 'apartment', 'living', 'room'] },
  { id: 'money', url: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif', preview: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/200w.gif', tags: ['money', 'cash', 'pay', 'rent', 'dollar', 'rich', 'expensive', 'budget', 'price'] },
  { id: 'keys', url: 'https://media.giphy.com/media/3o6Mb9cGKe3JzhbqPC/giphy.gif', preview: 'https://media.giphy.com/media/3o6Mb9cGKe3JzhbqPC/200w.gif', tags: ['keys', 'key', 'new place', 'move in', 'apartment', 'house', 'unlock', 'door'] },

  // Tired / Sleep
  { id: 'tired', url: 'https://media.giphy.com/media/l2JhORT5IFnj6ioko/giphy.gif', preview: 'https://media.giphy.com/media/l2JhORT5IFnj6ioko/200w.gif', tags: ['tired', 'sleepy', 'exhausted', 'yawn', 'sleep', 'nap', 'bed', 'zzz'] },
  { id: 'goodnight', url: 'https://media.giphy.com/media/4QFeb1A5IpR3Wwog2b/giphy.gif', preview: 'https://media.giphy.com/media/4QFeb1A5IpR3Wwog2b/200w.gif', tags: ['good night', 'sleep', 'goodnight', 'bed', 'zzz', 'dream', 'rest', 'night'] },

  // Angry / Frustrated
  { id: 'angry', url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', preview: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/200w.gif', tags: ['angry', 'mad', 'furious', 'rage', 'upset', 'frustrated', 'annoyed'] },
  { id: 'scream', url: 'https://media.giphy.com/media/3o7aCTfyhYawMw0BFu/giphy.gif', preview: 'https://media.giphy.com/media/3o7aCTfyhYawMw0BFu/200w.gif', tags: ['scream', 'frustrated', 'stress', 'ahh', 'panic', 'overwhelmed', 'crazy'] },

  // Encouragement
  { id: 'you-got-this', url: 'https://media.giphy.com/media/12XDYvMJNcmLgQ/giphy.gif', preview: 'https://media.giphy.com/media/12XDYvMJNcmLgQ/200w.gif', tags: ['you got this', 'encourage', 'motivation', 'go', 'cheer', 'support', 'believe', 'confidence'] },
  { id: 'good-luck', url: 'https://media.giphy.com/media/12XfKEh6JZkMwg/giphy.gif', preview: 'https://media.giphy.com/media/12XfKEh6JZkMwg/200w.gif', tags: ['good luck', 'luck', 'fingers crossed', 'hope', 'wish', 'best', 'pray'] },

  // Misc reactions
  { id: 'fire', url: 'https://media.giphy.com/media/l0HlFZ3c4NENSLQRi/giphy.gif', preview: 'https://media.giphy.com/media/l0HlFZ3c4NENSLQRi/200w.gif', tags: ['fire', 'lit', 'hot', 'awesome', 'amazing', 'burn', 'flame', 'epic'] },
  { id: 'popcorn', url: 'https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif', preview: 'https://media.giphy.com/media/pUeXcg80cO8I8/200w.gif', tags: ['popcorn', 'watching', 'drama', 'tea', 'gossip', 'interesting', 'show', 'entertainment'] },
  { id: 'fist-bump', url: 'https://media.giphy.com/media/Dnt2VnWFknFNm/giphy.gif', preview: 'https://media.giphy.com/media/Dnt2VnWFknFNm/200w.gif', tags: ['fist bump', 'bro', 'friend', 'respect', 'cool', 'teamwork', 'partner'] },
  { id: 'nervous', url: 'https://media.giphy.com/media/32mC2kProA90c/giphy.gif', preview: 'https://media.giphy.com/media/32mC2kProA90c/200w.gif', tags: ['nervous', 'anxious', 'worry', 'scared', 'stress', 'awkward', 'uncomfortable'] },
  { id: 'sorry', url: 'https://media.giphy.com/media/l0HlvtIPdijJCLxVS/giphy.gif', preview: 'https://media.giphy.com/media/l0HlvtIPdijJCLxVS/200w.gif', tags: ['sorry', 'apologize', 'my bad', 'oops', 'forgive', 'mistake', 'apology'] },
  { id: 'please', url: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif', preview: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/200w.gif', tags: ['please', 'beg', 'pray', 'want', 'need', 'help', 'pretty please'] },
  { id: 'wink', url: 'https://media.giphy.com/media/wrBURfbZmqqXu/giphy.gif', preview: 'https://media.giphy.com/media/wrBURfbZmqqXu/200w.gif', tags: ['wink', 'flirt', 'cheeky', 'sly', 'hint', 'secret', 'playful', 'tease'] },
]

function searchCuratedGifs(query: string, limit: number): CuratedGif[] {
  if (!query.trim()) {
    // Return a shuffled selection for browsing
    const shuffled = [...CURATED_GIFS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, limit)
  }

  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)

  // Score each GIF by how many search terms match its tags
  const scored = CURATED_GIFS.map((gif) => {
    const tagString = gif.tags.join(' ').toLowerCase()
    const idString = gif.id.toLowerCase()
    let score = 0

    for (const term of searchTerms) {
      // Exact tag match = 3 points
      if (gif.tags.some((t) => t.toLowerCase() === term)) {
        score += 3
      }
      // Partial tag match = 2 points
      else if (tagString.includes(term)) {
        score += 2
      }
      // ID match = 1 point
      else if (idString.includes(term)) {
        score += 1
      }
    }

    return { gif, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.gif)
}

async function fetchTenorGifs(q: string, limit: string) {
  const apiKey = process.env.TENOR_API_KEY!
  const endpoint = !q
    ? `https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=${limit}&media_filter=gif`
    : `https://tenor.googleapis.com/v2/search?key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&media_filter=gif`

  const response = await fetch(endpoint)
  const data = await response.json()

  return (data.results || []).map((r: any) => ({
    id: r.id,
    url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    preview: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url,
    width: r.media_formats?.gif?.dims?.[0],
    height: r.media_formats?.gif?.dims?.[1],
  }))
}

async function fetchGiphyGifs(q: string, limit: string) {
  const apiKey = process.env.GIPHY_API_KEY!
  const endpoint = !q
    ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`
    : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g`

  const response = await fetch(endpoint)
  const data = await response.json()

  return (data.data || []).map((r: any) => ({
    id: r.id,
    url: r.images?.original?.url || r.images?.fixed_height?.url,
    preview: r.images?.fixed_height_small?.url || r.images?.fixed_width_small?.url || r.images?.fixed_height?.url,
    width: parseInt(r.images?.original?.width || '0'),
    height: parseInt(r.images?.original?.height || '0'),
  }))
}

export const GET = withApiHandler(
  async (req, { requestId }) => {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    // Try Tenor first, then GIPHY, then curated library
    if (process.env.TENOR_API_KEY) {
      try {
        const gifs = await fetchTenorGifs(q, String(limit))
        return apiResponse({ gifs }, 200, requestId)
      } catch {
        // Fall through to next provider
      }
    }

    if (process.env.GIPHY_API_KEY) {
      try {
        const gifs = await fetchGiphyGifs(q, String(limit))
        return apiResponse({ gifs }, 200, requestId)
      } catch {
        // Fall through to curated
      }
    }

    // Curated library with tag-based search
    const gifs = searchCuratedGifs(q, limit)
    return apiResponse({ gifs }, 200, requestId)
  },
  { rateLimit: 'api' }
)
