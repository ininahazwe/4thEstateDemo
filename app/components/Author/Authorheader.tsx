interface AuthorHeaderProps {
    name: string;
}

export default function AuthorHeader({ name }: AuthorHeaderProps) {
    return (
        <div className="section-header" data-column="full">
            <h1 className="page-title">{name}</h1>
        </div>
    );
}