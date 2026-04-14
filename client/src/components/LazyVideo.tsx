/**
 * LazyVideo — Performance lazy loading for video elements (Production Audit Item 9)
 *
 * Uses IntersectionObserver to defer video loading until the element
 * enters the viewport. This prevents blocking render and reduces initial
 * bandwidth consumption.
 */
import { useEffect, useRef, useState } from "react";

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  /** Distance from viewport to start loading (default: "200px") */
  rootMargin?: string;
}

export default function LazyVideo({ src, rootMargin = "200px", ...props }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <video
      ref={ref}
      src={inView ? src : undefined}
      {...props}
    />
  );
}
