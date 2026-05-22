"use client";

import dynamic from "next/dynamic";

const BottleHero = dynamic(() => import("@/components/BottleHero"), {
  ssr: false,
});

export default function Home() {
  return <BottleHero />;
}
