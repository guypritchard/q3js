import {Card, CardContent} from "@/components/ui/card.tsx";


export default function ServerSkeleton() {
    return <Card
        className="bg-card/50 border-border/50 hover:border-primary/50 transition-all animate-pulse">
        <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                    <div className="h-6 bg-secondary/50 rounded w-1/2 mb-4"/>
                    <div className="h-4 bg-secondary/50 rounded w-1/4 mb-2"/>
                    <div className="h-4 bg-secondary/50 rounded w-1/3 mb-2"/>
                    <div className="h-4 bg-secondary/50 rounded w-1/5 mb-2"/>
                </div>
            </div>
        </CardContent>
    </Card>
}