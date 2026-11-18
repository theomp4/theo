"use client";
import { useState } from "react";
import { shopifyImg } from "@/lib/format";

export default function Gallery({ images, title }: { images: { src: string }[]; title: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="pdp-media">
      <img src={shopifyImg(images[i]?.src, 1200)} alt={title} />
      <div className="thumbs">{images.map((im, k) => <button key={im.src} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}><img src={shopifyImg(im.src, 200)} alt="" /></button>)}</div>
    </div>
  );
}
