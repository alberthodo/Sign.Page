"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingPlan } from "@/types/database";

const ORBIT_INNER_RADIUS = 72;
const ORBIT_RING_GAP = 64;
const ORBIT_RADII = [0, 1, 2, 3].map(
  (i) => ORBIT_INNER_RADIUS + i * ORBIT_RING_GAP,
) as [number, number, number, number];
const ORBIT_OUTER = ORBIT_RADII[ORBIT_RADII.length - 1];
/** Fixed scale anchor — must not depend on gap or spacing tweaks cancel out. */
const ORBIT_SCALE_RADIUS = 200;
const SCENE_FILL = 0.62;
const PARTICLES_PER_RING = 44;
const TOTAL_PARTICLES = PARTICLES_PER_RING * ORBIT_RADII.length;
const RING_OPACITY = [0.22, 0.26, 0.3, 0.34] as const;
const PRO_TEAM_RING_INDEX = 1;
/** Equally spaced (120°) on the second orbit, one anchored at top (−90°). */
const PRO_TEAM_ICON_ANGLES_DEG = [-90, 30, 150] as const;
/** Nudge pro teammates slightly upward on the orbit. */
const PRO_TEAM_ICON_OFFSET_Y = -6;
const PERSON_ICON_FADE_MS = 900;
const PERSON_ICON_CLASS = "size-9 shrink-0 text-foreground/70";

type OrbitLayout = {
  cx: number;
  cy: number;
  ringRadiiPx: number[];
};

function orbitPoint(
  layout: OrbitLayout,
  ringIndex: number,
  angleDeg: number,
): { left: number; top: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const radius = layout.ringRadiiPx[ringIndex] ?? 0;
  return {
    left: layout.cx + Math.cos(rad) * radius,
    top: layout.cy + Math.sin(rad) * radius,
  };
}

type Particle = {
  ringIndex: number;
  ringAngle: number;
  scatterRadius: number;
  scatterAngle: number;
  driftPhase: number;
  size: number;
};

type SceneSize = {
  width: number;
  height: number;
  scale: number;
  cx: number;
  cy: number;
};

function orbitSceneStyle(): CSSProperties {
  return {
    ["--orbit-fit" as string]: `min(${ORBIT_OUTER}px, calc(min(62cqw, 62cqh)))`,
    ["--orbit-scale" as string]: `calc(var(--orbit-fit) / ${ORBIT_SCALE_RADIUS}px)`,
  };
}

function OrbitPersonIcon() {
  return <User className={PERSON_ICON_CLASS} strokeWidth={1.5} aria-hidden />;
}

function PlacedPersonIcon({
  left,
  top,
  visible,
}: {
  left: number;
  top: number;
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute flex size-9 items-center justify-center transition-opacity ease-in-out motion-reduce:transition-none",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        transitionDuration: `${PERSON_ICON_FADE_MS}ms`,
      }}
      aria-hidden={!visible}
    >
      <OrbitPersonIcon />
    </div>
  );
}

function createParticles(): Particle[] {
  const particles: Particle[] = [];

  for (let ringIndex = 0; ringIndex < ORBIT_RADII.length; ringIndex++) {
    for (let i = 0; i < PARTICLES_PER_RING; i++) {
      particles.push({
        ringIndex,
        ringAngle: (i / PARTICLES_PER_RING) * Math.PI * 2,
        scatterRadius: 0.15 + Math.random() * 0.95,
        scatterAngle: Math.random() * Math.PI * 2,
        driftPhase: Math.random() * Math.PI * 2,
        size: 1.1 + Math.random() * 1.2,
      });
    }
  }

  return particles;
}

