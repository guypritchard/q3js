type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

export function JsonLd(props: {data: JsonLdValue}) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: JSON.stringify(props.data)}}
        />
    );
}
