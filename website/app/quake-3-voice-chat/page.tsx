import type { Metadata } from "next";
import { Microphone, SpeakerHigh } from "@phosphor-icons/react/dist/ssr";
import { FeaturePage } from "@/components/feature-page";
import { buildFeatureStructuredData } from "@/lib/feature-seo";
import { buildPageMetadata } from "@/lib/seo";

const path = "/quake-3-voice-chat";
const title = "Quake 3 Voice Chat in Your Browser";
const description =
  "Use built-in Quake 3 voice chat in Q3JS. Opt in before joining a server, select your microphone, and hold K to talk during a browser match.";

const faq = [
  {
    question: "Does Q3JS voice chat require Discord?",
    answer: "No. Voice chat is built into Q3JS and connects you to the voice room for the server you join.",
  },
  {
    question: "Is my microphone always live?",
    answer: "No. Voice chat is opt-in, and your microphone stays muted until you hold the K key to speak.",
  },
  {
    question: "Can I choose a different microphone?",
    answer: "Yes. The join dialog lets you select an available microphone and test browser access before entering the match.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  keywords: [
    "Quake 3 voice chat",
    "Quake III Arena voice chat",
    "browser game voice chat",
    "Quake 3 push to talk",
    "Q3JS voice chat",
    "online FPS voice chat",
  ],
});

const structuredData = buildFeatureStructuredData({
  breadcrumb: "Voice chat",
  description,
  faq,
  path,
  title,
});

function VoicePreview() {
  return (
    <div className="relative min-h-72 overflow-hidden bg-card p-5 sm:p-6" aria-label="Preview of Q3JS server voice chat">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Server voice</p>
          <p className="mt-1 font-mono text-sm font-bold uppercase">The Longest Yard</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <SpeakerHigh className="size-4" weight="fill" />
        </span>
      </div>

      <div className="mt-7 grid gap-2">
        {["Ranger", "Sarge", "Visor"].map((player, index) => (
          <div key={player} className="flex items-center gap-3 bg-background/55 px-3 py-2.5">
            <span className={index === 0 ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-foreground/20"} />
            <span className="min-w-0 flex-1 font-mono text-xs font-bold uppercase">{player}</span>
            <div className="flex h-4 items-center gap-0.5" aria-hidden="true">
              {[5, 11, 7, 14, 8].map((height, bar) => (
                <span key={bar} className={index === 0 ? "w-0.5 bg-primary" : "w-0.5 bg-foreground/15"} style={{ height }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.05em]">
          <Microphone className="size-4" weight="fill" /> Hold to talk
        </span>
        <kbd className="bg-background px-2.5 py-1 font-mono text-sm font-black text-foreground">K</kbd>
      </div>
    </div>
  );
}

export default function VoiceChatFeaturePage() {
  return (
    <FeaturePage
      breadcrumb="Voice chat"
      eyebrow="Built into the match"
      title={title}
      intro="Talk to the players in your arena without opening another app. Voice is optional, scoped to the server you join, and silent until you press the push-to-talk key."
      primaryAction={{ href: "/#servers", label: "Choose a server" }}
      secondaryAction={{ href: "/play-quake-3-on-your-phone", label: "Mobile controls" }}
      visual={<VoicePreview />}
      facts={[
        { label: "Activation", value: "Opt in" },
        { label: "Push to talk", value: "Hold K" },
        { label: "Audio room", value: "Per server" },
      ]}
      cardsTitle="Voice without the setup detour"
      cardsIntro="The voice controls sit around the game rather than inside a separate account or community tool."
      cards={[
        {
          eyebrow: "Before joining",
          title: "Choose your microphone",
          description: "Select an available input in the join dialog and test access before the game takes over the screen.",
        },
        {
          eyebrow: "During the match",
          title: "Muted by default",
          description: "Your microphone starts muted. Hold K when you want to speak and release it when you are finished.",
        },
        {
          eyebrow: "Browser audio",
          title: "Clearer input",
          description: "Q3JS requests echo cancellation, noise suppression, and automatic gain control from compatible browsers.",
        },
        {
          eyebrow: "Server context",
          title: "The right people",
          description: "Each game server has its own voice room, so the participant list follows the match you joined.",
        },
      ]}
      stepsTitle="How voice chat works"
      stepsIntro="It takes one decision before the match and one key while you play."
      steps={[
        { title: "Enable voice", description: "Choose a live server, enter your player name, and turn on server voice chat." },
        { title: "Check the microphone", description: "Pick an input device and allow microphone access when your browser asks." },
        { title: "Hold K to speak", description: "Join the match, hold K while talking, and release the key to mute again." },
      ]}
      faq={faq}
      ctaTitle="Talk in your next match"
      ctaDescription="Pick a live server and enable voice in the join dialog. You can always join without it."
      ctaLink={{ href: "/#servers", label: "Browse servers" }}
      relatedLinks={[
        { href: "/#servers", label: "Live servers" },
        { href: "/quake-3-player-stats", label: "Player stats" },
        { href: "https://github.com/guypritchard/q3js", label: "Q3JS source" },
      ]}
      structuredData={structuredData}
    />
  );
}
