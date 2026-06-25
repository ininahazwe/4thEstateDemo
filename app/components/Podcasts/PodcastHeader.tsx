import {BiMicrophone} from "react-icons/bi";

export default function PodcastHeader() {
    return (
        <div className="stories-header">
            <h1 className="page-title">
                <BiMicrophone size={36} color={"#6d2929"} style={{marginRight: 6}}/>
                The Fourth Estate Podcast
            </h1>
        </div>
    );
}