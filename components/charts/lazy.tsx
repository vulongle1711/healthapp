"use client";

import dynamic from "next/dynamic";

const Skeleton = ({ h = 180 }: { h?: number }) => <div className="skeleton w-full rounded-2xl" style={{ height: h }} aria-hidden />;

export const LineTrend = dynamic(() => import("./charts").then((m) => m.LineTrend), { ssr: false, loading: () => <Skeleton h={200} /> });
export const BarsTarget = dynamic(() => import("./charts").then((m) => m.BarsTarget), { ssr: false, loading: () => <Skeleton /> });
