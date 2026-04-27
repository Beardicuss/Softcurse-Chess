import { getBestMove } from "./aiEngine.js";

self.onmessage = ({ data: { gs, depth } }) => {
  const move = getBestMove(gs, depth);
  self.postMessage(move);
};
