import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";

const guideStructuredData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Run Your Own Q3JS Server",
    description:
        "Step-by-step guide to run your own Q3JS Quake III server with Docker, required ports, and baseq3 setup instructions.",
    inLanguage: "en-US",
    url: absoluteUrl("/guide"),
    totalTime: "PT10M",
    supply: [
        {
            "@type": "HowToSupply",
            name: "baseq3 directory with allowed game files",
        },
    ],
    tool: [
        {
            "@type": "HowToTool",
            name: "Docker",
        },
    ],
    step: [
        {
            "@type": "HowToStep",
            name: "Prepare your server directory",
            text: "Create a directory that includes a baseq3 folder containing your server game data and configs.",
        },
        {
            "@type": "HowToStep",
            name: "Run the Docker container",
            text: "Start the lukaklacar/q3js-server image with UDP 27960 and TCP 27961 exposed and mount baseq3 into /server/baseq3.",
        },
        {
            "@type": "HowToStep",
            name: "Forward required ports",
            text: "Forward UDP 27960 and port 27961 on your router to make the server reachable from outside your network.",
        },
        {
            "@type": "HowToStep",
            name: "Verify visibility in Q3JS",
            text: "Confirm your server appears on the Q3JS home page and accepts player joins.",
        },
    ],
    publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
    },
};

export default function GuidePage() {
    return (
        <main className="container mx-auto ">
            <JsonLd data={guideStructuredData}/>
            <div
                className="min-w-full py-20 space-y-6 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-card/60 [&_pre]:p-4 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6"
            >

                <h1>Run Your Own Q3JS Server</h1>

                <p>
                    Q3JS can list and connect to standard Quake III dedicated servers. The simplest way to run one is
                    with the official Docker image, which starts an <code>ioq3ded</code>-compatible server and the
                    WebSocket proxy Q3JS needs.
                </p>

                <h2>1. Create a Server Folder</h2>
                <p>
                    Start with an empty directory for your server files. You will place a <code>baseq3</code> folder
                    inside it in the next step.
                </p>


                <pre className=" whitespace-pre">
{`mkdir my-q3-server
cd my-q3-server`}
            </pre>

                <h2>2. Add Your <code>baseq3</code> Files</h2>
                <p>
                    Copy a <code>baseq3</code> directory into <code>my-q3-server</code>. This folder contains the game
                    assets, configs, and maps the server will load.
                </p>
                <p>
                    Use only files you are allowed to host, such as the Quake III demo data or community-created
                    content. Do not use redistributable retail game files.
                </p>

                <h2>3. Start the Container</h2>
                <p>From inside <code>my-q3-server</code>, run:</p>

                <pre className=" whitespace-pre">
{`docker run \\
  -p 27961:27961 \\
  -p 27960:27960/udp \\
  -v "$(pwd)/baseq3":/server/baseq3 \\
  lukaklacar/q3js-server \\
  +map q3dm17`}
            </pre>

                <h2>4. Open the Required Ports</h2>
                <p>
                    To make the server reachable outside your local network, forward both ports on your router to the
                    machine running the container.
                </p>
                <ul>
                    <li>
                        <code>27960/udp</code> handles normal Quake III game traffic.
                    </li>
                    <li>
                        <code>27961/tcp</code> handles the WebSocket proxy used by browser clients.
                    </li>
                </ul>
                <p>
                    If these ports are not open, the server may work on your LAN but it will not be visible or
                    joinable from the public internet.
                </p>

                <h2>5. How the Docker Command Works</h2>
                <ul>
                    <li>
                        <strong>Ports:</strong>
                        <code>-p 27960:27960/udp</code> exposes the Quake III server port, and
                        <code>-p 27961:27961</code> exposes the proxy port for Q3JS.
                    </li>

                    <li>
                        <strong>Volume mount:</strong>
                        <code>-v "$(pwd)/baseq3":/server/baseq3</code>
                        mounts your local <code>baseq3</code> folder into the container.
                    </li>

                    <li>
                        <strong>Dedicated server behavior:</strong>
                        After startup, the container behaves like a normal <code>ioq3ded</code> server, so standard
                        <code>+set</code> and <code>+map</code> arguments still work.
                    </li>

                    <li>
                        <strong>Map loading:</strong>
                        The example starts on <code>q3dm17</code>, but you can replace it with any map present in your
                        data files.
                    </li>
                </ul>

                <h2>6. Confirm the Server Is Reachable</h2>
                <p>
                    After the container starts, your server should appear on the Q3JS home page. The Docker image
                    already includes the correct master server settings, so if it does not show up, the usual causes are
                    missing files, the wrong mounted directory, or closed ports.
                </p>

                <h2>7. File Requirements</h2>
                <p>
                    Only official Quake III <em>demo</em> files or community-created assets are allowed.
                    Retail files are not included and cannot be distributed.
                </p>
            </div>

        </main>
    );
}
