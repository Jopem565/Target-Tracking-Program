import { useRouter } from "next/router";

function DynamicPage() {
    const router = useRouter();
    return (
        <div>
            This is Dynamic Page, accessed from
            the route <b>{router.asPath}</b>{" "}
        </div>
    );
}

export default DynamicPage;