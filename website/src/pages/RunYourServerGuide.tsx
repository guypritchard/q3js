export default function RunYourServerGuide() {
    return (
        <div>
            <div className="container mx-auto px-4 py-16 md:py-24">
                <h1 className="text-4xl md:text-6xl font-bold mb-8">Run Your Own Quake III Arena Server</h1>

                <p className="text-lg mb-6">
                    This guide explains how to run a dedicated Quake III Arena server for{" "}
                    <span className="font-semibold">Q3JS</span>.
                    Once running, your server will automatically appear on the{" "}
                    <span className="font-semibold">Q3JS home page</span> after it reports heartbeats to the Q3JS master
                    server.
                    The browser connection layer is handled entirely by Q3JS — you only need to run a normal ioquake3
                    server.
                </p>

                <h2 className="text-2xl font-semibold mb-4">Prerequisites</h2>
                <ul className="list-disc list-inside mb-6">
                    <li>A machine with a stable public internet connection.</li>
                    <li>Basic command-line knowledge.</li>
                    <li>ioquake3 dedicated server binaries (ioq3ded).</li>
                    <li>A <strong>baseq3</strong> folder containing the standard Quake III assets.</li>
                </ul>

                <h2 className="text-2xl font-semibold mb-4">1. Prepare the Server Files</h2>
                <p className="mb-6">
                    Download or build the ioquake3 dedicated server. The executable is typically named{" "}
                    <code>ioq3ded</code>.
                </p>

                <h2 className="text-2xl font-semibold mb-4">2. Create <code>autoexec.cfg</code></h2>
                <p className="mb-3">
                    Place your configuration inside <code>baseq3/autoexec.cfg</code>.
                    Here you set map rotation, server name, gametype, bot settings, and so on.
                </p>

                <h2 className="text-2xl font-semibold mb-4">3. Run the Dedicated Server</h2>
                <p className="mb-3">
                    Use the following recommended startup command for full Q3JS compatibility:
                </p>

                <pre className="bg-black text-white p-4 rounded text-sm mb-6 overflow-x-auto">
{`./build/Release/ioq3ded \\
  +set dedicated 2 \\
  +set sv_pure 1 \\
  +set sv_allowDownload 1 \\
  +set net_ip 0.0.0.0 \\
  +set sv_dlrate 0 \\
  +set sv_master3 "master.q3js.com:27951" \\
  +set com_hunkMegs 256 \\
  +exec autoexec.cfg`}
                </pre>

                <p className="mb-6">
                    The master server line is required for your server to appear publicly on the Q3JS website:
                </p>

                <pre className="bg-black text-white p-4 rounded text-sm mb-6 overflow-x-auto">
{`+set sv_master3 "master.q3js.com:27951"`}
                </pre>

                <h2 className="text-2xl font-semibold mb-4">4. Open Required Ports</h2>
                <ul className="list-disc list-inside mb-6">
                    <li><strong>UDP 27960</strong> – Quake III gameplay port.</li>
                </ul>

                <h2 className="text-2xl font-semibold mb-4">5. Verify Your Server</h2>
                <p className="mb-6">
                    Within a few seconds, your server should appear on the{" "}
                    <span className="font-semibold">Q3JS home page</span>. If it does not, verify that:
                </p>

                <ul className="list-disc list-inside space-y-2 mb-6">
                    <li>The master server line is correct.</li>
                    <li>Your firewall allows UDP traffic on port 27960.</li>
                    <li>Your server can send outbound packets to UDP 27951.</li>
                </ul>

                <h2 className="text-2xl font-semibold mb-4">You're Ready</h2>
                <p className="mb-6">
                    That's all you need — run your server, send heartbeats, and it will be visible and playable
                    directly from the Q3JS browser client.
                </p>
            </div>
        </div>
    );
}
