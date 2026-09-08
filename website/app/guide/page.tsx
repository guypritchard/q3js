import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

const SERVER_IMAGE = "lukaklacar/q3js-server:1.0.0";

export const metadata: Metadata = buildPageMetadata({
  title: "Run Your Own Q3JS Server",
  description:
    "Run a public Q3JS Quake III server with Docker, persistent state, browser connectivity, master registration, and practical troubleshooting.",
  image: {
    url: "/guide-server-og.png",
    width: 1200,
    height: 630,
    alt: "Q3JS — Run your own server",
  },
  path: "/guide",
  keywords: [
    "Q3JS server setup",
    "Quake 3 dedicated server",
    "Quake 3 Docker server",
    "run Quake 3 server",
    "WebSocket Quake 3 server",
    "Q3JS guide",
  ],
});

const guideStructuredData = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Run Your Own Q3JS Server",
  description:
    "Build a complete public Q3JS server using Docker, legally obtained Quake III data, persistent state, port forwarding, and Q3JS master registration.",
  inLanguage: siteConfig.language,
  url: absoluteUrl("/guide"),
  totalTime: "PT20M",
  tool: [{ "@type": "HowToTool", name: "Docker" }],
  supply: [
    { "@type": "HowToSupply", name: "Legally obtained baseq3 data containing pak0.pk3 through pak8.pk3" },
    { "@type": "HowToSupply", name: "A public IP address or hostname" },
  ],
  step: [
    {
      "@type": "HowToStep",
      name: "Prepare the game data",
      text: "Create a server directory and place pak0.pk3 through pak8.pk3 directly inside its baseq3 directory.",
    },
    {
      "@type": "HowToStep",
      name: "Test the server locally",
      text: "Start the versioned Q3JS Docker image and confirm that its health endpoint reports ready.",
    },
    {
      "@type": "HowToStep",
      name: "Choose the public address",
      text: "Choose the public IP address or DNS hostname that players and the Q3JS master can use to reach the WebSocket gateway.",
    },
    {
      "@type": "HowToStep",
      name: "Start the public server",
      text: "Run the Q3JS image with persistent state, production master registration, and the externally reachable published address.",
    },
    {
      "@type": "HowToStep",
      name: "Open the network ports",
      text: "Forward UDP 27960 and TCP 27961 to the Docker host and allow them through its firewall.",
    },
    {
      "@type": "HowToStep",
      name: "Verify the deployment",
      text: "Check container health, inspect the logs, and confirm that the server appears in the Q3JS server browser.",
    },
  ],
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
} satisfies Record<string, unknown>;

function Code({ children }: Readonly<{ children: string }>) {
  return (
    <pre className="max-w-full overflow-x-auto border border-border bg-card/50 p-3 font-mono text-xs leading-6 text-foreground sm:p-4 sm:text-sm">
      <code>{children}</code>
    </pre>
  );
}

