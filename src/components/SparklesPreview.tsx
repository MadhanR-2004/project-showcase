"use client";
import React from "react";
import { SparklesCore } from "../components/ui/sparkles";
import Link from "next/link";
import {TextGenerateEffect} from "../components/ui/text-generate-effect";
export function SparklesPreview() {
  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden relative">
      <Link
        href="/admin"
        className="absolute top-4 right-4 inline-flex items-center rounded-full bg-white/90 text-black px-4 py-2 text-xs font-semibold hover:bg-white transition-colors"
      >
        Admin
      </Link>
      <div>
      <h1 className="md:text-5xl text-3xl lg:text-5xl font-bold text-center text-white relative z-20">
        Department of Information Technology
      </h1>
      <div className="flex justify-center w-full">
        <TextGenerateEffect words="Innovate. Create. Inspire." wordColor="#fff" wordSize={"2xl"} />
      </div>
      </div>
      <div className="w-full max-w-4xl h-40 relative mt-4">
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(440px_220px_at_top,transparent_20%,white)]"></div>
      </div>
      <Link
        href="/projects"
        className="mt-10 inline-flex items-center rounded-full bg-white text-black px-6 py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors"
      >
        Start
      </Link>
    </div>
  );
}

export default SparklesPreview;