function getSceneSize(container: HTMLElement): SceneSize {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const fit = Math.min(width * SCENE_FILL, height * SCENE_FILL);
  const scale = fit / (ORBIT_SCALE_RADIUS * 2);
  return {
    width,
    height,
    scale,
    cx: width / 2,
    cy: height / 2,
  };
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function OnboardingPlanOrbitPreview({
  selectedPlan,
}: {
  selectedPlan: OnboardingPlan | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(createParticles());
  const formationRef = useRef(0);
  const sceneRef = useRef<SceneSize>({
    width: 0,
    height: 0,
    scale: 1,
    cx: 0,
    cy: 0,
  });
  const formedTargetRef = useRef(0);
  const [layout, setLayout] = useState<OrbitLayout | null>(null);
  const showCenterPerson =
    selectedPlan === "personal" || selectedPlan === "pro";
  const showProTeamOnOrbit = selectedPlan === "pro";

  useEffect(() => {
    formedTargetRef.current = selectedPlan !== null ? 1 : 0;
  }, [selectedPlan]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function resize() {
      const scene = getSceneSize(container!);
      sceneRef.current = scene;
      setLayout({
        cx: scene.cx,
        cy: scene.cy,
        ringRadiiPx: ORBIT_RADII.map((radius) => radius * scene.scale),
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(scene.width * dpr);
      canvas!.height = Math.floor(scene.height * dpr);
      canvas!.style.width = `${scene.width}px`;
      canvas!.style.height = `${scene.height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frameId = 0;
    let lastTime = performance.now();

    function draw(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const target = formedTargetRef.current;
      if (reducedMotion) {
        formationRef.current = target;
      } else {
        const speed = target > formationRef.current ? 1.8 : 1.2;
        formationRef.current += (target - formationRef.current) * speed * dt;
        if (Math.abs(target - formationRef.current) < 0.001) {
          formationRef.current = target;
        }
      }

      const formation = easeOutCubic(formationRef.current);
      const { width, height, scale, cx, cy } = sceneRef.current;
      const fillColor =
        getComputedStyle(container!).color || "rgba(0, 0, 0, 0.35)";

      ctx!.clearRect(0, 0, width, height);

      for (const particle of particlesRef.current) {
        const wobble =
          Math.sin(time * 0.001 + particle.driftPhase) * 0.04 +
          Math.cos(time * 0.00085 + particle.driftPhase * 1.3) * 0.03;

        const scatterR = particle.scatterRadius * ORBIT_OUTER * scale * 1.05;
        const scatterA = particle.scatterAngle + wobble;
        const sx = cx + Math.cos(scatterA) * scatterR;
        const sy = cy + Math.sin(scatterA) * scatterR;

        const ringR = ORBIT_RADII[particle.ringIndex] * scale;
        const spin = formation > 0.85 ? time * 0.00012 * (particle.ringIndex + 1) : 0;
        const ringA = particle.ringAngle + spin;
        const tx = cx + Math.cos(ringA) * ringR;
        const ty = cy + Math.sin(ringA) * ringR;

        const x = sx + (tx - sx) * formation;
        const y = sy + (ty - sy) * formation;

        const scatterOpacity = 0.12 + particle.scatterRadius * 0.14;
        const ringOpacity = RING_OPACITY[particle.ringIndex];
        const opacity =
          scatterOpacity + (ringOpacity - scatterOpacity) * formation;

        ctx!.beginPath();
        ctx!.arc(x, y, particle.size * (0.85 + formation * 0.15), 0, Math.PI * 2);
        ctx!.fillStyle = fillColor;
        ctx!.globalAlpha = opacity;
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      frameId = requestAnimationFrame(draw);
    }

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto size-full min-h-[min(280px,100%)] w-full text-foreground @container"
      style={orbitSceneStyle()}
      role="img"
      aria-label={
        selectedPlan === "personal"
          ? "Personal plan"
          : selectedPlan === "pro"
            ? "Pro / Team plan"
            : "Plan selection"
      }
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden
      />

      {layout ? (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          aria-hidden={!showCenterPerson && !showProTeamOnOrbit}
        >
          {PRO_TEAM_ICON_ANGLES_DEG.map((deg) => {
            const point = orbitPoint(layout, PRO_TEAM_RING_INDEX, deg);
            return (
              <PlacedPersonIcon
                key={deg}
                left={point.left}
                top={point.top + PRO_TEAM_ICON_OFFSET_Y}
                visible={showProTeamOnOrbit}
              />
            );
          })}

          <PlacedPersonIcon
            left={layout.cx}
            top={layout.cy}
            visible={showCenterPerson}
          />
        </div>
      ) : null}
    </div>
  );
}
