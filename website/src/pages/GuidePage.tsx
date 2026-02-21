export default function GuidePage() {
    return (
        <main className="container mx-auto ">
            <div className="py-20 prose prose-invert min-w-full">

                <h1>Run Your Own Q3JS Server</h1>

                <p>
                    You can host your own Quake III Arena server for Q3JS using the official Docker image.
                    The dedicated server behaves the same as the original <code>ioq3ded</code> executable,
                    but wrapped in a convenient, ready-to-run container.
                </p>

                <h2>1. Prepare Your Directory</h2>
                <p>
                    Create or enter a directory that contains a <code>baseq3</code> folder.
                    The server must have access to this folder because that’s where all game data,
                    configs, and map files live.
                </p>


                <pre className=" whitespace-pre">
{`mkdir my-q3-server
cd my-q3-server
# make sure this exists:
ls baseq3/`}
            </pre>

                <h2>2. Run the Server</h2>
                <p>Launch your server with Docker:</p>

                <pre className=" whitespace-pre">
{`docker run \\
  -p 27961:27961 \\
  -p 27960:27960/udp \\
  -v $(pwd)/baseq3:/server/baseq3 \\
  lukaklacar/q3js-server \\
  +map q3dm17`}
            </pre>

                <p>
                    If you plan to run your own dedicated server and make it visible to players outside your local
                    network,
                    ensure that the required ports are forwarded on your router. Quake III Arena servers typically use
                    UDP <span className=" font-semibold">27960</span> for game traffic and your WebSocket-UDP proxy
                    listens on
                    port <span className=" font-semibold">27961</span>. Both must be open and forwarded to the machine
                    running
                    your server for others to see and connect to it.
                </p>


                <h2>3. How This Command Works</h2>
                <ul>
                    <li>
                        <strong>Ports:</strong>
                        <code>27960/udp</code> is the Quake game port.
                        <code>27961</code> is the WebSocket-UDP proxy port used by Q3JS.
                    </li>

                    <li>
                        <strong>Volume mount:</strong>
                        <code>-v $(pwd)/baseq3:/server/baseq3</code>
                        makes your local <code>baseq3</code> directory available inside the container.
                    </li>

                    <li>
                        <strong>Dedicated server behavior:</strong>
                        After startup, the process behaves exactly like the classic
                        <code>ioq3ded</code> server.
                        Any <code>+set</code> or <code>+map</code> parameters work the same way.
                    </li>

                    <li>
                        <strong>Map loading:</strong>
                        The example starts on <code>q3dm17</code>, but you can choose any available map.
                    </li>
                </ul>

                <h2>4. Confirming the Server Runs</h2>
                <p>
                    Once the container starts, your server will appear on the Q3JS home page
                    as long as it is configured with the correct master server settings
                    (included automatically in this Docker image).
                </p>

                <h2>5. File Requirements</h2>
                <p>
                    Only official Quake III <em>demo</em> files or community-created assets are allowed.
                    Retail files are not included and cannot be distributed.
                </p>
            </div>

        </main>
    );
}
