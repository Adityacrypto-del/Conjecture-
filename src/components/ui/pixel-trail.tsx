import React, { useCallback, useMemo, useRef, useEffect } from "react"
import { motion, useAnimationControls } from "framer-motion"
import { v4 as uuidv4 } from "uuid"

import { cn } from "@/lib/utils"
import { useDimensions } from "@/components/hooks/use-debounced-dimensions"

interface PixelTrailProps {
  pixelSize: number // px
  fadeDuration?: number // ms
  delay?: number // ms
  className?: string
  pixelClassName?: string
}

const PixelTrail: React.FC<PixelTrailProps> = ({
  pixelSize = 20,
  fadeDuration = 500,
  delay = 0,
  className,
  pixelClassName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(containerRef)
  const trailId = useRef(uuidv4())

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      // Calculate coordinates relative to container top-left
      const relX = e.clientX - rect.left
      const relY = e.clientY - rect.top

      // Check if mouse is within container boundaries
      if (relX >= 0 && relX < rect.width && relY >= 0 && relY < rect.height) {
        const x = Math.floor(relX / pixelSize)
        const y = Math.floor(relY / pixelSize)

        const pixelElement = document.getElementById(
          `${trailId.current}-pixel-${x}-${y}`
        )
        if (pixelElement) {
          const animatePixel = (pixelElement as any).__animatePixel
          if (animatePixel) animatePixel()
        }
      }
    }

    window.addEventListener("mousemove", handleGlobalMouseMove)
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove)
  }, [pixelSize])

  const columns = useMemo(
    () => Math.ceil(dimensions.width / pixelSize),
    [dimensions.width, pixelSize]
  )
  const rows = useMemo(
    () => Math.ceil(dimensions.height / pixelSize),
    [dimensions.height, pixelSize]
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none",
        className
      )}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <PixelDot
              key={`${colIndex}-${rowIndex}`}
              id={`${trailId.current}-pixel-${colIndex}-${rowIndex}`}
              size={pixelSize}
              fadeDuration={fadeDuration}
              delay={delay}
              className={pixelClassName}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface PixelDotProps {
  id: string
  size: number
  fadeDuration: number
  delay: number
  className?: string
}

const PixelDot: React.FC<PixelDotProps> = React.memo(
  ({ id, size, fadeDuration, delay, className }) => {
    const controls = useAnimationControls()

    const animatePixel = useCallback(() => {
      // If duration is 0, fall back to standard 1-second fade
      const activeFade = fadeDuration > 0 ? fadeDuration : 1000
      const activeDelay = delay > 0 ? delay : 0
      const totalTime = activeFade + activeDelay

      controls.start({
        opacity: [1, 1, 0],
        transition: { 
          duration: totalTime / 1000, 
          times: [0, activeDelay / totalTime, 1],
          ease: "easeOut"
        },
      })
    }, [controls, fadeDuration, delay])

    // Attach the animatePixel function to the DOM element
    const ref = useCallback(
      (node: HTMLDivElement | null) => {
        if (node) {
          ;(node as any).__animatePixel = animatePixel
        }
      },
      [animatePixel]
    )

    return (
      <motion.div
        id={id}
        ref={ref}
        className={cn("pointer-events-none", className)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        initial={{ opacity: 0 }}
        animate={controls}
        exit={{ opacity: 0 }}
      />
    )
  }
)

PixelDot.displayName = "PixelDot"
export { PixelTrail }
