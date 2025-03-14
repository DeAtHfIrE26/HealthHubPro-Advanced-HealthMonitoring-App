import * as React from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const CarouselContext = React.createContext<{
  api: any
  currentSlide: number
  slidesCount: number
}>({
  api: null,
  currentSlide: 0,
  slidesCount: 0,
})

export function Carousel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [api, setApi] = React.useState<any>(null)
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [slidesCount, setSlidesCount] = React.useState(0)

  // Count slides
  React.useEffect(() => {
    if (!api) return
    setSlidesCount(api.slideNodes().length)
    
    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap())
    }
    
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  return (
    <CarouselContext.Provider value={{ api, currentSlide, slidesCount }}>
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

export function CarouselContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex overflow-hidden -mx-4 px-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CarouselItem({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex-shrink-0 flex-grow-0 basis-full md:basis-1/2 lg:basis-1/3 px-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CarouselPrevious({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { api, currentSlide } = React.useContext(CarouselContext)
  
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-md",
        currentSlide === 0 && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => api?.scrollPrev()}
      disabled={currentSlide === 0}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

export function CarouselNext({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { api, currentSlide, slidesCount } = React.useContext(CarouselContext)
  
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-md",
        currentSlide === slidesCount - 1 && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => api?.scrollNext()}
      disabled={currentSlide === slidesCount - 1}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export function CarouselDots({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { api, currentSlide, slidesCount } = React.useContext(CarouselContext)
  
  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1",
        className
      )}
      {...props}
    >
      {Array.from({ length: slidesCount }).map((_, index) => (
        <button
          key={index}
          className={cn(
            "h-2 w-2 rounded-full transition-all",
            currentSlide === index
              ? "bg-primary w-4"
              : "bg-primary/50"
          )}
          onClick={() => api?.scrollTo(index)}
        >
          <span className="sr-only">Go to slide {index + 1}</span>
        </button>
      ))}
    </div>
  )
}