function Step({
  children,
  number,
  title,
}: Readonly<{
  children: React.ReactNode;
  number: string;
  title: string;
}>) {
  return (
    <section className="grid min-w-0 gap-3 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-5">
      <span className="font-mono text-sm font-bold text-primary" aria-hidden="true">
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="font-mono text-xl font-bold uppercase tracking-[0.03em] md:text-2xl">{title}</h2>
        <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground [&_code]:font-mono [&_code]:text-sm [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

function Note({
  children,
  title,
}: Readonly<{
  children: React.ReactNode;
  title: string;
}>) {
  return (
    <aside className="border-l-2 border-primary bg-card/40 px-4 py-3">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">{title}</p>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </aside>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={guideStructuredData} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 md:py-16">
        <header className="pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Field manual / Server operators
          </p>
          <h1 className="mt-3 max-w-3xl font-mono text-3xl font-black uppercase tracking-[0.035em] md:text-4xl">
            Run your own Q3JS server
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            This guide starts with a local health check, then publishes a persistent Quake III server that
            browser players can discover through the Q3JS master. The image combines the dedicated game server
            with the WebSocket gateway required by web clients.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="bg-card/50 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Container</p>
              <p className="mt-1 font-semibold">
                <Link
                  href="https://hub.docker.com/r/lukaklacar/q3js-server"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-border underline-offset-4 hover:text-primary"
                >
                  {SERVER_IMAGE}
                </Link>
              </p>
            </div>
            <div className="bg-card/50 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Required data</p>
              <p className="mt-1 font-semibold">pak0.pk3–pak8.pk3</p>
            </div>
            <div className="bg-card/50 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Setup time</p>
              <p className="mt-1 font-semibold">About 20 minutes</p>
            </div>
          </div>

          <div className="mt-5">
            <Note title="Before you begin">
              <p>
                Install Docker, make sure it is running, and use only Quake III files you are legally entitled
                to use. The container does not download or redistribute game data.
              </p>
            </Note>
          </div>
        </header>

        <div className="grid gap-10 pt-8 sm:gap-12 sm:pt-10">
          <Step number="01" title="Prepare the game data">
            <p>Create a working directory with a <code>baseq3</code> folder:</p>
            <Code>{`mkdir -p my-q3-server/baseq3
cd my-q3-server`}</Code>
            <p>
              Copy <code>pak0.pk3</code> through <code>pak8.pk3</code> directly into <code>baseq3</code>. Do not
              add another nested <code>baseq3</code> directory.
            </p>
            <Code>{`my-q3-server/
└── baseq3/
    ├── pak0.pk3
    ├── pak1.pk3
    ├── ...
    └── pak8.pk3`}</Code>
            <p>Confirm that Docker will see the expected files:</p>
            <Code>{`ls -1 baseq3/pak*.pk3`}</Code>
            <Note title="Game-data license">
              <p>
                Obtain <code>pak0.pk3</code> from a legitimate Quake III Arena installation. The point-release
                files <code>pak1.pk3</code> through <code>pak8.pk3</code> are available through the{" "}
                <Link
                  href="https://ioquake3.org/help/players-guide/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  ioquake3 player guide
                </Link>.
                Do not publish your <code>baseq3</code> directory or bake it into a public image.
              </p>
            </Note>
          </Step>

          <Step number="02" title="Test it locally">
            <p>
              Run the pinned <code>1.0.0</code> image first. The named state volume preserves generated server
              files without changing your read-only game-data directory.
            </p>
            <Code>{`docker run --rm \
  --name q3js-server-test \
  -p 27960:27960/udp \
  -p 27961:27961/tcp \
  -v "$(pwd)/baseq3:/data/baseq3:ro" \
  -v q3js-server-state:/state \
  lukaklacar/q3js-server:1.0.0`}</Code>
            <p>
              Wait for <code>Q3JS server ready</code>, then open another terminal and check the gateway:
            </p>
            <Code>{`curl -fsS http://localhost:27961/healthz`}</Code>
            <p>
              A successful response means both the game server and browser gateway are ready. Stop the test
              with <code>Control-C</code>.
            </p>
          </Step>

          <Step number="03" title="Choose the public address">
            <p>
              You need the address that internet players can use to reach this machine. Use a public IPv4
              address or a DNS hostname that points to it. Do not use <code>localhost</code>, <code>0.0.0.0</code>,
              or a private address such as <code>192.168.x.x</code>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-card/50 p-4">
                <p className="font-mono font-bold text-foreground">Direct connection</p>
                <p className="mt-2 text-sm leading-6">
                  Publish TCP <code>27961</code> directly and keep <code>Q3JS_SECURE=false</code>.
                </p>
              </div>
              <div className="bg-card/50 p-4">
                <p className="font-mono font-bold text-foreground">TLS reverse proxy</p>
                <p className="mt-2 text-sm leading-6">
                  Publish a hostname on TCP <code>443</code>, proxy WebSockets to <code>27961</code>, and set
                  <code> Q3JS_SECURE=true</code>.
                </p>
              </div>
            </div>
            <Note title="Do not guess the TLS setting">
              <p>
                Set <code>Q3JS_SECURE=true</code> only when the published endpoint really serves <code>wss://</code>
                with a valid certificate. The basic command below uses a direct, non-TLS gateway.
              </p>
            </Note>
          </Step>

          <Step number="04" title="Start the public server">
            <p>
              Replace <code>YOUR_PUBLIC_IP_OR_HOSTNAME</code>, then run this from <code>my-q3-server</code>:
            </p>
            <Code>{`docker run -d \
  --name q3js-server \
  --restart unless-stopped \
  -p 27960:27960/udp \
  -p 27961:27961/tcp \
  -v "$(pwd)/baseq3:/data/baseq3:ro" \
  -v q3js-server-state:/state \
  -e Q3JS_MASTER_URL=https://master.q3js.com \
  -e Q3JS_PUBLISH_HOST=YOUR_PUBLIC_IP_OR_HOSTNAME \
  -e Q3JS_PUBLISH_PORT=27961 \
  -e Q3JS_SECURE=false \
  -e 'Q3JS_SERVER_CONFIG=seta sv_hostname "My Q3JS Server"; seta sv_maxclients "16"; seta g_gametype "0"; seta fraglimit "20"; seta timelimit "15"; map q3dm17' \
  lukaklacar/q3js-server:1.0.0`}</Code>
            <p>
              The server sends an anonymous heartbeat to <code>master.q3js.com</code> and is listed as a
              community server. No private Q3JS credential is required.
            </p>
            <Note title="Official status and event reporting">
              <p>
                <code>Q3JS_EVENT_CLIENT_SECRET</code> is reserved for project-managed servers. Community
                operators should omit it. A matching secret marks a server official and enables authenticated
                event reporting; inventing a value does neither.
              </p>
            </Note>
          </Step>

          <Step number="05" title="Open the network ports">
            <p>
              If the Docker host is behind a router, forward both ports to its LAN address. Also allow them
              through the host firewall and any cloud-provider firewall.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-card/50 p-4">
                <p className="font-mono font-bold text-foreground">27960 / UDP</p>
                <p className="mt-1 text-sm leading-6">Native Quake III traffic and server queries.</p>
              </div>
              <div className="bg-card/50 p-4">
                <p className="font-mono font-bold text-foreground">27961 / TCP</p>
                <p className="mt-1 text-sm leading-6">The WebSocket gateway used by browser players.</p>
              </div>
            </div>
            <p>
              Carrier-grade NAT can prevent inbound connections even when local forwarding is correct. If your
              router has no public address, request one from your ISP or run the server on a VPS.
            </p>
          </Step>

          <Step number="06" title="Verify the deployment">
            <p>Check that the container is running and healthy:</p>
            <Code>{`docker ps --filter name=q3js-server
docker inspect --format='{{.State.Health.Status}}' q3js-server
docker logs --tail 100 q3js-server`}</Code>
            <p>Verify the local gateway directly:</p>
            <Code>{`curl -fsS http://localhost:27961/healthz`}</Code>
            <p>
              Finally, open the <Link href="/" className="text-foreground underline underline-offset-4 hover:text-primary">Q3JS server browser</Link>.
              Registration is quick, but the master must also be able to connect back to the published host and
              query the server before it can display it.
            </p>
          </Step>

          <Step number="07" title="Operate and update it">
            <p>Follow live logs, restart the server, or remove the container with:</p>
            <Code>{`docker logs -f q3js-server
docker restart q3js-server
docker rm -f q3js-server`}</Code>
            <p>
              Removing the container does not remove <code>q3js-server-state</code>. Re-run the public command to
              recreate it. Keep a versioned image tag for predictable deployments; use <code>latest</code> only
              when you intentionally want the newest release and have reviewed its migration notes.
            </p>
          </Step>

          <Step number="08" title="Troubleshoot common failures">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-foreground">
                    <th className="px-3 py-3 font-mono uppercase">Symptom</th>
                    <th className="px-3 py-3 font-mono uppercase">What to check</th>
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-b [&_tr]:border-border/60">
                  <tr>
                    <td className="px-3 py-4 align-top">“Quake 3 data files are missing”</td>
                    <td className="px-3 py-4">
                      Mount to <code>/data/baseq3</code> and confirm <code>pak0.pk3</code> through
                      <code> pak8.pk3</code> are readable at the folder root.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-4 align-top">Container is unhealthy or exits</td>
                    <td className="px-3 py-4">
                      Run <code>docker logs q3js-server</code>. Check the PK3 files, port conflicts, and the complete
                      <code> Q3JS_SERVER_CONFIG</code>, including a <code>map</code> command.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-4 align-top">Healthy but absent from the server browser</td>
                    <td className="px-3 py-4">
                      Confirm <code>Q3JS_MASTER_URL</code>, outbound HTTPS access, the public publish host, and
                      inbound TCP <code>27961</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-4 align-top">Listed but players cannot connect</td>
                    <td className="px-3 py-4">
                      Check DNS, port forwarding, firewalls, and that <code>Q3JS_SECURE</code> matches the actual
                      <code> ws://</code> or <code>wss://</code> endpoint.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-4 align-top">Works only on the local network</td>
                    <td className="px-3 py-4">
                      Verify the router’s WAN address, both forwarding rules, and whether the ISP uses
                      carrier-grade NAT.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Step>
        </div>

        <div className="mt-12 border-l-2 border-primary pl-4 text-sm leading-6 text-muted-foreground">
          Need custom ports, RCON, mods, or a self-hosted master? Read the{" "}
          <Link
            href="https://github.com/guypritchard/q3js/blob/master/game/server/README.md"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            server runtime reference
          </Link>.
        </div>
      </main>

      <Footer />
    </div>
  );
}
