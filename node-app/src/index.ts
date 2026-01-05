import {PolymarketConnection} from "./PolymarketConnection";
import {run} from "./Connection";
let poly = new PolymarketConnection();
run(poly).catch(e => console.error(e));
