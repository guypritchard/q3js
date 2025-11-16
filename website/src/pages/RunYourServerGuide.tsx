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
                    Q3JS handles all browser connectivity, so you only need to run a standard ioquake3 server.
                </p>

                <h2 className="text-2xl font-semibold mb-4">Important File Requirements</h2>
                <p className="mb-6">
                    Q3JS only allows servers running with{" "}
                    <strong>official Quake III <em>demo</em> files</strong> or{" "}
                    <strong>community-created, freely distributable assets</strong>.
                    <span className="font-semibold">Retail Quake III Arena files are not permitted.</span>
                    Make sure your <code>baseq3</code> folder contains only allowed content.
                </p>

                <h2 className="text-2xl font-semibold mb-4">Prerequisites</h2>
                <ul className="list-disc list-inside mb-6">
                    <li>A machine with a stable public internet connection.</li>
                    <li>Basic command-line knowledge.</li>
                    <li>ioquake3 dedicated server binaries (ioq3ded).</li>
                    <li>A <strong>baseq3</strong> folder with demo files or approved community content.</li>
                </ul>

                <h2 className="text-2xl font-semibold mb-4">1. Prepare the Server Files</h2>
                <p className="mb-6">
                    Download or build the ioquake3 dedicated server. The executable is usually{" "}
                    <code>ioq3ded</code>.
                </p>

                <h2 className="text-2xl font-semibold mb-4">2. Create <code>autoexec.cfg</code></h2>
                <p className="mb-3">
                    Place this file inside <code>baseq3/autoexec.cfg</code> and configure your server name, maps,
                    gametype, and bots.
                </p>

                <h2 className="text-2xl font-semibold mb-4">3. Run the Dedicated Server</h2>
                <p className="mb-3">Recommended startup command for Q3JS:</p>

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
                    The master server line is required for your server to appear on the Q3JS server list:
                </p>

                <pre className="bg-black text-white p-4 rounded text-sm mb-6 overflow-x-auto">
{`+set sv_master3 "master.q3js.com:27951"`}
                </pre>

                <h2 className="text-2xl font-semibold mb-4">4. Open Required Ports</h2>
                <ul className="list-disc list-inside mb-6">
                    <li><strong>UDP 27960</strong> – Main gameplay port.</li>
                    <li><strong>Outbound UDP 27951</strong> – Heartbeats to the Q3JS master server.</li>
                </ul>

                <h2 className="text-2xl font-semibold mb-4">5. Verify Your Server</h2>
                <p className="mb-6">
                    After a few seconds, your server should appear on the{" "}
                    <span className="font-semibold">Q3JS home page</span>.
                    If it does not, check the following:
                </p>

                <ul className="list-disc list-inside space-y-2 mb-6">
                    <li>Your master server line is correct.</li>
                    <li>Your firewall allows UDP 27960.</li>
                    <li>Your server can send outbound UDP traffic to 27951.</li>
                    <li>Your <code>baseq3</code> directory contains
                        only <strong>demo</strong> or <strong>community</strong> files.
                    </li>
                </ul>

                <h2 className="text-2xl font-semibold mb-4">You're Ready</h2>
                <p className="mb-6">
                    Your server is now compatible with Q3JS and visible globally to all players connecting through their
                    browser.
                </p>
            </div>
        </div>
    );
}
