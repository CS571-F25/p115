import { Link, useNavigate, useParams } from "react-router-dom";


export default function Stock (props) {

    const { ticker } = useParams();

    return <div>
        <h1>{ticker}</h1>
    </div>
}