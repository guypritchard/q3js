import ServerSkeleton from "@/components/server-skeleton.tsx";

export default function ServerPickerSkeleton() {
    return (
        <section className="container mx-auto px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <h2 className="text-3xl font-bold">Select a Server</h2>

                <div className="grid gap-4">
                    {[...Array(1)].map((_, i) => (
                        <ServerSkeleton key={i}/>
                    ))}
                </div>
            </div>
        </section>
    )
}