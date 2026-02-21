export function Footer() {
    return <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
            <div
                className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p className="font-mono">Built with ❤️ by <span className="text-red-500">L</span><span
                    className="text-green-500">K</span></p>
            </div>
        </div>
    </footer>;
}