import { atom, useAtom } from "jotai";
import { useState } from "react";

// Lighting control atoms
export const ambientIntensityAtom = atom(0.5);
export const directionalIntensityAtom = atom(2.5);
export const directionalPositionAtom = atom([2, 5, 2]);
export const directionalColorAtom = atom("#ffffff");
export const ambientColorAtom = atom("#ffffff");

// Book position and rotation atoms
export const bookPositionAtom = atom([0, 0, 0]);
export const bookRotationAtom = atom([0, 0, 0]);

const pictures = [
  "DSC00680",
  "DSC00933",
  "DSC00966",
  "DSC00983",
  "DSC01011",
  "DSC01040",
  "DSC01064",
  "DSC01071",
  "DSC01103",
  "DSC01145",
  "DSC01420",
  "DSC01461",
  "DSC01489",
  "DSC02031",
  "DSC02064",
  "DSC02069",
];

export const pageAtom = atom(0);
export const bookClosedAtom = atom(false);
export const cameraPositionAtom = atom(null); // null = free look mode (default)
export const showFloorTextureAtom = atom(true); // Toggle between texture and grid
export const pages = [
  {
    front: "book-cover",
    back: pictures[0],
  },
];
for (let i = 1; i < pictures.length - 1; i += 2) {
  pages.push({
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  });
}

pages.push({
  front: pictures[pictures.length - 1],
  back: "book-back",
});

export const UI = () => {
  return null;
};