import {BiMicrophone} from "react-icons/bi";

export default function PodcastHeader() {
    return (
        <div className="stories-header">
            <h1 className="page-title">
                <BiMicrophone size={36} color={"#6d2929"} style={{marginRight: 6}}/>
                The Fourth Estate Podcast
            </h1>
            <p className="title">The Fourth Estate Podcast takes you beyond the headlines of Ghana’s most impactful investigative journalism.</p>
        </div>
    );
}